package com.staythecourse.engine;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.util.List;
import org.junit.jupiter.api.Test;

class HistoryStatisticsTest {

    // Up 10%, then down 10%: the simple average is 0%, but you actually lost money (1.1 x 0.9 = 0.99).
    @Test
    void averageAndCompoundReturnDifferWhenReturnsBounceAround() {
        HistorySummary summary = HistoryStatistics.summarize(List.of(
                new MarketYear(2000, 0.10, 0.10, 0, 0),
                new MarketYear(2001, -0.10, -0.10, 0, 0)));

        AssetStatistics stocks = summary.realStocks();
        assertEquals(0.0, stocks.averageReturn(), 1e-12);
        assertEquals(Math.sqrt(0.99) - 1, stocks.compoundReturn(), 1e-12);
        assertEquals(Math.sqrt(0.02), stocks.volatility(), 1e-12);
        assertEquals(2001, stocks.worstYear());
        assertEquals(2000, stocks.bestYear());
        assertEquals(1.0, summary.stockBondCorrelation(), 1e-12);
    }

    @Test
    void oppositeMovesHaveCorrelationMinusOne() {
        HistorySummary summary = HistoryStatistics.summarize(List.of(
                new MarketYear(2000, 0.10, -0.10, 0, 0),
                new MarketYear(2001, -0.10, 0.10, 0, 0)));
        assertEquals(-1.0, summary.stockBondCorrelation(), 1e-12);
    }

    // Real return = (1 + 10%) / (1 + 5% inflation) - 1, about 4.76%.
    @Test
    void realReturnsRemoveInflation() {
        MarketYear year = new MarketYear(2000, 0.10, 0.05, 0, 0.05);
        assertEquals(1.10 / 1.05 - 1, year.realStockReturn(), 1e-12);
        assertEquals(0.0, year.realBondReturn(), 1e-12);
    }
}
