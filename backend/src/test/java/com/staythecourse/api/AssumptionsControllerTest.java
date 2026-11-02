package com.staythecourse.api;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.staythecourse.data.HistoricalReturnsRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(AssumptionsController.class)
@Import(HistoricalReturnsRepository.class)
class AssumptionsControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void describesTheHistoricalData() throws Exception {
        mockMvc.perform(get("/assumptions"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.firstYear").value(1928))
                .andExpect(jsonPath("$.lastYear").value(2025))
                .andExpect(jsonPath("$.years").value(98))
                .andExpect(jsonPath("$.source", containsString("Damodaran")))
                .andExpect(jsonPath("$.realStocks.worstYear").value(1931))
                .andExpect(jsonPath("$.yearly", hasSize(98)))
                .andExpect(jsonPath("$.yearly[0].year").value(1928));
    }
}
