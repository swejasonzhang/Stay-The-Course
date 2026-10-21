package com.staythecourse.api;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

// The JSON body for POST /fees and its rules, checked by @Valid before the controller runs.
// Boxed types (Double, Integer) let @NotNull catch a missing field with a 422 that names it.
public record FeeRequest(
        @NotNull @DecimalMin("0") @DecimalMax("1000000000")
        Double initial,

        // Decimal: 0.07 = 7%. The cap of 1 catches a percent sent as 7.
        @NotNull @DecimalMin(value = "-1", inclusive = false) @DecimalMax("1")
        Double annualReturn,

        // Decimal: 0.01 = 1%.
        @NotNull @DecimalMin("0") @DecimalMax("0.1")
        Double fundFee,

        @NotNull @DecimalMin("0") @DecimalMax("0.1")
        Double baselineFee,

        // Capped at 100 so one public request can't loop millions of times.
        @NotNull @Min(0) @Max(100)
        Integer years) {
}
