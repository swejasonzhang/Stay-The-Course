package com.staythecourse.api;

import com.staythecourse.engine.AllocationLine;
import com.staythecourse.engine.AssetClass;
import com.staythecourse.engine.PortfolioReport;
import com.staythecourse.engine.Trade;
import java.util.List;

// The JSON returned by POST /portfolio.
public record PortfolioResponse(
        double totalValue,
        double weightedExpenseRatio,
        double annualFees,
        List<Allocation> allocations,
        double largestDrift,
        boolean fullRebalanceNeeded,
        List<TradeLine> trades,
        List<Allocation> allocationsAfter,
        List<String> warnings) {

    public record Allocation(AssetClass assetClass, double value, double currentWeight, double targetWeight, double drift) {
    }

    public record TradeLine(AssetClass assetClass, String action, double amount) {
    }

    static PortfolioResponse from(PortfolioReport report) {
        return new PortfolioResponse(
                report.totalValue(),
                report.weightedExpenseRatio(),
                report.annualFees(),
                allocations(report.allocations()),
                report.largestDrift(),
                report.fullRebalanceNeeded(),
                report.trades().stream().map(PortfolioResponse::tradeLine).toList(),
                allocations(report.allocationsAfter()),
                report.warnings());
    }

    private static List<Allocation> allocations(List<AllocationLine> lines) {
        return lines.stream()
                .map(l -> new Allocation(l.assetClass(), l.value(), l.currentWeight(), l.targetWeight(), l.drift()))
                .toList();
    }

    private static TradeLine tradeLine(Trade trade) {
        return new TradeLine(trade.assetClass(), trade.action().name(), trade.amount());
    }
}
