package com.staythecourse.api;

import com.staythecourse.engine.PercentileBands;
import com.staythecourse.engine.SimulationResult;
import com.staythecourse.engine.SpendingRuleResult;
import java.util.List;

// The JSON returned by POST /simulate. Mirrors the engine's SimulationResult so the engine
// can change without breaking the frontend.
public record SimulationResponse(
        int retirementYear,
        double medianBalanceAtRetirement,
        double medianFirstYearSpending,
        Rule constantSpending,
        Rule dynamicSpending) {

    public record Rule(double successRate, Bands balances, Bands spending, double medianEndingBalance) {
    }

    public record Bands(List<Double> p10, List<Double> p25, List<Double> p50, List<Double> p75, List<Double> p90) {
    }

    static SimulationResponse from(SimulationResult result) {
        return new SimulationResponse(
                result.retirementYear(),
                result.medianBalanceAtRetirement(),
                result.medianFirstYearSpending(),
                rule(result.constantSpending()),
                rule(result.dynamicSpending()));
    }

    private static Rule rule(SpendingRuleResult rule) {
        return new Rule(rule.successRate(), bands(rule.balances()), bands(rule.spending()), rule.medianEndingBalance());
    }

    private static Bands bands(PercentileBands bands) {
        return new Bands(bands.p10(), bands.p25(), bands.p50(), bands.p75(), bands.p90());
    }
}
