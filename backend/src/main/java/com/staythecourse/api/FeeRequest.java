package com.staythecourse.api;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

// =============================================================================
// FeeRequest: the JSON the frontend sends to POST /fees, with a rule for every
// field.
//
// Spring turns the incoming JSON into a FeeRequest. Because FeeController
// marks its parameter with @Valid, every rule below is checked before
// calculateFees() runs. This file is the contract with the frontend; the
// engine never sees it.
// MERN equivalent: a Mongoose schema with required/min/max, except it
// describes a request instead of a database document.
//
// The JSON must use these exact field names:
//   {"initial": 10000, "annualReturn": 0.07, "fundFee": 0.01,
//    "baselineFee": 0.0004, "years": 30}
// Fields that aren't listed here are ignored, so a misspelled name such as
// "annual_return" counts as missing and fails @NotNull.
//
// HOW A REQUEST FLOWS THROUGH THE BACKEND  (► = this file)
//
//   At startup (once):
//         StayTheCourseApplication  starts Spring and the web server
//
//   Each POST /fees request:
//         1.  FeeController     Spring matches POST /fees to calculateFees()
//   ►     2.  FeeRequest        the JSON body is turned into a FeeRequest and checked
//         2b. ApiErrorHandler   only if step 2 fails: sends a 400 or 422; 3-6 never run
//         3.  FeeController     calculateFees() runs and calls the engine
//         4.  FeeCalculator     does the math
//         5.  FeeComparison     holds the engine's result
//         6.  FeeResponse       copied from the result, sent back as JSON with a 200
// =============================================================================

// A `record` is a class that only holds values (Python: @dataclass; TypeScript:
// an interface plus the object). Java writes the constructor and a reader
// method for each field for you, so request.years() returns the years value.
//
// The rule annotations come from Jakarta Bean Validation, Java's standard
// validation library:
//   @NotNull      the field must be in the JSON and not null
//   @DecimalMin   smallest allowed value; inclusive = false means "strictly greater"
//   @DecimalMax   largest allowed value
//   @Min, @Max    the same, for whole numbers
// The decimal limits are written as text ("0.1") so they're compared exactly.
//
// Why Double and Integer (capitalized) instead of double and int?
//   Lowercase double and int can never be empty. If one of those fields were
//   missing, reading the JSON would fail with a 400 that doesn't say which
//   field. The capitalized versions can be null ("missing"), so @NotNull
//   catches it and the 422 response names the field: {"fundFee": "must not be null"}.
public record FeeRequest(
        // Starting balance in dollars: 0 to 1 billion.
        @NotNull @DecimalMin("0") @DecimalMax("1000000000")
        Double initial,

        // Yearly return as a decimal: 0.07 means 7%. Must be above -1 (you can't
        // lose more than 100%) and at most 1, which catches 7 sent for 7%.
        @NotNull @DecimalMin(value = "-1", inclusive = false) @DecimalMax("1")
        Double annualReturn,

        // Your fund's expense ratio as a decimal: 0.01 means 1%. From 0 to 0.1
        // (10%), which catches 1 sent for 1%.
        @NotNull @DecimalMin("0") @DecimalMax("0.1")
        Double fundFee,

        // The low-cost fund to compare against: 0.0004 means 0.04%. Same limits.
        @NotNull @DecimalMin("0") @DecimalMax("0.1")
        Double baselineFee,

        // How many whole years to project: 0 to 100. The engine accepts any
        // number from 0 up, but a public API caps it so one request can't make
        // the server loop millions of times. A decimal such as 30.5 is rejected
        // with a 400 because of a setting in application.properties.
        @NotNull @Min(0) @Max(100)
        Integer years) {
}
