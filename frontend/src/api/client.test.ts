import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, api } from "./client";

// Replace fetch with a fake that returns the given status and JSON body.
function mockFetch(status: number, body: unknown) {
  vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(body), { status })));
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("api client", () => {
  it("returns the JSON body on success", async () => {
    mockFetch(200, { fundBalances: [1], baselineBalances: [1], feeCost: 0 });
    await expect(api.fees({ initial: 1, annualReturn: 0, fundFee: 0, baselineFee: 0, years: 0 })).resolves.toEqual({
      fundBalances: [1],
      baselineBalances: [1],
      feeCost: 0,
    });
  });

  it("turns a 422 into field errors the form can show in place", async () => {
    mockFetch(422, { years: "must be less than or equal to 100" });
    const error = await api.fees({ initial: 1, annualReturn: 0, fundFee: 0, baselineFee: 0, years: 500 }).catch((e) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(422);
    expect(error.fieldErrors).toEqual({ years: "must be less than or equal to 100" });
  });

  it("uses the backend's message for a 400", async () => {
    mockFetch(400, { error: "Request body must be valid JSON" });
    const error = await api.assumptions().catch((e) => e);
    expect(error.status).toBe(400);
    expect(error.message).toBe("Request body must be valid JSON");
  });

  it("explains when the backend can't be reached", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => {
      throw new TypeError("Failed to fetch");
    }));
    const error = await api.assumptions().catch((e) => e);
    expect(error.status).toBe(0);
    expect(error.message).toMatch(/Can't reach the API/);
  });
});
