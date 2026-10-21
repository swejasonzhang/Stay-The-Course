package com.staythecourse;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

// Entry point: starts Spring Boot and its web server on port 8080.
// @SpringBootApplication makes Spring find and create this app's classes, like FeeController.
@SpringBootApplication
public class StayTheCourseApplication {

    public static void main(String[] args) {
        SpringApplication.run(StayTheCourseApplication.class, args);
    }
}
