package com.staythecourse.engine;

// One fund or account position. Value is in dollars; the expense ratio is a decimal (0.0004 = 0.04%).
public record Holding(String name, AssetClass assetClass, double value, double expenseRatio) {
}
