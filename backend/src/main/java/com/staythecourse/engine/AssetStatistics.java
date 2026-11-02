package com.staythecourse.engine;

// Summary of one asset's yearly real returns.
public record AssetStatistics(
        double averageReturn,     // simple average of the yearly returns
        double compoundReturn,    // what you actually earned per year, compounded
        double volatility,        // standard deviation: how much returns jump around
        int worstYear,
        double worstReturn,
        int bestYear,
        double bestReturn) {
}
