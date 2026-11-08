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

// Production allows two sites (CloudFront and the Vercel name), written as one comma-separated setting.
// Spring splits it into the String[] that CorsConfig receives, so each site must be allowed on its own.
@WebMvcTest(controllers = FeeController.class,
        properties = "app.cors.allowed-origins=https://site-one.example,https://site-two.example")
class CorsOriginListTest {

    private static final String BODY =
            "{\"initial\": 10000, \"annualReturn\": 0.07, \"fundFee\": 0.01, \"baselineFee\": 0.0004, \"years\": 1}";

    @Autowired
    private MockMvc mockMvc;

    @Test
    void everySiteInACommaSeparatedListIsAllowed() throws Exception {
        for (String origin : new String[] {"https://site-one.example", "https://site-two.example"}) {
            mockMvc.perform(post("/fees").header("Origin", origin)
                            .contentType(MediaType.APPLICATION_JSON).content(BODY))
                    .andExpect(status().isOk())
                    .andExpect(header().string("Access-Control-Allow-Origin", origin));
        }
    }
}
