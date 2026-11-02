package com.staythecourse.engine;

// Everything the retirement simulator needs. Money is in today's dollars; rates are decimals.
public record SimulationInputs(
        double currentBalance,
        double annualContribution,
        int yearsToRetirement,
        int yearsInRetirement,
        double withdrawalRate,
        double stockAllocation,
        double expenseRatio,
        int simulations) {
}
