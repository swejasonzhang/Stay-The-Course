import type {
  AssumptionsResponse,
  FeeRequest,
  FeeResponse,
  PortfolioRequest,
  PortfolioResponse,
  SimulationRequest,
  SimulationResponse,
} from "./types";

// Where the backend lives. Set VITE_API_URL at build time for production; locally it's port 8080.
export const API_URL = (import.meta.env.VITE_API_URL ?? "http://localhost:8080").replace(/\/$/, "");

// Every failed request becomes an ApiError. For a 422, fieldErrors maps each bad field
// (e.g. "years" or "holdings[0].value") to the backend's message, so the form can show it in place.
export class ApiError extends Error {
  readonly status: number;
  readonly fieldErrors: Record<string, string>;

  constructor(status: number, message: string, fieldErrors: Record<string, string> = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, init);
  } catch {
    throw new ApiError(0, "Can't reach the API. Is the backend running?");
  }

  const body: unknown = await response.json().catch(() => null);
  if (response.ok) {
    return body as T;
  }
  if (response.status === 422 && body && typeof body === "object") {
    throw new ApiError(422, "Some values are out of range.", body as Record<string, string>);
  }
  const message =
    body && typeof body === "object" && "error" in body ? String(body.error) : `Request failed (HTTP ${response.status}).`;
  throw new ApiError(response.status, message);
}

function postJson<T>(path: string, payload: unknown): Promise<T> {
  return request<T>(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export const api = {
  fees: (payload: FeeRequest) => postJson<FeeResponse>("/fees", payload),
  simulate: (payload: SimulationRequest) => postJson<SimulationResponse>("/simulate", payload),
  portfolio: (payload: PortfolioRequest) => postJson<PortfolioResponse>("/portfolio", payload),
  assumptions: () => request<AssumptionsResponse>("/assumptions"),
};
