import type { Bands } from "../../api/types";

// One chart row per year: the five percentiles, plus the two ranges the shaded bands are drawn from.
export interface BandRow {
  year: number;
  p10: number;
  p25: number;
  p50: number;
  p75: number;
  p90: number;
  outer: [number, number];
  inner: [number, number];
}

// The API sends five parallel lists (p10[], p25[]...); charts want one object per year.
export function toBandRows(bands: Bands, firstYear = 0): BandRow[] {
  return bands.p50.map((p50, i) => ({
    year: firstYear + i,
    p10: bands.p10[i],
    p25: bands.p25[i],
    p50,
    p75: bands.p75[i],
    p90: bands.p90[i],
    outer: [bands.p10[i], bands.p90[i]],
    inner: [bands.p25[i], bands.p75[i]],
  }));
}
