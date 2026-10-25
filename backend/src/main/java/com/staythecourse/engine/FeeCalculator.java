package com.staythecourse.engine;

import java.util.ArrayList;
import java.util.List;

public final class FeeCalculator {

    private FeeCalculator() {
    }

    public static List<Double> projectBalances(
            double initial, double annualReturn, double expenseRatio, int years) {
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
            balances.add(balances.getLast() * growth);
        }
        return balances;
    }

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
