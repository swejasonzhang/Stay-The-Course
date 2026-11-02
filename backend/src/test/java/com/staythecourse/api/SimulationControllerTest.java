package com.staythecourse.api;

import static org.hamcrest.Matchers.allOf;
import static org.hamcrest.Matchers.greaterThanOrEqualTo;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.lessThanOrEqualTo;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.staythecourse.data.HistoricalReturnsRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

// @Import adds the real data repository, which @WebMvcTest doesn't load on its own.
@WebMvcTest(SimulationController.class)
@Import(HistoricalReturnsRepository.class)
class SimulationControllerTest {

    private static final String VALID_REQUEST = """
            {"currentBalance": 100000, "annualContribution": 10000, "yearsToRetirement": 20,
             "yearsInRetirement": 30, "withdrawalRate": 0.04, "stockAllocation": 0.6,
             "expenseRatio": 0.0005, "simulations": 1000, "seed": 42}
            """;

    @Autowired
    private MockMvc mockMvc;

    @Test
    void validRequestReturnsBothRules() throws Exception {
        mockMvc.perform(post("/simulate").contentType(MediaType.APPLICATION_JSON).content(VALID_REQUEST))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.retirementYear").value(20))
                .andExpect(jsonPath("$.constantSpending.successRate", allOf(greaterThanOrEqualTo(0.0), lessThanOrEqualTo(1.0))))
                .andExpect(jsonPath("$.constantSpending.balances.p50", hasSize(51)))
                .andExpect(jsonPath("$.dynamicSpending.spending.p50", hasSize(30)));
    }

    @Test
    void theSameSeedGivesTheSameAnswer() throws Exception {
        String first = mockMvc.perform(post("/simulate").contentType(MediaType.APPLICATION_JSON).content(VALID_REQUEST))
                .andReturn().getResponse().getContentAsString();
        String second = mockMvc.perform(post("/simulate").contentType(MediaType.APPLICATION_JSON).content(VALID_REQUEST))
                .andReturn().getResponse().getContentAsString();
        assertEquals(first, second);
    }

    @Test
    void outOfRangeValuesAreRejectedByName() throws Exception {
        String body = VALID_REQUEST.replace("\"stockAllocation\": 0.6", "\"stockAllocation\": 60")
                .replace("\"simulations\": 1000", "\"simulations\": 1000000");
        mockMvc.perform(post("/simulate").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().is(422))
                .andExpect(jsonPath("$.stockAllocation").value("must be less than or equal to 1"))
                .andExpect(jsonPath("$.simulations").value("must be less than or equal to 10000"));
    }
}
