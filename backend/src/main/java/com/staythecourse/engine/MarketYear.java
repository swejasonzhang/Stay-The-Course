package com.staythecourse.engine;

// One year of market history. All returns are nominal decimals (0.07 = 7%).
public record MarketYear(int year, double stocks, double bonds, double bills, double inflation) {

    // Inflation-adjusted return: what the money could actually buy. (1 + nominal) / (1 + inflation) - 1.
    public double realStockReturn() {
        return (1 + stocks) / (1 + inflation) - 1;
    }

    public double realBondReturn() {
        return (1 + bonds) / (1 + inflation) - 1;
    }
}
