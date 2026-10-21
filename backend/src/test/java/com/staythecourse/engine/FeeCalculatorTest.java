package com.staythecourse.engine;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.Collections;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

// Tests the engine directly, with no Spring, so a failure means the math is wrong.
// Run with ./mvnw test. assertEquals takes (expected, actual, allowed difference).
class FeeCalculatorTest {

    private static final double ONE_CENT = 0.01;

    @Test
    void zeroYearsReturnsOnlyTheStartingBalance() {
        List<Double> balances = FeeCalculator.projectBalances(10_000, 0.07, 0.0004, 0);
        assertEquals(List.of(10_000.0), balances);
    }

    @Test
    void everyYearMatchesTheCompoundGrowthFormula() {
        List<Double> balances = FeeCalculator.projectBalances(10_000, 0.07, 0.01, 30);
        assertEquals(31, balances.size());
        for (int year = 0; year < balances.size(); year++) {
            double expected = 10_000 * Math.pow(1 + 0.07 - 0.01, year);
            assertEquals(expected, balances.get(year), 1e-6);
        }
    }

    // The hand-calculated homework answers: $10,000 for 30 years at 7%.
    @ParameterizedTest
    @CsvSource({
        "0.0004, 75273.45",
        "0.01,   57434.91",
    })
    void matchesTheHandCalculation(double expenseRatio, double expected) {
        List<Double> balances = FeeCalculator.projectBalances(10_000, 0.07, expenseRatio, 30);
        assertEquals(expected, balances.getLast(), ONE_CENT);
    }

    @Test
    void higherFeeMeansLowerBalance() {
        double lowFee = FeeCalculator.projectBalances(10_000, 0.07, 0.0004, 30).getLast();
        double highFee = FeeCalculator.projectBalances(10_000, 0.07, 0.01, 30).getLast();
        assertTrue(highFee < lowFee);
    }

    @Test
    void noReturnAndNoFeeKeepsTheBalanceFlat() {
        List<Double> balances = FeeCalculator.projectBalances(10_000, 0.0, 0.0, 5);
        assertEquals(Collections.nCopies(6, 10_000.0), balances);
    }

    @Test
    void rejectsNegativeInputs() {
        assertThrows(IllegalArgumentException.class,
                () -> FeeCalculator.projectBalances(10_000, 0.07, 0.0004, -1));
        assertThrows(IllegalArgumentException.class,
                () -> FeeCalculator.projectBalances(-1, 0.07, 0.0004, 30));
        assertThrows(IllegalArgumentException.class,
                () -> FeeCalculator.projectBalances(10_000, 0.07, -0.01, 30));
    }

    @Test
    void compareFeesReturnsBothProjectionsAndTheGap() {
        FeeComparison result = FeeCalculator.compareFees(10_000, 0.07, 0.01, 0.0004, 30);
        assertEquals(57_434.91, result.fundBalances().getLast(), ONE_CENT);
        assertEquals(75_273.45, result.baselineBalances().getLast(), ONE_CENT);
        // Two cents: each expected balance was rounded separately.
        assertEquals(75_273.45 - 57_434.91, result.feeCost(), 2 * ONE_CENT);
    }
}
