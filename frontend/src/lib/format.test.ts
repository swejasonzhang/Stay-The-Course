import { describe, expect, it } from "vitest";
import { friendlyError, percentToDecimal, toNumber } from "./forms";
import { assetClassName, formatCompactDollars, formatDollars, formatPercent, formatPoints } from "./format";

describe("formatting", () => {
  it("formats dollars, compact dollars and percents", () => {
    expect(formatDollars(17838.54)).toBe("$17,839");
    expect(formatCompactDollars(9500)).toBe("$9,500");
    expect(formatCompactDollars(1_250_000)).toBe("$1.3M");
    expect(formatPercent(0.0696)).toBe("7.0%");
    expect(formatPercent(0.0004, 2)).toBe("0.04%");
  });

  it("shows drift as signed percentage points", () => {
    expect(formatPoints(0.15)).toBe("+15.0 pts");
    expect(formatPoints(-0.025)).toBe("−2.5 pts");
    expect(formatPoints(0)).toBe("0.0 pts");
  });

  it("names asset classes for people", () => {
    expect(assetClassName("INTERNATIONAL_STOCKS")).toBe("International stocks");
  });
});

describe("form conversion", () => {
  it("turns percent text into the decimals the API expects", () => {
    expect(percentToDecimal("7")).toBeCloseTo(0.07);
    expect(percentToDecimal("0.04")).toBeCloseTo(0.0004);
  });

  // An empty box must reach the API as null (so it answers "must not be null"), never as 0.
  it("turns an empty box into NaN, which JSON sends as null", () => {
    expect(toNumber("")).toBeNaN();
    expect(JSON.stringify({ years: toNumber("") })).toBe('{"years":null}');
  });

  it("rewrites decimal limits as percents for percent fields", () => {
    expect(friendlyError("must be less than or equal to 0.1", true)).toBe("must be at most 10%");
    expect(friendlyError("must be greater than -1", true)).toBe("must be more than -100%");
    expect(friendlyError("must not be null", true)).toBe("must not be null");
    expect(friendlyError("must be less than or equal to 100", false)).toBe("must be less than or equal to 100");
  });
});
