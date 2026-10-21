package com.staythecourse.api;

import java.util.List;

// The JSON returned by POST /fees. Separate from the engine's FeeComparison so the
// engine can change without breaking the frontend.
public record FeeResponse(
        List<Double> fundBalances,       // index 0 = today, index n = after n years
        List<Double> baselineBalances,
        double feeCost) {
}
