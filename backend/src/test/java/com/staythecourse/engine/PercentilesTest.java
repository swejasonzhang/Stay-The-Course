package com.staythecourse.engine;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import org.junit.jupiter.api.Test;

class PercentilesTest {

    @Test
    void medianAndEndsOfASortedList() {
        double[] values = {1, 2, 3, 4, 5};
        assertEquals(1, Percentiles.of(values, 0), 1e-12);
        assertEquals(3, Percentiles.of(values, 0.5), 1e-12);
        assertEquals(5, Percentiles.of(values, 1), 1e-12);
    }

    // 10th percentile of 10..50: position 0.1 * 4 = 0.4, so 40% of the way from 10 to 20.
    @Test
    void interpolatesBetweenNeighbours() {
        assertEquals(14, Percentiles.of(new double[] {50, 10, 40, 20, 30}, 0.10), 1e-12);
    }

    @Test
    void doesNotReorderTheCallersArray() {
        double[] values = {3, 1, 2};
        Percentiles.of(values, 0.5);
        assertArrayEquals(new double[] {3, 1, 2}, values);
    }

    @Test
    void rejectsEmptyInputAndBadPercentiles() {
        assertThrows(IllegalArgumentException.class, () -> Percentiles.of(new double[0], 0.5));
        assertThrows(IllegalArgumentException.class, () -> Percentiles.of(new double[] {1}, 1.5));
    }
}
