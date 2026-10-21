package com.staythecourse.api;

import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestControllerAdvice;

// =============================================================================
// ApiErrorHandler: turns bad requests into clear JSON error responses.
//
// It only runs when a request fails before FeeController's method is called:
//   - the body can't be read (not JSON, or "years": 30.5)  → 400 Bad Request
//   - the JSON was read, but a rule in FeeRequest failed    → 422 Unprocessable Content
// In either case Spring "throws an exception" (Java's word for raising an
// error), and a method below catches it and builds the response.
// MERN equivalent: Express error-handling middleware,
//   app.use((err, req, res, next) => res.status(...).json(...)).
//
// HOW A REQUEST FLOWS THROUGH THE BACKEND  (► = this file)
//
//   At startup (once):
//         StayTheCourseApplication  starts Spring and the web server
//
//   Each POST /fees request:
//         1.  FeeController     Spring matches POST /fees to calculateFees()
//         2.  FeeRequest        the JSON body is turned into a FeeRequest and checked
//   ►     2b. ApiErrorHandler   only if step 2 fails: sends a 400 or 422; 3-6 never run
//         3.  FeeController     calculateFees() runs and calls the engine
//         4.  FeeCalculator     does the math
//         5.  FeeComparison     holds the engine's result
//         6.  FeeResponse       copied from the result, sent back as JSON with a 200
// =============================================================================

// @RestControllerAdvice applies the methods below to every controller in the
// app and turns what they return into JSON. Spring finds this class at startup.
@RestControllerAdvice
public class ApiErrorHandler {

    // Runs when the body can't be turned into a FeeRequest at all: it isn't JSON,
    // or a value has the wrong type, such as a decimal for years.
    //   @ExceptionHandler(...)   "call this method when this kind of error happens"
    //   @ResponseStatus(...)     send this status code instead of the usual 200
    @ExceptionHandler(HttpMessageNotReadableException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public Map<String, String> handleUnreadableBody(HttpMessageNotReadableException exception) {
        // A Map holds key → value pairs, like a JS object or a Python dict.
        // Map.of(key, value) builds one that can't be changed: {"error": "..."}.
        return Map.of("error",
                "Request body must be JSON with a number in every field, and years must be a whole number");
    }

    // Runs when the JSON was read but @Valid found broken rules in FeeRequest.
    // MethodArgumentNotValidException is the error Spring throws in that case.
    @ExceptionHandler(MethodArgumentNotValidException.class)
    @ResponseStatus(HttpStatus.UNPROCESSABLE_CONTENT)
    public Map<String, String> handleInvalidRequest(MethodArgumentNotValidException exception) {
        // An empty map to fill in. LinkedHashMap keeps keys in the order they're added.
        Map<String, String> errors = new LinkedHashMap<>();

        // "For each broken rule": JS for (const fieldError of ...),
        // Python for field_error in ...
        for (FieldError fieldError : exception.getBindingResult().getFieldErrors()) {
            // For example: errors["years"] = "must be less than or equal to 100"
            errors.put(fieldError.getField(), fieldError.getDefaultMessage());
        }

        // Becomes JSON such as {"fundFee": "must not be null", "years": "must be ..."}
        return errors;
    }
}
