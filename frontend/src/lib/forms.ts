// Turning form text into API values, and API errors back into form-friendly text.

// An empty box becomes NaN, which JSON sends as null, so the backend answers "must not be null"
// instead of the form quietly sending 0.
export function toNumber(text: string): number {
  return text.trim() === "" ? Number.NaN : Number(text);
}

// The form shows percents (7) but the API takes decimals (0.07).
export function percentToDecimal(text: string): number {
  return toNumber(text) / 100;
}

// The backend's limits are in decimals ("must be less than or equal to 0.1"). For a percent field,
// show them as percents instead ("must be at most 10%").
export function friendlyError(message: string | undefined, isPercent = false): string | undefined {
  if (!message || !isPercent) {
    return message;
  }
  const match = message.match(/(less than or equal to|greater than or equal to|greater than|less than) (-?[\d.]+)/);
  if (!match) {
    return message;
  }
  const words: Record<string, string> = {
    "less than or equal to": "at most",
    "greater than or equal to": "at least",
    "greater than": "more than",
    "less than": "less than",
  };
  const percent = Number((Number(match[2]) * 100).toFixed(4));
  return `must be ${words[match[1]]} ${percent}%`;
}
