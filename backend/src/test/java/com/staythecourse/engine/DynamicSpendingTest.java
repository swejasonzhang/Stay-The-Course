package com.staythecourse.engine;

import static org.junit.jupiter.api.Assertions.assertEquals;

import org.junit.jupiter.api.Test;

// The guardrail rule on its own, using Vanguard's published example.
class DynamicSpendingTest {

    // Vanguard: start at 50,000 (5% of 1,000,000). The real balance grows to 1,100,000, so 5% would be
    // 55,000, but the 5% ceiling caps the raise at 52,500.
    @Test
    void ceilingMatchesVanguardsWorkedExample() {
        assertEquals(52_500, DynamicSpending.nextSpending(50_000, 1_100_000, 0.05), 1e-9);
    }

    // The balance falls to 800,000, so 5% would be 40,000, but the 2.5% floor limits the cut to 48,750.
    @Test
    void floorLimitsHowFastSpendingFalls() {
        assertEquals(48_750, DynamicSpending.nextSpending(50_000, 800_000, 0.05), 1e-9);
    }

    @Test
    void withinTheGuardrailsSpendingFollowsTheBalance() {
        assertEquals(51_000, DynamicSpending.nextSpending(50_000, 1_020_000, 0.05), 1e-9);
    }
}
