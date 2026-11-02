package com.staythecourse.engine;

import java.util.List;

// For each year: the 10th, 25th, 50th (median), 75th and 90th percentile across all simulated paths.
public record PercentileBands(
        List<Double> p10,
        List<Double> p25,
        List<Double> p50,
        List<Double> p75,
        List<Double> p90) {
}
