"""The JSON shapes the API accepts and returns.

These models are the contract with the frontend. The engine never sees them:
routes pull plain numbers out of a request before calling the engine.
"""

from pydantic import BaseModel, Field


class FeeRequest(BaseModel):
    initial: float = Field(ge=0, le=1_000_000_000, description="Starting balance in dollars")
    annual_return: float = Field(
        gt=-1, le=1, description="Yearly return as a decimal: 0.07 means 7%"
    )
    fund_fee: float = Field(
        ge=0, le=0.1, description="Your fund's expense ratio as a decimal: 0.01 means 1%"
    )
    baseline_fee: float = Field(
        ge=0, le=0.1, description="Low-cost fund to compare against: 0.0004 means 0.04%"
    )
    years: int = Field(ge=0, le=100, description="How many years to project")


class FeeResponse(BaseModel):
    fund_balances: list[float]
    baseline_balances: list[float]
    fee_cost: float
