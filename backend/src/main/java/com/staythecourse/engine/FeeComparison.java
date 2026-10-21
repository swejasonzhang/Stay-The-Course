package com.staythecourse.engine;

import java.util.List;

// =============================================================================
// FeeComparison: the engine's result for one fee comparison.
//
// FeeCalculator.compareFees() creates one, and FeeController copies its
// values into a FeeResponse. It lives in the engine package because it's part
// of the engine's own vocabulary, not the HTTP contract.
//
// HOW A REQUEST FLOWS THROUGH THE BACKEND  (► = this file)
//
//   At startup (once):
//         StayTheCourseApplication  starts Spring and the web server
//
//   Each POST /fees request:
//         1.  FeeController     Spring matches POST /fees to calculateFees()
//         2.  FeeRequest        the JSON body is turned into a FeeRequest and checked
//         2b. ApiErrorHandler   only if step 2 fails: sends a 400 or 422; 3-6 never run
//         3.  FeeController     calculateFees() runs and calls the engine
//         4.  FeeCalculator     does the math
//   ►     5.  FeeComparison     holds the engine's result
//         6.  FeeResponse       copied from the result, sent back as JSON with a 200
// =============================================================================

// A record: a class that only holds values, Java's version of Python's
// @dataclass. Java writes the constructor for you, so
//   new FeeComparison(fundBalances, baselineBalances, feeCost)
// works, and you read each field with parentheses: result.feeCost().
public record FeeComparison(
        List<Double> fundBalances,       // your fund, year by year (index 0 = today)
        List<Double> baselineBalances,   // the low-cost fund, year by year
        double feeCost) {                // dollars lost by the end to the higher fee
}
