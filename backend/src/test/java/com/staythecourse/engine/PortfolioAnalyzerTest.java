package com.staythecourse.engine;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

class PortfolioAnalyzerTest {

    // $100,000: 60% US stocks, 20% international, 20% bonds. The target is 50/30/20.
    private static final List<Holding> HOLDINGS = List.of(
            new Holding("US fund", AssetClass.US_STOCKS, 60_000, 0.0003),
            new Holding("International fund", AssetClass.INTERNATIONAL_STOCKS, 20_000, 0.0005),
            new Holding("Bond fund", AssetClass.BONDS, 20_000, 0.0003));
    private static final Map<AssetClass, Double> TARGET = Map.of(
            AssetClass.US_STOCKS, 0.5, AssetClass.INTERNATIONAL_STOCKS, 0.3, AssetClass.BONDS, 0.2, AssetClass.CASH, 0.0);

    @Test
    void currentMixDriftAndAverageFee() {
        PortfolioReport report = PortfolioAnalyzer.analyze(HOLDINGS, TARGET, 0, 0.05);

        assertEquals(100_000, report.totalValue(), 1e-9);
        AllocationLine us = report.allocations().getFirst();
        assertEquals(AssetClass.US_STOCKS, us.assetClass());
        assertEquals(0.6, us.currentWeight(), 1e-12);
        assertEquals(0.1, us.drift(), 1e-12);
        assertEquals(0.1, report.largestDrift(), 1e-12);
        // (60,000 x 0.03% + 20,000 x 0.05% + 20,000 x 0.03%) = $34 a year, or 0.034% on $100,000.
        assertEquals(34, report.annualFees(), 1e-9);
        assertEquals(0.00034, report.weightedExpenseRatio(), 1e-12);
    }

    // New total $110,000. Shortfalls: international 33,000 - 20,000 = 13,000; bonds 22,000 - 20,000 = 2,000.
    // $10,000 is split 13:2, and the largest drift left is about 4.5 points, under 5, so nothing is sold.
    @Test
    void newMoneyGoesToUnderweightClassesFirst() {
        PortfolioReport report = PortfolioAnalyzer.analyze(HOLDINGS, TARGET, 10_000, 0.05);

        assertFalse(report.fullRebalanceNeeded());
        assertEquals(2, report.trades().size());
        assertTrade(report.trades().get(0), AssetClass.INTERNATIONAL_STOCKS, Trade.Action.BUY, 8_666.67);
        assertTrade(report.trades().get(1), AssetClass.BONDS, Trade.Action.BUY, 1_333.33);
    }

    private static void assertTrade(Trade trade, AssetClass assetClass, Trade.Action action, double amount) {
        assertEquals(assetClass, trade.assetClass());
        assertEquals(action, trade.action());
        assertEquals(amount, trade.amount(), 0.01);
    }

    // No new money and 10 points of drift, so the plan sells US stocks to buy international.
    @Test
    void sellsOnlyWhenNewMoneyCantFixTheDrift() {
        PortfolioReport report = PortfolioAnalyzer.analyze(HOLDINGS, TARGET, 0, 0.05);

        assertTrue(report.fullRebalanceNeeded());
        assertEquals(2, report.trades().size());
        assertTrade(report.trades().get(0), AssetClass.US_STOCKS, Trade.Action.SELL, 10_000);
        assertTrade(report.trades().get(1), AssetClass.INTERNATIONAL_STOCKS, Trade.Action.BUY, 10_000);
        for (AllocationLine line : report.allocationsAfter()) {
            assertEquals(0, line.drift(), 1e-12);
        }
        assertTrue(report.warnings().stream().anyMatch(w -> w.contains("capital gains")));
    }

    @Test
    void aPortfolioOnTargetNeedsNoTrades() {
        List<Holding> onTarget = List.of(
                new Holding("US fund", AssetClass.US_STOCKS, 50_000, 0.0003),
                new Holding("International fund", AssetClass.INTERNATIONAL_STOCKS, 30_000, 0.0005),
                new Holding("Bond fund", AssetClass.BONDS, 20_000, 0.0003));
        PortfolioReport report = PortfolioAnalyzer.analyze(onTarget, TARGET, 0, 0.05);

        assertTrue(report.trades().isEmpty());
        assertTrue(report.warnings().isEmpty());
    }

    @Test
    void warnsAboutHighFees() {
        List<Holding> holdings = List.of(new Holding("Pricey fund", AssetClass.US_STOCKS, 1_000, 0.009));
        PortfolioReport report = PortfolioAnalyzer.analyze(holdings, Map.of(AssetClass.US_STOCKS, 1.0), 0, 0.05);

        assertTrue(report.warnings().getFirst().startsWith("Pricey fund charges 0.90%"));
    }

    @Test
    void rejectsInputsThatMakeNoSense() {
        assertThrows(IllegalArgumentException.class, () -> PortfolioAnalyzer.analyze(List.of(), TARGET, 0, 0.05));
        assertThrows(IllegalArgumentException.class,
                () -> PortfolioAnalyzer.analyze(HOLDINGS, Map.of(AssetClass.US_STOCKS, 0.9), 0, 0.05));
        assertThrows(IllegalArgumentException.class,
                () -> PortfolioAnalyzer.analyze(HOLDINGS, TARGET, -1, 0.05));
    }
}
