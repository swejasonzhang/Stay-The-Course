package com.staythecourse.engine;

import java.util.List;

// The engine's result for one fee comparison; FeeController copies it into a FeeResponse.
public record FeeComparison(
        List<Double> fundBalances,
        List<Double> baselineBalances,
        double feeCost) {
}
