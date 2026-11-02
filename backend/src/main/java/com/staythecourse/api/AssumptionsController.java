package com.staythecourse.api;

import com.staythecourse.data.HistoricalReturnsRepository;
import com.staythecourse.engine.HistoryStatistics;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

// GET /assumptions: summary statistics of the historical data behind the simulator.
@RestController
public class AssumptionsController {

    private final HistoricalReturnsRepository history;

    public AssumptionsController(HistoricalReturnsRepository history) {
        this.history = history;
    }

    @GetMapping("/assumptions")
    public AssumptionsResponse assumptions() {
        return AssumptionsResponse.from(HistoryStatistics.summarize(history.all()), history.all());
    }
}
