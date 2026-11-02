// TypeScript copies of the backend's request and response records. Field names must match the
// Java records exactly, because Jackson matches JSON keys to record components by name.

export interface FeeRequest {
  initial: number;
  annualReturn: number;
  fundFee: number;
  baselineFee: number;
  years: number;
}

export interface FeeResponse {
  fundBalances: number[];
  baselineBalances: number[];
  feeCost: number;
}

export interface SimulationRequest {
  currentBalance: number;
  annualContribution: number;
  yearsToRetirement: number;
  yearsInRetirement: number;
  withdrawalRate: number;
  stockAllocation: number;
  expenseRatio: number;
  simulations: number;
  seed?: number;
}

export interface Bands {
  p10: number[];
  p25: number[];
  p50: number[];
  p75: number[];
  p90: number[];
}

export interface RuleResult {
  successRate: number;
  balances: Bands;
  spending: Bands;
  medianEndingBalance: number;
}

export interface SimulationResponse {
  retirementYear: number;
  medianBalanceAtRetirement: number;
  medianFirstYearSpending: number;
  constantSpending: RuleResult;
  dynamicSpending: RuleResult;
}

export type AssetClass = "US_STOCKS" | "INTERNATIONAL_STOCKS" | "BONDS" | "CASH";

export interface Holding {
  name: string;
  assetClass: AssetClass;
  value: number;
  expenseRatio: number;
}

export interface PortfolioRequest {
  holdings: Holding[];
  target: { usStocks: number; internationalStocks: number; bonds: number; cash: number };
  newContribution: number;
  driftThreshold: number;
}

export interface Allocation {
  assetClass: AssetClass;
  value: number;
  currentWeight: number;
  targetWeight: number;
  drift: number;
}

export interface TradeLine {
  assetClass: AssetClass;
  action: "BUY" | "SELL";
  amount: number;
}

export interface PortfolioResponse {
  totalValue: number;
  weightedExpenseRatio: number;
  annualFees: number;
  allocations: Allocation[];
  largestDrift: number;
  fullRebalanceNeeded: boolean;
  trades: TradeLine[];
  allocationsAfter: Allocation[];
  warnings: string[];
}

export interface AssetStats {
  averageReturn: number;
  compoundReturn: number;
  volatility: number;
  worstYear: number;
  worstReturn: number;
  bestYear: number;
  bestReturn: number;
}

export interface YearReturn {
  year: number;
  realStocks: number;
  realBonds: number;
  inflation: number;
}

export interface AssumptionsResponse {
  source: string;
  firstYear: number;
  lastYear: number;
  years: number;
  realStocks: AssetStats;
  realBonds: AssetStats;
  averageInflation: number;
  stockBondCorrelation: number;
  yearly: YearReturn[];
}
