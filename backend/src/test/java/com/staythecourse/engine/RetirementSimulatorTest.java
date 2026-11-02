package com.staythecourse.engine;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.List;
import java.util.SplittableRandom;
import org.junit.jupiter.api.Test;

class RetirementSimulatorTest {

    // A "history" with one year in it means every simulated year is the same: no randomness at all.
    private static List<MarketYear> constantHistory(double nominalReturn) {
        return List.of(new MarketYear(2000, nominalReturn, nominalReturn, 0, 0));
    }

    private static SimulationInputs inputs(
            double balance, int yearsToRetirement, int yearsInRetirement, double expenseRatio) {
        return new SimulationInputs(balance, 0, yearsToRetirement, yearsInRetirement, 0.04, 0.6, expenseRatio, 100);
    }

    // With randomness removed, saving for 30 years must match the fee engine exactly.
    @Test
    void withoutRandomnessTheSimulatorMatchesTheFeeEngine() {
        SimulationResult result = RetirementSimulator.simulate(
                inputs(10_000, 30, 1, 0.01), constantHistory(0.07), new SplittableRandom(1));

        double feeEngine = FeeCalculator.projectBalances(10_000, 0.07, 0.01, 30).getLast();
        assertEquals(feeEngine, result.medianBalanceAtRetirement(), 1e-6);
        assertEquals(57_434.91, result.medianBalanceAtRetirement(), 0.01);
    }

    // 1,000,000 at 4% is 40,000 a year. With 0% returns that lasts exactly 25 years.
    @Test
    void constantSpendingRunsOutAfterExactly25YearsAtZeroReturn() {
        SimulationResult lasts = RetirementSimulator.simulate(
                inputs(1_000_000, 0, 25, 0), constantHistory(0), new SplittableRandom(1));
        SimulationResult runsOut = RetirementSimulator.simulate(
                inputs(1_000_000, 0, 26, 0), constantHistory(0), new SplittableRandom(1));

        assertEquals(1.0, lasts.constantSpending().successRate());
        assertEquals(0.0, runsOut.constantSpending().successRate());
        assertEquals(40_000, lasts.constantSpending().spending().p50().getFirst(), 1e-9);
    }

    // Year 1 spends 40,000, leaving 960,000. 4% of that is 38,400, but the floor allows at most a 2.5% cut: 39,000.
    @Test
    void dynamicSpendingCutsByNoMoreThanTheFloor() {
        SimulationResult result = RetirementSimulator.simulate(
                inputs(1_000_000, 0, 5, 0), constantHistory(0), new SplittableRandom(1));

        List<Double> spending = result.dynamicSpending().spending().p50();
        assertEquals(40_000, spending.get(0), 1e-9);
        assertEquals(39_000, spending.get(1), 1e-9);
    }

    @Test
    void sameSeedGivesTheSameResult() {
        List<MarketYear> history = List.of(
                new MarketYear(1, -0.30, 0.05, 0, 0.02),
                new MarketYear(2, 0.10, 0.02, 0, 0.03),
                new MarketYear(3, 0.25, -0.05, 0, 0.01));
        SimulationInputs inputs = new SimulationInputs(500_000, 10_000, 10, 30, 0.04, 0.6, 0.001, 500);

        SimulationResult first = RetirementSimulator.simulate(inputs, history, new SplittableRandom(42));
        SimulationResult second = RetirementSimulator.simulate(inputs, history, new SplittableRandom(42));

        assertEquals(first, second);
    }

    @Test
    void percentileBandsAreInOrderEveryYear() {
        List<MarketYear> history = List.of(
                new MarketYear(1, -0.30, 0.05, 0, 0.02),
                new MarketYear(2, 0.10, 0.02, 0, 0.03),
                new MarketYear(3, 0.25, -0.05, 0, 0.01));
        SimulationInputs inputs = new SimulationInputs(500_000, 10_000, 10, 30, 0.04, 0.6, 0.001, 500);
        PercentileBands bands = RetirementSimulator.simulate(inputs, history, new SplittableRandom(7))
                .constantSpending().balances();

        assertEquals(41, bands.p50().size());
        for (int year = 0; year < bands.p50().size(); year++) {
            assertTrue(bands.p10().get(year) <= bands.p25().get(year));
            assertTrue(bands.p25().get(year) <= bands.p50().get(year));
            assertTrue(bands.p50().get(year) <= bands.p75().get(year));
            assertTrue(bands.p75().get(year) <= bands.p90().get(year));
        }
    }

    @Test
    void rejectsInputsThatMakeNoSense() {
        List<MarketYear> history = constantHistory(0.05);
        assertThrows(IllegalArgumentException.class,
                () -> RetirementSimulator.simulate(inputs(1_000, 10, 10, 0), List.of(), new SplittableRandom(1)));
        assertThrows(IllegalArgumentException.class, () -> RetirementSimulator.simulate(
                new SimulationInputs(1_000, 0, 10, 10, 0.04, 1.5, 0, 100), history, new SplittableRandom(1)));
        assertThrows(IllegalArgumentException.class, () -> RetirementSimulator.simulate(
                new SimulationInputs(1_000, 0, 10, 10, 0.04, 0.6, 0, 0), history, new SplittableRandom(1)));
    }
}
