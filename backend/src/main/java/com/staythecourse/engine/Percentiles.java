package com.staythecourse.engine;

import java.util.Arrays;

// Percentiles answer "what value are X% of outcomes below?" The 50th percentile is the median.
public final class Percentiles {

    private Percentiles() {
    }

    public static double of(double[] values, double percentile) {
        return of(values, new double[] {percentile})[0];
    }

    // Sorts a copy once, then interpolates between the two nearest values for each percentile
    // (the same method as Excel's PERCENTILE.INC).
    public static double[] of(double[] values, double[] percentiles) {
        if (values.length == 0) {
            throw new IllegalArgumentException("values must not be empty");
        }
        double[] sorted = values.clone();
        Arrays.sort(sorted);
        double[] results = new double[percentiles.length];
        for (int i = 0; i < percentiles.length; i++) {
            double percentile = percentiles[i];
            if (percentile < 0 || percentile > 1) {
                throw new IllegalArgumentException("percentile must be between 0 and 1");
            }
            double position = percentile * (sorted.length - 1);
            int below = (int) Math.floor(position);
            int above = (int) Math.ceil(position);
            double fraction = position - below;
            results[i] = sorted[below] + (sorted[above] - sorted[below]) * fraction;
        }
        return results;
    }
}
