package com.staythecourse.api;

import com.staythecourse.engine.FeeCalculator;
import com.staythecourse.engine.FeeComparison;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

// POST /fees: JSON → FeeRequest (checked by @Valid) → FeeCalculator → FeeResponse.
// Bad input never reaches this method; ApiErrorHandler answers instead.
@RestController
public class FeeController {

    // @RequestBody turns the JSON into a FeeRequest; @Valid checks its rules first.
    @PostMapping("/fees")
    public FeeResponse calculateFees(@Valid @RequestBody FeeRequest request) {
        // Plain numbers only, so the engine never depends on web types. Order matters: Java has no named arguments.
        FeeComparison result = FeeCalculator.compareFees(
                request.initial(),
                request.annualReturn(),
                request.fundFee(),
                request.baselineFee(),
                request.years());
        return new FeeResponse(result.fundBalances(), result.baselineBalances(), result.feeCost());
    }
}
