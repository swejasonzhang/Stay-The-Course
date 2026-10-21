package com.staythecourse.engine;

// "import static" brings in methods so they can be called without their class
// name: assertEquals(...) instead of Assertions.assertEquals(...).
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.Collections;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

// =============================================================================
// FeeCalculatorTest: tests for the engine's math (FeeCalculator).
//
// These call the engine directly, with no web server or Spring involved, so
// they're fast, and a failure always means the math is wrong.
// Run every test from backend/ with:   ./mvnw test
//
// JUnit (Java's test library) next to Jest and pytest:
//   JUnit                         Jest                          pytest
//   @Test                         test('name', () => {...})     def test_name():
//   assertEquals(a, b)            expect(b).toBe(a)             assert b == a
//   assertEquals(a, b, delta)     expect(b).toBeCloseTo(a)      assert b == pytest.approx(a, abs=delta)
//   assertTrue(x)                 expect(x).toBe(true)          assert x
//   assertThrows(Type, () -> …)   expect(() => …).toThrow()     with pytest.raises(Type):
//   @ParameterizedTest+@CsvSource test.each(...)                @pytest.mark.parametrize
//
// Note the order: assertEquals(expected, actual).
// Test classes and methods don't need `public`; JUnit finds them anyway.
// The method names describe what's being proven, so a failure reads like a
// sentence.
// =============================================================================
class FeeCalculatorTest {

    // A constant. static: one copy shared by the whole class. final: it can't be
    // changed. Used as the allowed difference when comparing dollar amounts.
    private static final double ONE_CENT = 0.01;

    @Test
    void zeroYearsReturnsOnlyTheStartingBalance() {
        // 10_000 is 10000; the underscore is just a digit separator.
        // With years = 0 the loop never runs, so only today's balance is in the list.
        List<Double> balances = FeeCalculator.projectBalances(10_000, 0.07, 0.0004, 0);

        // List.of(...) builds a fixed list to compare against.
        assertEquals(List.of(10_000.0), balances);
    }

    @Test
    void everyYearMatchesTheCompoundGrowthFormula() {
        List<Double> balances = FeeCalculator.projectBalances(10_000, 0.07, 0.01, 30);

        // 31 entries: today plus 30 years.
        assertEquals(31, balances.size());

        // The loop's answer for every year must equal the textbook formula
        // initial × growth^year. Math.pow(a, b) is a to the power b (Python: a ** b).
        // Decimal math isn't exact (0.1 + 0.2 isn't exactly 0.3), so a tiny
        // difference of 0.000001 is allowed.
        for (int year = 0; year < balances.size(); year++) {
            double expected = 10_000 * Math.pow(1 + 0.07 - 0.01, year);
            assertEquals(expected, balances.get(year), 1e-6);
        }
    }

    // Runs once per row of @CsvSource. Each row is "expenseRatio, expected",
    // and JUnit converts the text into the method's two double parameters.
    // These are the hand-calculated homework answers for 30 years at 7%.
    @ParameterizedTest
    @CsvSource({
        "0.0004, 75273.45",
        "0.01,   57434.91",
    })
    void matchesTheHandCalculation(double expenseRatio, double expected) {
        List<Double> balances = FeeCalculator.projectBalances(10_000, 0.07, expenseRatio, 30);

        // getLast() is the balance after the final year. Within one cent, because
        // the expected values were rounded to cents.
        assertEquals(expected, balances.getLast(), ONE_CENT);
    }

    @Test
    void higherFeeMeansLowerBalance() {
        // The rule every fee calculation must obey. This would have caught the
        // $25,274 copying slip in the homework.
        double lowFee = FeeCalculator.projectBalances(10_000, 0.07, 0.0004, 30).getLast();
        double highFee = FeeCalculator.projectBalances(10_000, 0.07, 0.01, 30).getLast();
        assertTrue(highFee < lowFee);
    }

    @Test
    void noReturnAndNoFeeKeepsTheBalanceFlat() {
        List<Double> balances = FeeCalculator.projectBalances(10_000, 0.0, 0.0, 5);

        // Collections.nCopies(6, 10_000.0) is a list of six 10,000.0 values
        // (Python: [10_000] * 6; JS: Array(6).fill(10000)).
        assertEquals(Collections.nCopies(6, 10_000.0), balances);
    }

    @Test
    void rejectsNegativeInputs() {
        // assertThrows passes only if the code inside throws that kind of error.
        // `() -> ...` is a lambda: a small unnamed function, like JS's () => ...
        // It wraps the call so assertThrows can run it and catch the error.
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

        // Record fields are read with parentheses: result.fundBalances().
        assertEquals(57_434.91, result.fundBalances().getLast(), ONE_CENT);
        assertEquals(75_273.45, result.baselineBalances().getLast(), ONE_CENT);

        // Two cents allowed, because each expected balance was rounded separately.
        assertEquals(75_273.45 - 57_434.91, result.feeCost(), 2 * ONE_CENT);
    }
}
