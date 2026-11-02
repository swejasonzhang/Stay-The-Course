package com.staythecourse.engine;

import java.util.List;

public record PortfolioReport(
        double totalValue,
        double weightedExpenseRatio,     // the portfolio's average fee, weighted by dollars
        double annualFees,               // that fee in dollars per year
        List<AllocationLine> allocations,
        double largestDrift,
        boolean fullRebalanceNeeded,     // true when new money alone can't bring drift within the threshold
        List<Trade> trades,
        List<AllocationLine> allocationsAfter,
        List<String> warnings) {
}
