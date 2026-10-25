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

// Turns bad requests into JSON errors for every controller.
// The @ResponseStatus line above each method sets the status code it sends.
@RestControllerAdvice
public class ApiErrorHandler {

    // Checkpoint 1 (reading): not JSON, or a wrong type such as a decimal for years.
    @ExceptionHandler(HttpMessageNotReadableException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST) // 400
    public Map<String, String> handleUnreadableBody(HttpMessageNotReadableException exception) {
        return Map.of("error",
                "Request body must be JSON with a number in every field, and years must be a whole number");
    }

    // Checkpoint 2 (rules): valid JSON, but @Valid found broken rules. Returns {"field": "message", ...}.
    @ExceptionHandler(MethodArgumentNotValidException.class)
    @ResponseStatus(HttpStatus.UNPROCESSABLE_CONTENT) // 422
    public Map<String, String> handleInvalidRequest(MethodArgumentNotValidException exception) {
        Map<String, String> errors = new LinkedHashMap<>();
        for (FieldError fieldError : exception.getBindingResult().getFieldErrors()) {
            errors.put(fieldError.getField(), fieldError.getDefaultMessage());
        }
        return errors;
    }
}
