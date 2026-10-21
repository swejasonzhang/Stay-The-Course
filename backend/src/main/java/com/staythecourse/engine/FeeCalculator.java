package com.staythecourse.engine;

import java.util.ArrayList;
import java.util.List;

// Fee math. Pure: no web, files, database or Spring, so tests can call it directly
// and the Monte Carlo simulator can reuse it.
public final class FeeCalculator {

    // Utility class: it holds no data, so nothing should create an instance.
    private FeeCalculator() {
    }

    /**
     * Returns the balance at the start and end of each year (years + 1 entries).
     * Rates are decimals (0.07 = 7%); the fee is subtracted from the return each year.
     */
    public static List<Double> projectBalances(
            double initial, double annualReturn, double expenseRatio, int years) {
        // Guards for direct callers like tests; FeeRequest already blocks these for HTTP requests.
        if (years < 0) {
            throw new IllegalArgumentException("years must be 0 or more");
        }
        if (initial < 0) {
            throw new IllegalArgumentException("initial must be 0 or more");
        }
        if (expenseRatio < 0) {
            throw new IllegalArgumentException("expenseRatio must be 0 or more");
        }

        double growth = 1 + annualReturn - expenseRatio;
        List<Double> balances = new ArrayList<>();
        balances.add(initial);
        for (int year = 1; year <= years; year++) {
            balances.add(balances.getLast() * growth); // compounding: grow last year's balance
        }
        return balances;
    }

    /** Projects the investment under both fees; feeCost is how much less the fund ends with. */
    public static FeeComparison compareFees(
            double initial, double annualReturn, double fundFee, double baselineFee, int years) {
        List<Double> fundBalances = projectBalances(initial, annualReturn, fundFee, years);
        List<Double> baselineBalances = projectBalances(initial, annualReturn, baselineFee, years);
        return new FeeComparison(
                fundBalances,
                baselineBalances,
                baselineBalances.getLast() - fundBalances.getLast());
    }
}
