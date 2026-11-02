package com.staythecourse.data;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.staythecourse.engine.HistoryStatistics;
import com.staythecourse.engine.HistorySummary;
import com.staythecourse.engine.MarketYear;
import java.util.List;
import org.junit.jupiter.api.Test;

// The CSV parser, plus sanity checks on the real 1928-2025 data file.
class HistoricalReturnsTest {

    @Test
    void parsesRowsIntoMarketYears() {
        List<MarketYear> years = MarketYearCsv.parse("""
                year,stocks,bonds,bills,inflation
                1928,0.43,0.008,0.03,-0.011
                """);
        assertEquals(List.of(new MarketYear(1928, 0.43, 0.008, 0.03, -0.011)), years);
    }

    @Test
    void rejectsAWrongHeaderOrShortRow() {
        assertThrows(IllegalArgumentException.class, () -> MarketYearCsv.parse("year,stocks\n1928,0.4\n"));
        assertThrows(IllegalArgumentException.class,
                () -> MarketYearCsv.parse("year,stocks,bonds,bills,inflation\n1928,0.4,0.1\n"));
    }

    @Test
    void loadsAllYearsFrom1928To2025() {
        List<MarketYear> years = new HistoricalReturnsRepository().all();

        assertEquals(98, years.size());
        assertEquals(1928, years.getFirst().year());
        assertEquals(2025, years.getLast().year());
    }

    // The list is shared by every request, so it must not be changeable.
    @Test
    void theSharedListCannotBeChanged() {
        List<MarketYear> years = new HistoricalReturnsRepository().all();
        assertThrows(UnsupportedOperationException.class, () -> years.add(years.getFirst()));
    }

    // Broad sanity checks, not exact values: real stock returns averaged in the high single digits,
    // and the worst real year for stocks was 1931.
    @Test
    void theRealDataLooksRight() {
        HistorySummary summary = HistoryStatistics.summarize(new HistoricalReturnsRepository().all());

        assertTrue(summary.realStocks().averageReturn() > 0.05 && summary.realStocks().averageReturn() < 0.10);
        assertTrue(summary.realStocks().volatility() > summary.realBonds().volatility());
        assertEquals(1931, summary.realStocks().worstYear());
    }
}
