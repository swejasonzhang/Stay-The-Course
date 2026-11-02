-- Summary of real (after-inflation) returns, 1928-2025. Should match GET /assumptions.
-- SQL has no "multiply all rows" function, so the compounded return uses logs:
-- EXP(AVG(LN(1 + r))) - 1 is the steady yearly rate that grows $1 the same way.
WITH real_returns AS (
    SELECT
        year,
        (1 + stocks) / (1 + inflation) - 1 AS real_stocks,
        (1 + bonds) / (1 + inflation) - 1 AS real_bonds
    FROM historical_returns
)
SELECT
    COUNT(*) AS years,
    MIN(year) AS first_year,
    MAX(year) AS last_year,
    AVG(real_stocks) AS stocks_average,
    EXP(AVG(LN(1 + real_stocks))) - 1 AS stocks_compounded,
    STDDEV_SAMP(real_stocks) AS stocks_volatility,
    AVG(real_bonds) AS bonds_average,
    EXP(AVG(LN(1 + real_bonds))) - 1 AS bonds_compounded,
    STDDEV_SAMP(real_bonds) AS bonds_volatility,
    CORR(real_stocks, real_bonds) AS stock_bond_correlation
FROM real_returns;
