package com.staythecourse.data;

import com.staythecourse.engine.MarketYear;
import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;
import java.util.List;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;

// Loads the 1928-2025 market history once at startup. Spring creates one of these and hands it
// to every controller that asks for it. The list can't be changed, so sharing it across requests is safe.
@Component
public class HistoricalReturnsRepository {

    static final String LOCATION = "data/historical-returns.csv";

    private final List<MarketYear> years;

    public HistoricalReturnsRepository() {
        try (InputStream in = new ClassPathResource(LOCATION).getInputStream()) {
            years = MarketYearCsv.parse(new String(in.readAllBytes(), StandardCharsets.UTF_8));
        } catch (IOException e) {
            throw new UncheckedIOException("could not read " + LOCATION, e);
        }
    }

    public List<MarketYear> all() {
        return years;
    }
}
