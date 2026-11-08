import type { AssumptionsResponse, FeeResponse, PortfolioResponse, SimulationResponse } from "../api/types";
import { assetClassName, formatDollars, formatPercent, formatPoints } from "./format";

// The one-line takeaway shown above each set of results: a short title and a sentence or two.
export interface Insight {
  title: string;
  body: string;
}

export function feeInsight(data: FeeResponse, fundFee: number, baselineFee: number): Insight {
  const years = data.fundBalances.length - 1;
  if (years === 0) {
    return { title: "No years, no cost", body: "Choose at least one year to see what the fee costs." };
  }
  if (data.feeCost <= 0) {
    return {
      title: "Your fee is already low",
      body: `Your fund's fee is no higher than the low-cost fund's, so it costs nothing extra over ${years} years.`,
    };
  }
  const share = data.feeCost / data.baselineBalances[years];
  return {
    title: `${formatDollars(data.feeCost)} lost to fees`,
    body:
      `Over ${years} years, a ${formatPercent(fundFee, 2)} fee costs ${formatDollars(data.feeCost)} more than a `
      + `${formatPercent(baselineFee, 2)} fee: ${formatPercent(share)} of what the low-cost fund would grow to. `
      + "You never see a bill, because the fee comes out of the balance every year.",
  };
}

export function retirementInsight(data: SimulationResponse): Insight {
  const fixed = formatPercent(data.constantSpending.successRate, 0);
  const dynamic = formatPercent(data.dynamicSpending.successRate, 0);
  const worstDynamicFinalYear = data.dynamicSpending.spending.p10[data.dynamicSpending.spending.p10.length - 1];
  return {
    title: `${fixed} vs ${dynamic} chance your money lasts`,
    body:
      `Starting at about ${formatDollars(data.medianFirstYearSpending)} a year, your savings last through retirement `
      + `in ${fixed} of simulated futures with fixed spending and ${dynamic} with dynamic spending. The trade-off: `
      + `in the worst 10% of dynamic-spending futures, the final year's spending is down to `
      + `${formatDollars(worstDynamicFinalYear)}.`,
  };
}

export function portfolioInsight(data: PortfolioResponse, driftThreshold: number): Insight {
  const furthest = data.allocations.reduce((a, b) => (Math.abs(b.drift) > Math.abs(a.drift) ? b : a));
  const direction = furthest.drift > 0 ? "over" : "under";
  const fees = `Your average fee is ${formatPercent(data.weightedExpenseRatio, 2)}, about ${formatDollars(data.annualFees)} a year.`;
  const threshold = formatPoints(driftThreshold).replace("+", "");

  if (data.trades.length === 0) {
    return { title: "You're on target", body: `Every asset class is within ${threshold} of its target. ${fees}` };
  }
  if (!data.fullRebalanceNeeded) {
    return {
      title: "New money gets you back on track",
      body: `Putting your new money into what's underweight brings every asset class within ${threshold}, with nothing sold. ${fees}`,
    };
  }
  const sold = data.trades.filter((t) => t.action === "SELL").reduce((sum, t) => sum + t.amount, 0);
  const gap = formatPoints(Math.abs(furthest.drift)).replace("+", "");
  const verb = furthest.assetClass === "CASH" ? "is" : "are";
  return {
    title: `${gap} off target`,
    body:
      `${assetClassName(furthest.assetClass)} ${verb} ${gap} ${direction} target. New money alone can't fix it, `
      + `so the plan sells ${formatDollars(sold)} to rebalance. ${fees}`,
  };
}

export function assumptionsInsight(data: AssumptionsResponse): Insight {
  return {
    title: `${formatPercent(data.realStocks.compoundReturn)} a year after inflation, with big swings`,
    body:
      `From ${data.firstYear} to ${data.lastYear}, stocks grew ${formatPercent(data.realStocks.compoundReturn)} a year `
      + `after inflation, compounded, but lost as much as ${formatPercent(Math.abs(data.realStocks.worstReturn))} `
      + `in a single year (${data.realStocks.worstYear}). Bonds grew ${formatPercent(data.realBonds.compoundReturn)} `
      + "a year with smaller swings.",
  };
}
