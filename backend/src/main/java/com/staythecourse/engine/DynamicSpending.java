package com.staythecourse.engine;

// Vanguard's dynamic spending rule: aim for a fixed percentage of the current balance,
// but never change spending by more than a ceiling (+5%) or floor (-2.5%) from last year.
public final class DynamicSpending {

    public static final double CEILING = 0.05;
    public static final double FLOOR = 0.025;

    private DynamicSpending() {
    }

    public static double nextSpending(double previousSpending, double balance, double withdrawalRate) {
        double target = withdrawalRate * balance;
        double highest = previousSpending * (1 + CEILING);
        double lowest = previousSpending * (1 - FLOOR);
        return Math.min(highest, Math.max(lowest, target));
    }
}
