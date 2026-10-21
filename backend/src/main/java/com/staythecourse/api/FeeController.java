package com.staythecourse.api;

// Imports let this file use classes from other packages by their short names,
// like require() or import in JS.
import com.staythecourse.engine.FeeCalculator;   // the engine (the math)
import com.staythecourse.engine.FeeComparison;   // the engine's result type
import jakarta.validation.Valid;                  // switches on the rules in FeeRequest
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

// =============================================================================
// FeeController: receives POST /fees and hands plain numbers to the engine.
//
// This is the only file that connects HTTP to the math, and it doesn't do any
// math itself. It pulls the numbers out of the request, calls FeeCalculator,
// and copies the result into a FeeResponse.
// MERN equivalent: an Express route handler, app.post('/fees', (req, res) => ...).
//
// HOW A REQUEST FLOWS THROUGH THE BACKEND  (► = this file)
//
//   At startup (once):
//         StayTheCourseApplication  starts Spring and the web server
//
//   Each POST /fees request:
//   ►     1.  FeeController     Spring matches POST /fees to calculateFees()
//         2.  FeeRequest        the JSON body is turned into a FeeRequest and checked
//         2b. ApiErrorHandler   only if step 2 fails: sends a 400 or 422; 3-6 never run
//   ►     3.  FeeController     calculateFees() runs and calls the engine
//         4.  FeeCalculator     does the math
//         5.  FeeComparison     holds the engine's result
//         6.  FeeResponse       copied from the result, sent back as JSON with a 200
// =============================================================================

// @RestController tells Spring two things:
//   1. This class handles HTTP requests, so create one FeeController object at
//      startup. You never write `new FeeController()` yourself.
//   2. Whatever its methods return should be turned into JSON automatically.
@RestController
public class FeeController {

    // @PostMapping("/fees") registers this method for POST requests to /fees.
    //
    // The parameter "@Valid @RequestBody FeeRequest request" does three jobs:
    //   @RequestBody   take the JSON body and turn it into a FeeRequest object
    //                  (Express: req.body, but already converted to the right types)
    //   @Valid         check that object against the rules in FeeRequest.java.
    //                  Without @Valid, those rules would be ignored completely.
    //   FeeRequest     the type to turn the JSON into
    //
    // If the JSON can't be read or a rule fails, Spring never calls this method.
    // ApiErrorHandler sends the error response instead.
    //
    // The return type, FeeResponse, is turned into JSON and sent back with
    // status 200 (Express: res.json(...)).
    @PostMapping("/fees")
    public FeeResponse calculateFees(@Valid @RequestBody FeeRequest request) {
        // Pull out each plain number and pass it to the engine. The engine never
        // sees the FeeRequest object, so it stays free of anything web-related.
        //   request.initial() reads the "initial" field. Record fields are read
        //   with parentheses. It gives back a Double, and Java converts it to the
        //   plain double that compareFees expects.
        // Java has no named arguments, so these must be in the same order as
        // compareFees's parameters: initial, annualReturn, fundFee, baselineFee, years.
        FeeComparison result = FeeCalculator.compareFees(
                request.initial(),
                request.annualReturn(),
                request.fundFee(),
                request.baselineFee(),
                request.years());

        // Copy the engine's result into the shape promised to the frontend.
        // `new` creates an object, like `new` in JS.
        return new FeeResponse(result.fundBalances(), result.baselineBalances(), result.feeCost());
    }
}
