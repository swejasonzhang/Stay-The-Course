package com.staythecourse.engine;

// Both spending rules, run on the same simulated markets so the comparison is fair.
public record SimulationResult(
        int retirementYear,
        double medianBalanceAtRetirement,
        double medianFirstYearSpending,
        SpendingRuleResult constantSpending,
        SpendingRuleResult dynamicSpending) {
}
