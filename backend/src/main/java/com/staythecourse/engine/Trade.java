package com.staythecourse.engine;

public record Trade(AssetClass assetClass, Action action, double amount) {

    public enum Action {
        BUY,
        SELL
    }
}
