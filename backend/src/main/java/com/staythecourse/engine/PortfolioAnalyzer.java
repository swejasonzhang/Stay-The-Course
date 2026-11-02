package com.staythecourse.engine;

import java.util.ArrayList;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;

// Portfolio checkup: current mix vs target, average fee, and a rebalancing plan.
// The plan puts new money into underweight asset classes first, and only sells
// if that still leaves the mix further from target than the drift threshold.
public final class PortfolioAnalyzer {

    static final double HIGH_FEE = 0.005;
    private static final double SMALLEST_TRADE = 0.01;
    private static final double WEIGHT_TOLERANCE = 0.001;

    private PortfolioAnalyzer() {
    }

    public static PortfolioReport analyze(
            List<Holding> holdings, Map<AssetClass, Double> target, double newContribution, double driftThreshold) {
        validate(holdings, target, newContribution, driftThreshold);

        Map<AssetClass, Double> current = new EnumMap<>(AssetClass.class);
        double total = 0;
        double annualFees = 0;
        for (Holding holding : holdings) {
            current.merge(holding.assetClass(), holding.value(), Double::sum);
            total += holding.value();
            annualFees += holding.value() * holding.expenseRatio();
        }

        double totalAfter = total + newContribution;
        Map<AssetClass, Double> buys = newMoneyFirst(current, target, newContribution, totalAfter);
        Map<AssetClass, Double> afterBuys = new EnumMap<>(AssetClass.class);
        for (AssetClass assetClass : AssetClass.values()) {
            afterBuys.put(assetClass, valueOf(current, assetClass) + valueOf(buys, assetClass));
        }
        boolean fullRebalance = largestDrift(afterBuys, target, totalAfter) > driftThreshold;

        List<Trade> trades = new ArrayList<>();
        Map<AssetClass, Double> after = new EnumMap<>(AssetClass.class);
        for (AssetClass assetClass : AssetClass.values()) {
            double trade = fullRebalance
                    ? valueOf(target, assetClass) * totalAfter - valueOf(current, assetClass)
                    : valueOf(buys, assetClass);
            if (Math.abs(trade) >= SMALLEST_TRADE) {
                trades.add(new Trade(assetClass, trade > 0 ? Trade.Action.BUY : Trade.Action.SELL, Math.abs(trade)));
            }
            after.put(assetClass, valueOf(current, assetClass) + trade);
        }

        List<AllocationLine> before = lines(current, target, total);
        return new PortfolioReport(
                total,
                annualFees / total,
                annualFees,
                before,
                largestDrift(current, target, total),
                fullRebalance,
                List.copyOf(trades),
                lines(after, target, totalAfter),
                warnings(holdings, fullRebalance, driftThreshold));
    }

    // Splits new money across underweight classes in proportion to how far short each one is.
    // If there's more money than shortfall, the rest is split by target weight.
    private static Map<AssetClass, Double> newMoneyFirst(
            Map<AssetClass, Double> current, Map<AssetClass, Double> target, double money, double totalAfter) {
        Map<AssetClass, Double> buys = new EnumMap<>(AssetClass.class);
        if (money <= 0) {
            return buys;
        }
        Map<AssetClass, Double> shortfalls = new EnumMap<>(AssetClass.class);
        double totalShortfall = 0;
        for (AssetClass assetClass : AssetClass.values()) {
            double shortfall = Math.max(0, valueOf(target, assetClass) * totalAfter - valueOf(current, assetClass));
            shortfalls.put(assetClass, shortfall);
            totalShortfall += shortfall;
        }
        double toShortfalls = Math.min(money, totalShortfall);
        double leftover = money - toShortfalls;
        for (AssetClass assetClass : AssetClass.values()) {
            double share = totalShortfall > 0 ? shortfalls.get(assetClass) / totalShortfall : 0;
            buys.put(assetClass, toShortfalls * share + leftover * valueOf(target, assetClass));
        }
        return buys;
    }

    private static List<AllocationLine> lines(Map<AssetClass, Double> values, Map<AssetClass, Double> target, double total) {
        List<AllocationLine> lines = new ArrayList<>();
        for (AssetClass assetClass : AssetClass.values()) {
            double value = valueOf(values, assetClass);
            double weight = value / total;
            double targetWeight = valueOf(target, assetClass);
            lines.add(new AllocationLine(assetClass, value, weight, targetWeight, weight - targetWeight));
        }
        return List.copyOf(lines);
    }

    private static double largestDrift(Map<AssetClass, Double> values, Map<AssetClass, Double> target, double total) {
        double largest = 0;
        for (AssetClass assetClass : AssetClass.values()) {
            double drift = Math.abs(valueOf(values, assetClass) / total - valueOf(target, assetClass));
            largest = Math.max(largest, drift);
        }
        return largest;
    }

    private static List<String> warnings(List<Holding> holdings, boolean fullRebalance, double driftThreshold) {
        List<String> warnings = new ArrayList<>();
        for (Holding holding : holdings) {
            if (holding.expenseRatio() > HIGH_FEE) {
                warnings.add("%s charges %.2f%% a year. Many broad index funds charge less than 0.10%%."
                        .formatted(holding.name(), holding.expenseRatio() * 100));
            }
        }
        if (fullRebalance) {
            warnings.add(("Your mix is more than %.0f percentage points off target and new money alone can't fix it, "
                    + "so the plan includes selling. Selling in a taxable account can trigger capital gains taxes.")
                    .formatted(driftThreshold * 100));
        }
        return List.copyOf(warnings);
    }

    private static double valueOf(Map<AssetClass, Double> values, AssetClass assetClass) {
        return values.getOrDefault(assetClass, 0.0);
    }

    // Guards for direct callers; the API checks these first for HTTP requests.
    private static void validate(
            List<Holding> holdings, Map<AssetClass, Double> target, double newContribution, double driftThreshold) {
        if (holdings.isEmpty()) {
            throw new IllegalArgumentException("holdings must not be empty");
        }
        double total = 0;
        for (Holding holding : holdings) {
            if (holding.value() < 0 || holding.expenseRatio() < 0) {
                throw new IllegalArgumentException("holding values and expense ratios must be 0 or more");
            }
            total += holding.value();
        }
        if (total <= 0) {
            throw new IllegalArgumentException("holdings must add up to more than 0");
        }
        double weights = 0;
        for (double weight : target.values()) {
            if (weight < 0 || weight > 1) {
                throw new IllegalArgumentException("target weights must be between 0 and 1");
            }
            weights += weight;
        }
        if (Math.abs(weights - 1) > WEIGHT_TOLERANCE) {
            throw new IllegalArgumentException("target weights must add up to 1");
        }
        if (newContribution < 0) {
            throw new IllegalArgumentException("new contribution must be 0 or more");
        }
        if (driftThreshold <= 0) {
            throw new IllegalArgumentException("drift threshold must be more than 0");
        }
    }
}
