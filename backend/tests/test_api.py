import pytest
from fastapi.testclient import TestClient

from api.main import app

client = TestClient(app)

VALID_REQUEST = {
    "initial": 10_000,
    "annual_return": 0.07,
    "fund_fee": 0.01,
    "baseline_fee": 0.0004,
    "years": 30,
}


def test_valid_request_returns_both_projections_and_the_cost():
    response = client.post("/fees", json=VALID_REQUEST)

    assert response.status_code == 200
    body = response.json()
    assert len(body["fund_balances"]) == 31
    assert len(body["baseline_balances"]) == 31
    assert body["fee_cost"] == pytest.approx(17_838.54, abs=0.02)


def test_missing_fields_are_rejected():
    response = client.post("/fees", json={"initial": 10_000})
    assert response.status_code == 422


@pytest.mark.parametrize(
    ("field", "bad_value"),
    [
        ("annual_return", 7),  # 7 instead of 0.07: a percent sent as a whole number
        ("fund_fee", 1),  # 1 instead of 0.01
        ("years", -1),
        ("years", 1_000),  # too many years to project
        ("initial", -5),
    ],
)
def test_out_of_range_values_are_rejected(field, bad_value):
    response = client.post("/fees", json={**VALID_REQUEST, field: bad_value})
    assert response.status_code == 422
