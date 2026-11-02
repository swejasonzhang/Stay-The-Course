package com.staythecourse.api;

import com.staythecourse.data.HistoricalReturnsRepository;
import com.staythecourse.engine.RetirementSimulator;
import com.staythecourse.engine.SimulationInputs;
import jakarta.validation.Valid;
import java.util.SplittableRandom;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

// POST /simulate: runs the Monte Carlo retirement simulation with both spending rules.
@RestController
public class SimulationController {

    private final HistoricalReturnsRepository history;

    // Spring passes in its single HistoricalReturnsRepository ("constructor injection").
    public SimulationController(HistoricalReturnsRepository history) {
        this.history = history;
    }

    @PostMapping("/simulate")
    public SimulationResponse simulate(@Valid @RequestBody SimulationRequest request) {
        SimulationInputs inputs = new SimulationInputs(
                request.currentBalance(),
                request.annualContribution(),
                request.yearsToRetirement(),
                request.yearsInRetirement(),
                request.withdrawalRate(),
                request.stockAllocation(),
                request.expenseRatio(),
                request.simulations());
        // A new random generator per request, so requests never share state.
        SplittableRandom random = request.seed() == null ? new SplittableRandom() : new SplittableRandom(request.seed());
        return SimulationResponse.from(RetirementSimulator.simulate(inputs, history.all(), random));
    }
}
