package com.staythecourse.engine;

import java.util.List;

// Summary statistics over the historical data: averages, volatility, best and worst years.
public final class HistoryStatistics {

    private HistoryStatistics() {
    }

    public static HistorySummary summarize(List<MarketYear> history) {
        if (history.size() < 2) {
            throw new IllegalArgumentException("need at least 2 years of history");
        }
        double[] stocks = new double[history.size()];
        double[] bonds = new double[history.size()];
        double[] inflation = new double[history.size()];
        for (int i = 0; i < history.size(); i++) {
            MarketYear year = history.get(i);
            stocks[i] = year.realStockReturn();
            bonds[i] = year.realBondReturn();
            inflation[i] = year.inflation();
        }
        return new HistorySummary(
                history.getFirst().year(),
                history.getLast().year(),
                history.size(),
                assetStatistics(history, stocks),
                assetStatistics(history, bonds),
                mean(inflation),
                correlation(stocks, bonds));
    }

    private static AssetStatistics assetStatistics(List<MarketYear> history, double[] returns) {
        int worst = 0;
        int best = 0;
        for (int i = 1; i < returns.length; i++) {
            if (returns[i] < returns[worst]) {
                worst = i;
            }
            if (returns[i] > returns[best]) {
                best = i;
            }
        }
        return new AssetStatistics(
                mean(returns),
                compoundReturn(returns),
                standardDeviation(returns),
                history.get(worst).year(),
                returns[worst],
                history.get(best).year(),
                returns[best]);
    }

    static double mean(double[] values) {
        double sum = 0;
        for (double value : values) {
            sum += value;
        }
        return sum / values.length;
    }

    // Grow $1 through every year, then find the steady yearly rate that gives the same result.
    static double compoundReturn(double[] returns) {
        double growth = 1;
        for (double r : returns) {
            growth *= 1 + r;
        }
        return Math.pow(growth, 1.0 / returns.length) - 1;
    }

    // Sample standard deviation (divides by n - 1).
    static double standardDeviation(double[] values) {
        double average = mean(values);
        double sumOfSquares = 0;
        for (double value : values) {
            sumOfSquares += (value - average) * (value - average);
        }
        return Math.sqrt(sumOfSquares / (values.length - 1));
    }

    // Pearson correlation: +1 means they always move together, -1 opposite, 0 unrelated.
    static double correlation(double[] a, double[] b) {
        double meanA = mean(a);
        double meanB = mean(b);
        double covariance = 0;
        double varianceA = 0;
        double varianceB = 0;
        for (int i = 0; i < a.length; i++) {
            covariance += (a[i] - meanA) * (b[i] - meanB);
            varianceA += (a[i] - meanA) * (a[i] - meanA);
            varianceB += (b[i] - meanB) * (b[i] - meanB);
        }
        return covariance / Math.sqrt(varianceA * varianceB);
    }
}
