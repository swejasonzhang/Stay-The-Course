package com.staythecourse.api;

import com.staythecourse.engine.FeeCalculator;
import com.staythecourse.engine.FeeComparison;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class FeeController {

    @PostMapping("/fees")
    public FeeResponse calculateFees(@Valid @RequestBody FeeRequest request) {
        FeeComparison result = FeeCalculator.compareFees(
                request.initial(),
                request.annualReturn(),
                request.fundFee(),
                request.baselineFee(),
                request.years());
        return new FeeResponse(result.fundBalances(), result.baselineBalances(), result.feeCost());
    }
}
