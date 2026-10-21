package com.staythecourse;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;

// =============================================================================
// StayTheCourseApplicationTests: checks that the whole app can start.
//
// @SpringBootTest starts the entire application the way main() does, but
// without opening a real port. contextLoads() is empty on purpose: if Spring
// can't start (say, two methods claim the same URL, or a class it needs is
// missing), the test fails before reaching it.
// =============================================================================
@SpringBootTest
class StayTheCourseApplicationTests {

    @Test
    void contextLoads() {
    }
}
