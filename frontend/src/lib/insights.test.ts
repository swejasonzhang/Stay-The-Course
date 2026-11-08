import { describe, expect, it } from "vitest";
import type { Allocation, PortfolioResponse } from "../api/types";
import { feeInsight, portfolioInsight } from "./insights";

function allocation(assetClass: Allocation["assetClass"], currentWeight: number, targetWeight: number): Allocation {
  return { assetClass, value: currentWeight * 100_000, currentWeight, targetWeight, drift: currentWeight - targetWeight };
}

const BASE_PORTFOLIO: PortfolioResponse = {
  totalValue: 100_000,
  weightedExpenseRatio: 0.0009,
  annualFees: 90,
  allocations: [
    allocation("US_STOCKS", 0.65, 0.5),
    allocation("INTERNATIONAL_STOCKS", 0.2, 0.3),
    allocation("BONDS", 0.15, 0.2),
    allocation("CASH", 0, 0),
  ],
  largestDrift: 0.15,
  fullRebalanceNeeded: true,
  trades: [
    { assetClass: "US_STOCKS", action: "SELL", amount: 15_000 },
    { assetClass: "INTERNATIONAL_STOCKS", action: "BUY", amount: 10_000 },
    { assetClass: "BONDS", action: "BUY", amount: 5_000 },
  ],
  allocationsAfter: [],
  warnings: [],
};

describe("insights", () => {
  it("states the fee's cost in dollars and as a share of the low-cost result", () => {
    const insight = feeInsight({ fundBalances: [10_000, 57_434.91], baselineBalances: [10_000, 75_273.45], feeCost: 17_838.54 }, 0.01, 0.0004);
    expect(insight.title).toBe("$17,839 lost to fees");
    expect(insight.body).toContain("a 1.00% fee costs $17,839 more than a 0.04% fee: 23.7%");
  });

  it("says when the fund's fee is not higher", () => {
    const insight = feeInsight({ fundBalances: [1, 2], baselineBalances: [1, 2], feeCost: 0 }, 0.0004, 0.0004);
    expect(insight.title).toBe("Your fee is already low");
  });

  it("names the class furthest off target and how much the plan sells", () => {
    const insight = portfolioInsight(BASE_PORTFOLIO, 0.05);
    expect(insight.title).toBe("15.0 pts off target");
    expect(insight.body).toContain("US stocks are 15.0 pts over target");
    expect(insight.body).toContain("sells $15,000");
    expect(insight.body).toContain("0.09%, about $90 a year");
  });

  it("says when no trades are needed", () => {
    const insight = portfolioInsight({ ...BASE_PORTFOLIO, trades: [], fullRebalanceNeeded: false }, 0.05);
    expect(insight.title).toBe("You're on target");
    expect(insight.body).toContain("within 5.0 pts");
  });
});
