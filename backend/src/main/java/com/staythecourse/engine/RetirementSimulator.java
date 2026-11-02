package com.staythecourse.engine;

import java.util.ArrayList;
import java.util.List;
import java.util.random.RandomGenerator;

// Monte Carlo retirement simulation. Each simulated year replays a randomly chosen real year
// from history (a "bootstrap"), so stock and bond returns keep their real-world relationship.
// Returns are inflation-adjusted, so every dollar amount is in today's dollars.
public final class RetirementSimulator {

    private static final double[] BANDS = {0.10, 0.25, 0.50, 0.75, 0.90};

    private RetirementSimulator() {
    }

    public static SimulationResult simulate(
            SimulationInputs inputs, List<MarketYear> history, RandomGenerator random) {
        validate(inputs, history);
        int sims = inputs.simulations();
        int saving = inputs.yearsToRetirement();
        int retired = inputs.yearsInRetirement();
        int totalYears = saving + retired;

        // Stored [year][path], so each year's values across every path sit together for percentiles.
        double[][] constantBalances = new double[totalYears + 1][sims];
        double[][] dynamicBalances = new double[totalYears + 1][sims];
        double[][] constantSpending = new double[retired][sims];
        double[][] dynamicSpending = new double[retired][sims];
        double[] retirementBalances = new double[sims];
        int constantSuccesses = 0;
        int dynamicSuccesses = 0;
        double[] yearlyGrowth = growthByHistoricalYear(inputs, history);

        for (int path = 0; path < sims; path++) {
            double[] growth = drawGrowth(yearlyGrowth, random, totalYears);

            double balance = inputs.currentBalance();
            constantBalances[0][path] = balance;
            dynamicBalances[0][path] = balance;
            for (int year = 1; year <= saving; year++) {
                balance = balance * growth[year - 1] + inputs.annualContribution();
                constantBalances[year][path] = balance;
                dynamicBalances[year][path] = balance;
            }
            retirementBalances[path] = balance;

            // Same market path for both rules, so any difference comes from the rule alone.
            if (retire(balance, growth, inputs, false, constantBalances, constantSpending, path)) {
                constantSuccesses++;
            }
            if (retire(balance, growth, inputs, true, dynamicBalances, dynamicSpending, path)) {
                dynamicSuccesses++;
            }
        }

        double medianAtRetirement = Percentiles.of(retirementBalances, 0.5);
        return new SimulationResult(
                saving,
                medianAtRetirement,
                medianAtRetirement * inputs.withdrawalRate(),
                summarize(constantSuccesses, sims, constantBalances, constantSpending),
                summarize(dynamicSuccesses, sims, dynamicBalances, dynamicSpending));
    }

    // The growth multiplier each historical year would give this portfolio, e.g. 1.06 for a 7% real
    // return with a 1% fee. Worked out once per simulation instead of once per simulated year.
    private static double[] growthByHistoricalYear(SimulationInputs inputs, List<MarketYear> history) {
        double stocks = inputs.stockAllocation();
        double[] growth = new double[history.size()];
        for (int i = 0; i < history.size(); i++) {
            MarketYear year = history.get(i);
            double portfolioReturn = stocks * year.realStockReturn() + (1 - stocks) * year.realBondReturn();
            growth[i] = 1 + portfolioReturn - inputs.expenseRatio();
        }
        return growth;
    }

    // One simulated market path: each year is a randomly chosen historical year.
    private static double[] drawGrowth(double[] yearlyGrowth, RandomGenerator random, int years) {
        double[] growth = new double[years];
        for (int i = 0; i < years; i++) {
            growth[i] = yearlyGrowth[random.nextInt(yearlyGrowth.length)];
        }
        return growth;
    }

    // Spending is withdrawn at the start of each retirement year, then the rest grows.
    // Returns true if every year's planned spending was fully paid.
    private static boolean retire(
            double startBalance, double[] growth, SimulationInputs inputs, boolean dynamic,
            double[][] balances, double[][] spending, int path) {
        int saving = inputs.yearsToRetirement();
        double balance = startBalance;
        double planned = inputs.withdrawalRate() * startBalance;
        boolean fullyPaid = true;
        for (int year = 0; year < inputs.yearsInRetirement(); year++) {
            if (dynamic && year > 0) {
                planned = DynamicSpending.nextSpending(planned, balance, inputs.withdrawalRate());
            }
            double withdrawal = Math.min(planned, balance);
            if (withdrawal < planned) {
                fullyPaid = false;
            }
            balance = (balance - withdrawal) * growth[saving + year];
            spending[year][path] = withdrawal;
            balances[saving + year + 1][path] = balance;
        }
        return fullyPaid;
    }

    private static SpendingRuleResult summarize(
            int successes, int sims, double[][] balances, double[][] spending) {
        return new SpendingRuleResult(
                (double) successes / sims,
                bands(balances),
                bands(spending),
                Percentiles.of(balances[balances.length - 1], 0.5));
    }

    private static PercentileBands bands(double[][] valuesByYear) {
        List<List<Double>> columns = new ArrayList<>();
        for (int b = 0; b < BANDS.length; b++) {
            columns.add(new ArrayList<>(valuesByYear.length));
        }
        for (double[] year : valuesByYear) {
            double[] values = Percentiles.of(year, BANDS);
            for (int b = 0; b < BANDS.length; b++) {
                columns.get(b).add(values[b]);
            }
        }
        return new PercentileBands(
                List.copyOf(columns.get(0)), List.copyOf(columns.get(1)), List.copyOf(columns.get(2)),
                List.copyOf(columns.get(3)), List.copyOf(columns.get(4)));
    }

    // Guards for direct callers; the API checks these first for HTTP requests.
    private static void validate(SimulationInputs inputs, List<MarketYear> history) {
        if (history.isEmpty()) {
            throw new IllegalArgumentException("history must not be empty");
        }
        if (inputs.simulations() < 1) {
            throw new IllegalArgumentException("simulations must be at least 1");
        }
        if (inputs.yearsToRetirement() < 0 || inputs.yearsInRetirement() < 1) {
            throw new IllegalArgumentException("years to retirement must be 0 or more and years in retirement at least 1");
        }
        if (inputs.currentBalance() < 0 || inputs.annualContribution() < 0 || inputs.expenseRatio() < 0) {
            throw new IllegalArgumentException("balance, contribution and expense ratio must be 0 or more");
        }
        if (inputs.withdrawalRate() <= 0) {
            throw new IllegalArgumentException("withdrawal rate must be more than 0");
        }
        if (inputs.stockAllocation() < 0 || inputs.stockAllocation() > 1) {
            throw new IllegalArgumentException("stock allocation must be between 0 and 1");
        }
    }
}
