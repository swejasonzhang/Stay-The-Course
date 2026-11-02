package com.staythecourse.engine;

// How one spending rule did across every simulated path.
public record SpendingRuleResult(
        double successRate,          // share of paths where every year's spending was fully paid
        PercentileBands balances,    // index = years from today
        PercentileBands spending,    // index = year of retirement (0 = first year)
        double medianEndingBalance) {
}
