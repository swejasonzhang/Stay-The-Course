package com.staythecourse.engine;

// The historical facts behind the simulator, shown to users as its assumptions.
public record HistorySummary(
        int firstYear,
        int lastYear,
        int years,
        AssetStatistics realStocks,
        AssetStatistics realBonds,
        double averageInflation,
        double stockBondCorrelation) {
}
