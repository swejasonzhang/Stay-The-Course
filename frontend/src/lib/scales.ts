// Round axis ticks (0, 1M, 2M... rather than 1.4M, 2.9M...) so charts are easy to read.

// The nearest "nice" step at or above a rough step: 1, 2, 2.5 or 5 times a power of 10.
export function niceStep(rough: number): number {
  if (rough <= 0 || !Number.isFinite(rough)) {
    return 1;
  }
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const residual = rough / magnitude;
  const nice = residual <= 1 ? 1 : residual <= 2 ? 2 : residual <= 2.5 ? 2.5 : residual <= 5 ? 5 : 10;
  return nice * magnitude;
}

// An axis range that covers min..max, starts and ends on a round step, with about `count` gaps.
export function niceScale(min: number, max: number, count = 4): { domain: [number, number]; ticks: number[] } {
  const step = niceStep((max - min) / count);
  // Rounded to 10 places, because 3 x 0.2 is 0.6000000000000001 in floating point.
  const low = Number((Math.floor(min / step) * step).toFixed(10));
  const high = Number((Math.ceil(max / step) * step).toFixed(10));
  const ticks: number[] = [];
  for (let value = low; value <= high + step / 2; value += step) {
    ticks.push(Number(value.toFixed(10)));
  }
  return { domain: [low, high], ticks };
}

// Year labels every 1, 5 or 10 years depending on the span, always including the last year.
export function yearTicks(first: number, last: number): number[] {
  const span = last - first;
  const step = span <= 10 ? 1 : span <= 40 ? 5 : 10;
  const ticks: number[] = [];
  for (let year = Math.ceil(first / step) * step; year <= last; year += step) {
    ticks.push(year);
  }
  if (ticks[0] !== first) {
    ticks.unshift(first);
  }
  if (ticks[ticks.length - 1] !== last) {
    ticks.push(last);
  }
  return ticks;
}
