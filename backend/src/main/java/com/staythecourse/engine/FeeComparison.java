package com.staythecourse.engine;

import java.util.List;

public record FeeComparison(
        List<Double> fundBalances,
        List<Double> baselineBalances,
        double feeCost) {
}
