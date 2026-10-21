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

// Tests the HTTP contract with MockMvc: fake requests to the web layer only, no real server.
// 200 = valid, 400 = body can't be read, 422 = a FeeRequest rule failed.
@WebMvcTest(FeeController.class)
class FeeControllerTest {

    // Each %s is filled in order: initial, annualReturn, fundFee, baselineFee, years.
    private static final String REQUEST_TEMPLATE = """
            {"initial": %s, "annualReturn": %s, "fundFee": %s, "baselineFee": %s, "years": %s}
            """;

    private static final String VALID_REQUEST =
            REQUEST_TEMPLATE.formatted("10000", "0.07", "0.01", "0.0004", "30");

    @Autowired
    private MockMvc mockMvc;

    @Test
    void validRequestReturnsBothProjectionsAndTheCost() throws Exception {
        mockMvc.perform(post("/fees").contentType(MediaType.APPLICATION_JSON).content(VALID_REQUEST))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.fundBalances", hasSize(31)))
                .andExpect(jsonPath("$.baselineBalances", hasSize(31)))
                .andExpect(jsonPath("$.feeCost", closeTo(17_838.54, 0.02)));
    }

    @Test
    void missingFieldsAreRejected() throws Exception {
        mockMvc.perform(post("/fees").contentType(MediaType.APPLICATION_JSON).content("{\"initial\": 10000}"))
                .andExpect(status().is(422))
                .andExpect(jsonPath("$.years").value("must not be null"));
    }

    @ParameterizedTest
    @CsvSource({
        // initial, annualReturn, fundFee, baselineFee, years
        "10000,     7,            0.01,    0.0004,      30",    // 7 instead of 0.07
        "10000,     0.07,         1,       0.0004,      30",    // 1 instead of 0.01
        "10000,     0.07,         0.01,    0.0004,      -1",
        "10000,     0.07,         0.01,    0.0004,      1000",  // too many years
        "-5,        0.07,         0.01,    0.0004,      30",
    })
    void outOfRangeValuesAreRejected(
            String initial, String annualReturn, String fundFee, String baselineFee, String years)
            throws Exception {
        String body = REQUEST_TEMPLATE.formatted(initial, annualReturn, fundFee, baselineFee, years);
        mockMvc.perform(post("/fees").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().is(422));
    }

    // Without the setting in application.properties, 30.5 would quietly become 30.
    @Test
    void decimalYearsAreRejected() throws Exception {
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
