"""Fee drag: how an expense ratio shrinks a balance over time.

Everything here is pure: numbers in, numbers out, with no HTTP, files
or database.
"""

from dataclasses import dataclass


def project_balances(
    *,
    initial: float,
    annual_return: float,
    expense_ratio: float,
    years: int,
) -> list[float]:
    """Return the balance at the start and at the end of each year.

    Rates are decimals: 7% is 0.07 and a 0.04% expense ratio is 0.0004.
    Each year the fee is subtracted from the return, so the balance is
    multiplied by (1 + annual_return - expense_ratio).

    The list has years + 1 entries: index 0 is the starting balance and
    index n is the balance after n years.
    """
    if years < 0:
        raise ValueError("years must be 0 or more")
    if initial < 0:
        raise ValueError("initial must be 0 or more")
    if expense_ratio < 0:
        raise ValueError("expense_ratio must be 0 or more")

    growth = 1 + annual_return - expense_ratio
    balances = [initial]
    for _ in range(years):
        balances.append(balances[-1] * growth)
    return balances


@dataclass
class FeeComparison:
    """The same investment projected under two fees."""

    fund_balances: list[float]
    baseline_balances: list[float]
    fee_cost: float


def compare_fees(
    *,
    initial: float,
    annual_return: float,
    fund_fee: float,
    baseline_fee: float,
    years: int,
) -> FeeComparison:
    """Project the investment under fund_fee and under baseline_fee.

    fee_cost is the dollars lost after `years` by paying fund_fee
    instead of baseline_fee.
    """
    fund_balances = project_balances(
        initial=initial, annual_return=annual_return, expense_ratio=fund_fee, years=years
    )
    baseline_balances = project_balances(
        initial=initial, annual_return=annual_return, expense_ratio=baseline_fee, years=years
    )
    return FeeComparison(
        fund_balances=fund_balances,
        baseline_balances=baseline_balances,
        fee_cost=baseline_balances[-1] - fund_balances[-1],
    )
