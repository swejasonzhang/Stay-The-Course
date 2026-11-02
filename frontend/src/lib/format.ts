// Number formatting used everywhere, so every page shows money and percents the same way.

const dollars = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const cents = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 });
const compact = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 1,
});

export function formatDollars(value: number): string {
  return dollars.format(value);
}

export function formatCents(value: number): string {
  return cents.format(value);
}

// For axis ticks and tight spaces: $12K, $1.2M.
export function formatCompactDollars(value: number): string {
  return Math.abs(value) < 10_000 ? dollars.format(value) : compact.format(value);
}

// The API works in decimals (0.07); people read percents (7%).
export function formatPercent(decimal: number, digits = 1): string {
  return `${(decimal * 100).toFixed(digits)}%`.replace("-", "−");
}

// Drift is a difference in percentage points, so it carries a sign: +4.5 pts, -2.0 pts.
export function formatPoints(decimal: number): string {
  const points = decimal * 100;
  const sign = points > 0.05 ? "+" : points < -0.05 ? "−" : "";
  return `${sign}${Math.abs(points).toFixed(1)} pts`;
}

const ASSET_CLASS_NAMES: Record<string, string> = {
  US_STOCKS: "US stocks",
  INTERNATIONAL_STOCKS: "International stocks",
  BONDS: "Bonds",
  CASH: "Cash",
};

export function assetClassName(assetClass: string): string {
  return ASSET_CLASS_NAMES[assetClass] ?? assetClass;
}
