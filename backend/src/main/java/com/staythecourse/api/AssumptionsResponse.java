package com.staythecourse.api;

import com.staythecourse.engine.AssetStatistics;
import com.staythecourse.engine.HistorySummary;
import com.staythecourse.engine.MarketYear;
import java.util.List;

// The JSON returned by GET /assumptions: the history the simulator draws from. Returns are real (after inflation).
public record AssumptionsResponse(
        String source,
        int firstYear,
        int lastYear,
        int years,
        Asset realStocks,
        Asset realBonds,
        double averageInflation,
        double stockBondCorrelation,
        List<YearReturn> yearly) {

    static final String SOURCE = "Aswath Damodaran, NYU Stern: historical returns on stocks (S&P 500 with dividends) "
            + "and 10-year US Treasury bonds, updated January 2026";

    public record Asset(
            double averageReturn,
            double compoundReturn,
            double volatility,
            int worstYear,
            double worstReturn,
            int bestYear,
            double bestReturn) {
    }

    // One row per historical year, for the year-by-year chart.
    public record YearReturn(int year, double realStocks, double realBonds, double inflation) {
    }

    static AssumptionsResponse from(HistorySummary summary, List<MarketYear> history) {
        return new AssumptionsResponse(
                SOURCE,
                summary.firstYear(),
                summary.lastYear(),
                summary.years(),
                asset(summary.realStocks()),
                asset(summary.realBonds()),
                summary.averageInflation(),
                summary.stockBondCorrelation(),
                history.stream()
                        .map(y -> new YearReturn(y.year(), y.realStockReturn(), y.realBondReturn(), y.inflation()))
                        .toList());
    }

    private static Asset asset(AssetStatistics stats) {
        return new Asset(
                stats.averageReturn(), stats.compoundReturn(), stats.volatility(),
                stats.worstYear(), stats.worstReturn(), stats.bestYear(), stats.bestReturn());
    }
}
