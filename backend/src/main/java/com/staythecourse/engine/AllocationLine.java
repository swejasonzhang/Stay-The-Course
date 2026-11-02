package com.staythecourse.engine;

// One asset class's share of the portfolio. Drift = current weight - target weight (0.05 = 5 points over).
public record AllocationLine(
        AssetClass assetClass,
        double value,
        double currentWeight,
        double targetWeight,
        double drift) {
}
