package com.staythecourse;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;

// Starts the whole app; fails if Spring can't start (e.g. two methods claim the same URL).
@SpringBootTest
class StayTheCourseApplicationTests {

    @Test
    void contextLoads() {
    }
}
