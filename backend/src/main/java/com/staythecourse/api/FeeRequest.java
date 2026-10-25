package com.staythecourse.api;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public record FeeRequest(
        @NotNull @DecimalMin("0") @DecimalMax("1000000000")
        Double initial,

        @NotNull @DecimalMin(value = "-1", inclusive = false) @DecimalMax("1")
        Double annualReturn,

        @NotNull @DecimalMin("0") @DecimalMax("0.1")
        Double fundFee,

        @NotNull @DecimalMin("0") @DecimalMax("0.1")
        Double baselineFee,

        @NotNull @Min(0) @Max(100)
        Integer years) {
}
