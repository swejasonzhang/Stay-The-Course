package com.staythecourse.data;

import com.staythecourse.engine.MarketYear;
import java.util.ArrayList;
import java.util.List;

// Turns the text of historical-returns.csv into MarketYear records. Fails loudly on a bad header or row.
public final class MarketYearCsv {

    static final String HEADER = "year,stocks,bonds,bills,inflation";

    private MarketYearCsv() {
    }

    public static List<MarketYear> parse(String csv) {
        List<String> lines = csv.lines().filter(line -> !line.isBlank()).toList();
        if (lines.isEmpty() || !lines.getFirst().trim().equals(HEADER)) {
            throw new IllegalArgumentException("expected the header: " + HEADER);
        }
        List<MarketYear> years = new ArrayList<>();
        for (String line : lines.subList(1, lines.size())) {
            String[] parts = line.split(",");
            if (parts.length != 5) {
                throw new IllegalArgumentException("expected 5 values in row: " + line);
            }
            years.add(new MarketYear(
                    Integer.parseInt(parts[0].trim()),
                    Double.parseDouble(parts[1].trim()),
                    Double.parseDouble(parts[2].trim()),
                    Double.parseDouble(parts[3].trim()),
                    Double.parseDouble(parts[4].trim())));
        }
        return List.copyOf(years);
    }
}
