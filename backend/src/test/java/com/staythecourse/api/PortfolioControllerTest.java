package com.staythecourse.api;

import static org.hamcrest.Matchers.closeTo;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(PortfolioController.class)
class PortfolioControllerTest {

    // The same portfolio as PortfolioAnalyzerTest: 60/20/20 against a 50/30/20 target.
    private static final String VALID_REQUEST = """
            {"holdings": [
                {"name": "US fund", "assetClass": "US_STOCKS", "value": 60000, "expenseRatio": 0.0003},
                {"name": "International fund", "assetClass": "INTERNATIONAL_STOCKS", "value": 20000, "expenseRatio": 0.0005},
                {"name": "Bond fund", "assetClass": "BONDS", "value": 20000, "expenseRatio": 0.0003}],
             "target": {"usStocks": 0.5, "internationalStocks": 0.3, "bonds": 0.2, "cash": 0},
             "newContribution": 0,
             "driftThreshold": 0.05}
            """;

    @Autowired
    private MockMvc mockMvc;

    @Test
    void validRequestReturnsTheMixAndAPlan() throws Exception {
        mockMvc.perform(post("/portfolio").contentType(MediaType.APPLICATION_JSON).content(VALID_REQUEST))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalValue", closeTo(100_000, 0.01)))
                .andExpect(jsonPath("$.allocations", hasSize(4)))
                .andExpect(jsonPath("$.fullRebalanceNeeded").value(true))
                .andExpect(jsonPath("$.trades[0].assetClass").value("US_STOCKS"))
                .andExpect(jsonPath("$.trades[0].action").value("SELL"));
    }

    @Test
    void aTargetThatDoesntAddUpTo100IsRejected() throws Exception {
        String body = VALID_REQUEST.replace("\"usStocks\": 0.5", "\"usStocks\": 0.4");
        mockMvc.perform(post("/portfolio").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().is(422))
                .andExpect(jsonPath("$['target.totalOneHundredPercent']").value("must add up to 100%"));
    }

    @Test
    void nestedHoldingErrorsNameTheExactField() throws Exception {
        String body = VALID_REQUEST.replace("\"value\": 60000", "\"value\": -5");
        mockMvc.perform(post("/portfolio").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().is(422))
                .andExpect(jsonPath("$['holdings[0].value']").value("must be greater than or equal to 0"));
    }

    @Test
    void noHoldingsIsRejected() throws Exception {
        String body = VALID_REQUEST.replaceAll("(?s)\\[\\s*\\{.*}\\s*]", "[]");
        mockMvc.perform(post("/portfolio").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().is(422))
                .andExpect(jsonPath("$.holdings").value("must not be empty"));
    }

    // An asset class that doesn't exist can't be read at all, so it's a 400, not a 422.
    @Test
    void anUnknownAssetClassIsA400() throws Exception {
        String body = VALID_REQUEST.replace("\"BONDS\"", "\"CRYPTO\"");
        mockMvc.perform(post("/portfolio").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isBadRequest());
    }
}
