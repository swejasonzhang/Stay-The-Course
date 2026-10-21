package com.staythecourse.engine;

// Java's built-in list types live in java.util and have to be imported.
import java.util.ArrayList;
import java.util.List;

// =============================================================================
// FeeCalculator: the fee math (the "engine").
//
// Everything here is pure: numbers in, numbers out. No HTTP, no files, no
// database, no Spring. That's why the tests can call it directly, and why the
// Monte Carlo simulator will be able to reuse it.
//
// The one rule that keeps it that way: classes in the engine package never
// import anything from Spring or from the api package. The api package
// imports the engine, never the other way around.
//
// Comments that start with /** are Javadoc, Java's version of a Python
// docstring: they describe what a method does for anyone calling it.
//
// HOW A REQUEST FLOWS THROUGH THE BACKEND  (► = this file)
//
//   At startup (once):
//         StayTheCourseApplication  starts Spring and the web server
//
//   Each POST /fees request:
//         1.  FeeController     Spring matches POST /fees to calculateFees()
//         2.  FeeRequest        the JSON body is turned into a FeeRequest and checked
//         2b. ApiErrorHandler   only if step 2 fails: sends a 400 or 422; 3-6 never run
//         3.  FeeController     calculateFees() runs and calls the engine
//   ►     4.  FeeCalculator     does the math
//         5.  FeeComparison     holds the engine's result
//         6.  FeeResponse       copied from the result, sent back as JSON with a 200
// =============================================================================

// Java has no standalone functions: every function lives inside a class and
// is called a "method". This class is just a container for two methods.
//   public   usable from other packages (FeeController, in the api package)
//   final    no other class can extend this one
public final class FeeCalculator {

    // A constructor nobody can call (private). It stops anyone from writing
    // `new FeeCalculator()`, because there's nothing to create: you call the
    // methods on the class name instead, e.g. FeeCalculator.compareFees(...).
    private FeeCalculator() {
    }

    /**
     * Returns the balance at the start and at the end of each year.
     *
     * <p>Rates are decimals: 7% is 0.07 and a 0.04% expense ratio is 0.0004.
     * Each year the fee is subtracted from the return, so the balance is
     * multiplied by (1 + annualReturn - expenseRatio).
     *
     * <p>The list has years + 1 entries: index 0 is the starting balance and
     * index n is the balance after n years.
     */
    // Reading the first line of the method:
    //   public          callable from other packages
    //   static          called on the class itself: FeeCalculator.projectBalances(...)
    //   List<Double>    what it returns: a list of decimal numbers
    //   double initial  types come BEFORE names (Python writes initial: float)
    // Java's compiler checks every type before the program runs, so passing 30.5
    // for years (an int) won't even compile. Two doubles in the wrong order, such
    // as annualReturn and expenseRatio swapped, DO compile; the tests catch that.
    public static List<Double> projectBalances(
            double initial, double annualReturn, double expenseRatio, int years) {
        // Guards: reject input that makes no sense. `throw new` is Python's
        // `raise`, and IllegalArgumentException is Java's ValueError.
        // HTTP requests can never trigger these, because FeeRequest's rules are
        // stricter. They protect against code that calls the engine directly,
        // like the tests and the future Monte Carlo simulator.
        // annualReturn isn't checked, because losing years are real.
        if (years < 0) {
            throw new IllegalArgumentException("years must be 0 or more");
        }
        if (initial < 0) {
            throw new IllegalArgumentException("initial must be 0 or more");
        }
        if (expenseRatio < 0) {
            throw new IllegalArgumentException("expenseRatio must be 0 or more");
        }

        // How much the balance is multiplied by each year: 1.0696 with a 0.04%
        // fee, 1.06 with a 1% fee. A new variable always states its type first.
        double growth = 1 + annualReturn - expenseRatio;

        // An empty list of decimal numbers.
        //   List (left)        "some kind of list"
        //   ArrayList (right)  the specific kind being created; `new` creates it
        //   <>                 "same element type as the left side"
        // Lists hold Double, the object version of double, because lists can only
        // hold objects. Java converts between double and Double automatically.
        List<Double> balances = new ArrayList<>();

        // Year 0 is today's amount, so index n means "after n years".
        // .add is Python's .append and JS's .push.
        balances.add(initial);

        // The same as a JS for loop. It starts at 1 because year 0 is already in
        // the list, and it runs `years` times.
        for (int year = 1; year <= years; year++) {
            // getLast() is Python's balances[-1]. Each year grows the previous
            // year's balance, which already includes all the earlier growth:
            // that's compounding. It's also why a fee costs so much over time:
            // it's taken out of a bigger balance every year.
            balances.add(balances.getLast() * growth);
        }
        return balances;
    }

    /**
     * Projects the investment under fundFee and under baselineFee.
     *
     * <p>feeCost is the dollars lost after {@code years} by paying fundFee
     * instead of baselineFee.
     */
    public static FeeComparison compareFees(
            double initial, double annualReturn, double fundFee, double baselineFee, int years) {
        // The same investment projected twice, once with each fee.
        List<Double> fundBalances = projectBalances(initial, annualReturn, fundFee, years);
        List<Double> baselineBalances = projectBalances(initial, annualReturn, baselineFee, years);

        // Bundle both lists with the fee's cost: the cheap fund's final balance
        // minus yours. The subtraction is math, so it belongs here in the engine,
        // not in the controller.
        return new FeeComparison(
                fundBalances,
                baselineBalances,
                baselineBalances.getLast() - fundBalances.getLast());
    }
}
