package com.staythecourse.config;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.staythecourse.api.FeeController;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

// Browsers send an Origin header saying which site the page came from. Only allowed origins get an answer.
@WebMvcTest(FeeController.class)
class CorsConfigTest {

    private static final String BODY =
            "{\"initial\": 10000, \"annualReturn\": 0.07, \"fundFee\": 0.01, \"baselineFee\": 0.0004, \"years\": 1}";

    @Autowired
    private MockMvc mockMvc;

    @Test
    void theLocalFrontendIsAllowed() throws Exception {
        mockMvc.perform(post("/fees").header("Origin", "http://localhost:5173")
                        .contentType(MediaType.APPLICATION_JSON).content(BODY))
                .andExpect(status().isOk())
                .andExpect(header().string("Access-Control-Allow-Origin", "http://localhost:5173"));
    }

    @Test
    void anyOtherSiteIsRefused() throws Exception {
        mockMvc.perform(post("/fees").header("Origin", "https://some-other-site.example")
                        .contentType(MediaType.APPLICATION_JSON).content(BODY))
                .andExpect(status().isForbidden());
    }
}
