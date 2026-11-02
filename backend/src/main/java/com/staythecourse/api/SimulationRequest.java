package com.staythecourse.api;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

// The JSON body for POST /simulate. Money is in today's dollars; rates are decimals.
// The caps keep one public request from tying up the server.
public record SimulationRequest(
        @NotNull @DecimalMin("0") @DecimalMax("1000000000")
        Double currentBalance,

        @NotNull @DecimalMin("0") @DecimalMax("10000000")
        Double annualContribution,

        @NotNull @Min(0) @Max(60)
        Integer yearsToRetirement,

        @NotNull @Min(1) @Max(60)
        Integer yearsInRetirement,

        // 0.04 = the classic "4% rule".
        @NotNull @DecimalMin(value = "0", inclusive = false) @DecimalMax("0.2")
        Double withdrawalRate,

        // Share in stocks; the rest is in bonds. 0.6 = 60/40.
        @NotNull @DecimalMin("0") @DecimalMax("1")
        Double stockAllocation,

        @NotNull @DecimalMin("0") @DecimalMax("0.1")
        Double expenseRatio,

        @NotNull @Min(100) @Max(10000)
        Integer simulations,

        // Optional. The same seed always produces the same random markets, which makes results repeatable.
        Long seed) {
}
