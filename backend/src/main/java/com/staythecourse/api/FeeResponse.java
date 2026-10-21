package com.staythecourse.api;

import java.util.List;

// =============================================================================
// FeeResponse: the JSON that POST /fees sends back.
//
// Spring turns this record into JSON automatically, and each field name
// becomes a key:
//   {"fundBalances": [10000.0, 10600.0, ...],
//    "baselineBalances": [10000.0, 10696.0, ...],
//    "feeCost": 17838.54}
//
// Why not send the engine's FeeComparison directly? FeeComparison is the
// engine's internal shape, and FeeResponse is the shape promised to the
// frontend. Keeping them separate means the engine can change without breaking
// the frontend: only FeeController would need updating.
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
//         5.  FeeComparison     holds the engine's result
//   ►     6.  FeeResponse       copied from the result, sent back as JSON with a 200
// =============================================================================

// A record: a class that only holds values (see FeeRequest.java).
//   List<Double>  a list of decimal numbers, which becomes a JSON array.
//                 Index 0 is today's balance; index n is the balance after n years.
//   double        a single decimal number
public record FeeResponse(
        List<Double> fundBalances,       // your fund, year by year
        List<Double> baselineBalances,   // the low-cost fund, year by year
        double feeCost) {                // dollars lost by the end to the higher fee
}
