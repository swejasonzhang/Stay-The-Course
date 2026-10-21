package com.staythecourse;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

// =============================================================================
// StayTheCourseApplication: the starting point of the backend.
//
// Running the app runs main() below. That starts Spring Boot, which starts a
// web server (Tomcat) on port 8080 and finds the classes this app is made of.
// MERN equivalent: server.js, where you call express() and app.listen(3000).
//
// HOW A REQUEST FLOWS THROUGH THE BACKEND  (► = this file)
//
//   At startup (once):
//   ►     StayTheCourseApplication  starts Spring and the web server
//
//   Each POST /fees request:
//         1.  FeeController     Spring matches POST /fees to calculateFees()
//         2.  FeeRequest        the JSON body is turned into a FeeRequest and checked
//         2b. ApiErrorHandler   only if step 2 fails: sends a 400 or 422; 3-6 never run
//         3.  FeeController     calculateFees() runs and calls the engine
//         4.  FeeCalculator     does the math
//         5.  FeeComparison     holds the engine's result
//         6.  FeeResponse       copied from the result, sent back as JSON with a 200
// =============================================================================

// @SpringBootApplication is an "annotation": a label starting with @ that tells
// Spring to do something with the code under it. This one switches on Spring
// Boot's automatic setup, and tells Spring to search this package
// (com.staythecourse) and every package inside it for classes it should create
// and manage, such as FeeController and ApiErrorHandler. That's how those
// classes get found without being listed anywhere.
@SpringBootApplication
public class StayTheCourseApplication {

    // main() is where every Java program starts.
    //   public          can be called from outside this class (Java itself calls it)
    //   static          belongs to the class, so no object has to be created first
    //   void            returns nothing
    //   String[] args   command-line arguments as an array of text, e.g. --server.port=9090
    public static void main(String[] args) {
        // Start Spring and the web server. It keeps running until you stop it (Ctrl+C).
        SpringApplication.run(StayTheCourseApplication.class, args);
    }
}
