"""The FastAPI app: receives HTTP requests and hands plain numbers to the engine."""

from fastapi import FastAPI

from api.schemas import FeeRequest, FeeResponse
from engine.fees import compare_fees

app = FastAPI(title="Stay the Course API")


@app.post("/fees")
def calculate_fees(request: FeeRequest) -> FeeResponse:
    result = compare_fees(
        initial=request.initial,
        annual_return=request.annual_return,
        fund_fee=request.fund_fee,
        baseline_fee=request.baseline_fee,
        years=request.years,
    )
    return FeeResponse(
        fund_balances=result.fund_balances,
        baseline_balances=result.baseline_balances,
        fee_cost=result.fee_cost,
    )
