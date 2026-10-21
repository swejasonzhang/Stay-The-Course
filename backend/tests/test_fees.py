import pytest

from engine.fees import compare_fees, project_balances


def test_zero_years_returns_only_the_starting_balance():
    balances = project_balances(initial=10_000, annual_return=0.07, expense_ratio=0.0004, years=0)
    assert balances == [10_000]


def test_every_year_matches_the_compound_growth_formula():
    balances = project_balances(initial=10_000, annual_return=0.07, expense_ratio=0.01, years=30)
    assert len(balances) == 31
    for year, balance in enumerate(balances):
        assert balance == pytest.approx(10_000 * (1 + 0.07 - 0.01) ** year)


@pytest.mark.parametrize(
    ("expense_ratio", "expected"),
    [
        (0.0004, 75_273.45),
        (0.01, 57_434.91),
    ],
)
def test_matches_the_hand_calculation(expense_ratio, expected):
    balances = project_balances(
        initial=10_000, annual_return=0.07, expense_ratio=expense_ratio, years=30
    )
    assert balances[-1] == pytest.approx(expected, abs=0.01)


def test_higher_fee_means_lower_balance():
    low_fee = project_balances(initial=10_000, annual_return=0.07, expense_ratio=0.0004, years=30)
    high_fee = project_balances(initial=10_000, annual_return=0.07, expense_ratio=0.01, years=30)
    assert high_fee[-1] < low_fee[-1]


def test_no_return_and_no_fee_keeps_the_balance_flat():
    balances = project_balances(initial=10_000, annual_return=0.0, expense_ratio=0.0, years=5)
    assert balances == [10_000] * 6


def test_rejects_negative_inputs():
    with pytest.raises(ValueError):
        project_balances(initial=10_000, annual_return=0.07, expense_ratio=0.0004, years=-1)
    with pytest.raises(ValueError):
        project_balances(initial=-1, annual_return=0.07, expense_ratio=0.0004, years=30)
    with pytest.raises(ValueError):
        project_balances(initial=10_000, annual_return=0.07, expense_ratio=-0.01, years=30)


def test_compare_fees_returns_both_projections_and_the_gap():
    result = compare_fees(
        initial=10_000, annual_return=0.07, fund_fee=0.01, baseline_fee=0.0004, years=30
    )
    assert result.fund_balances[-1] == pytest.approx(57_434.91, abs=0.01)
    assert result.baseline_balances[-1] == pytest.approx(75_273.45, abs=0.01)
    assert result.fee_cost == pytest.approx(75_273.45 - 57_434.91, abs=0.02)
