import { describe, expect, it } from "vitest";
import { niceScale, niceStep, yearTicks } from "./scales";

describe("axis scales", () => {
  it("rounds rough steps up to 1, 2, 2.5 or 5 times a power of ten", () => {
    expect(niceStep(0.7)).toBe(1);
    expect(niceStep(1_400_000)).toBe(2_000_000);
    expect(niceStep(230)).toBe(250);
    expect(niceStep(0.184)).toBeCloseTo(0.2);
  });

  it("covers the data with round ticks", () => {
    expect(niceScale(0, 5_700_000)).toEqual({
      domain: [0, 6_000_000],
      ticks: [0, 2_000_000, 4_000_000, 6_000_000],
    });
    expect(niceScale(-0.38, 0.54, 5)).toEqual({ domain: [-0.4, 0.6], ticks: [-0.4, -0.2, 0, 0.2, 0.4, 0.6] });
  });

  it("labels every 5 or 10 years and always shows the first and last", () => {
    expect(yearTicks(0, 30)).toEqual([0, 5, 10, 15, 20, 25, 30]);
    expect(yearTicks(1, 30)).toEqual([1, 5, 10, 15, 20, 25, 30]);
    expect(yearTicks(0, 60)).toEqual([0, 10, 20, 30, 40, 50, 60]);
    expect(yearTicks(0, 7)).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
  });
});
