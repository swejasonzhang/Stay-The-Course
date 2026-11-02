package com.staythecourse.api;

import com.staythecourse.engine.AssetClass;
import jakarta.validation.Valid;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;

// The JSON body for POST /portfolio. @Valid on the nested parts makes the validator check them too.
public record PortfolioRequest(
        @NotEmpty @Size(max = 50)
        List<@Valid Holding> holdings,

        @NotNull @Valid
        TargetMix target,

        @NotNull @DecimalMin("0") @DecimalMax("1000000000")
        Double newContribution,

        // How far (as a decimal) an asset class may drift before selling is suggested. 0.05 = 5 points.
        @NotNull @DecimalMin(value = "0", inclusive = false) @DecimalMax("0.5")
        Double driftThreshold) {

    public record Holding(
            @NotBlank @Size(max = 100)
            String name,

            @NotNull
            AssetClass assetClass,

            @NotNull @DecimalMin("0") @DecimalMax("10000000000")
            Double value,

            @NotNull @DecimalMin("0") @DecimalMax("0.1")
            Double expenseRatio) {
    }

    public record TargetMix(
            @NotNull @DecimalMin("0") @DecimalMax("1") Double usStocks,
            @NotNull @DecimalMin("0") @DecimalMax("1") Double internationalStocks,
            @NotNull @DecimalMin("0") @DecimalMax("1") Double bonds,
            @NotNull @DecimalMin("0") @DecimalMax("1") Double cash) {

        // A rule that involves several fields at once. Reported as "target.totalOneHundredPercent".
        @AssertTrue(message = "must add up to 100%")
        public boolean isTotalOneHundredPercent() {
            if (usStocks == null || internationalStocks == null || bonds == null || cash == null) {
                return true;
            }
            return Math.abs(usStocks + internationalStocks + bonds + cash - 1) <= 0.001;
        }
    }

    @AssertTrue(message = "must add up to more than 0")
    public boolean isHoldingsTotalPositive() {
        if (holdings == null) {
            return true;
        }
        return holdings.stream().filter(h -> h != null && h.value() != null).mapToDouble(Holding::value).sum() > 0;
    }
}
