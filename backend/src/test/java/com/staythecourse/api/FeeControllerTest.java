package com.staythecourse.api;

import static org.hamcrest.Matchers.closeTo;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

// =============================================================================
// FeeControllerTest: tests for the HTTP side of POST /fees.
//
// The engine tests already prove the math. These prove the contract with the
// frontend: the right status codes, the right JSON shape, and that bad input
// is turned away before the engine runs.
//   200  everything passed and the math ran
//   400  the body couldn't be read (not JSON, or a decimal for years)
//   422  the JSON was read, but a value broke a rule in FeeRequest
//
// @WebMvcTest(FeeController.class) starts only the web layer: FeeController,
// ApiErrorHandler, JSON conversion and validation. There's no real server and
// nothing listening on a port, so it's fast.
// MockMvc sends fake HTTP requests straight to that web layer.
// MERN equivalent: supertest, request(app).post('/fees').send(body).expect(200).
// =============================================================================
@WebMvcTest(FeeController.class)
class FeeControllerTest {

    // A text block (""" ... """): Java's multi-line string, like a JS template
    // literal. Each %s is a blank that .formatted(...) fills in, in order
    // (JS: ${...}). The field order is initial, annualReturn, fundFee,
    // baselineFee, years.
    private static final String REQUEST_TEMPLATE = """
            {"initial": %s, "annualReturn": %s, "fundFee": %s, "baselineFee": %s, "years": %s}
            """;

    // A complete, valid request body: $10,000 for 30 years at 7%, 1% fee vs 0.04%.
    private static final String VALID_REQUEST =
            REQUEST_TEMPLATE.formatted("10000", "0.07", "0.01", "0.0004", "30");

    // @Autowired: Spring creates the MockMvc object and puts it in this field
    // for you ("dependency injection"). You never write `new MockMvc()`.
    @Autowired
    private MockMvc mockMvc;

    // `throws Exception`: Java makes a method declare errors it might pass on.
    // mockMvc.perform() can throw one, so every test that calls it says so.
    @Test
    void validRequestReturnsBothProjectionsAndTheCost() throws Exception {
        // Send POST /fees with a JSON body, then check the response:
        //   status().isOk()             the status code is 200
        //   jsonPath("$.fundBalances")  reads a field from the response JSON
        //                               ($ means the whole response body)
        //   hasSize(31)                 the list has 31 entries (today + 30 years)
        //   closeTo(x, 0.02)            within 2 cents of x (Jest: toBeCloseTo)
        mockMvc.perform(post("/fees").contentType(MediaType.APPLICATION_JSON).content(VALID_REQUEST))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.fundBalances", hasSize(31)))
                .andExpect(jsonPath("$.baselineBalances", hasSize(31)))
                .andExpect(jsonPath("$.feeCost", closeTo(17_838.54, 0.02)));
    }

    @Test
    void missingFieldsAreRejected() throws Exception {
        // Only "initial" is sent, so @NotNull fails for the other four fields.
        // \" is how you write a quote mark inside a Java string.
        mockMvc.perform(post("/fees").contentType(MediaType.APPLICATION_JSON).content("{\"initial\": 10000}"))
                .andExpect(status().is(422))
                .andExpect(jsonPath("$.years").value("must not be null"));
    }

    // Runs once per row. Each row is a full request with one value out of range,
    // and every one must get a 422. Text after // is a comment explaining the row.
    @ParameterizedTest
    @CsvSource({
        // initial, annualReturn, fundFee, baselineFee, years
        "10000,     7,            0.01,    0.0004,      30",    // 7 instead of 0.07: a percent sent as a whole number
        "10000,     0.07,         1,       0.0004,      30",    // 1 instead of 0.01
        "10000,     0.07,         0.01,    0.0004,      -1",
        "10000,     0.07,         0.01,    0.0004,      1000",  // too many years to project
        "-5,        0.07,         0.01,    0.0004,      30",
    })
    void outOfRangeValuesAreRejected(
            String initial, String annualReturn, String fundFee, String baselineFee, String years)
            throws Exception {
        String body = REQUEST_TEMPLATE.formatted(initial, annualReturn, fundFee, baselineFee, years);
        mockMvc.perform(post("/fees").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().is(422));
    }

    @Test
    void decimalYearsAreRejected() throws Exception {
        // 30.5 can't be turned into a whole number, so the body can't be read: 400.
        // Without the setting in application.properties, it would quietly become 30.
        String body = REQUEST_TEMPLATE.formatted("10000", "0.07", "0.01", "0.0004", "30.5");
        mockMvc.perform(post("/fees").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").exists());
    }

    @Test
    void bodyThatIsNotJsonIsRejected() throws Exception {
        mockMvc.perform(post("/fees").contentType(MediaType.APPLICATION_JSON).content("hello"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").exists());
    }
}
