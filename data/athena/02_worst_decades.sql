-- The ten worst 10-year stretches for a 60% stocks / 40% bonds portfolio, after inflation.
-- A window function (OVER ...) looks at each year plus the 9 before it; the compounded yearly return over
-- those 10 years is EXP(SUM(LN(1 + r)) / 10) - 1. These are the sequences retirees fear most.
WITH portfolio AS (
    SELECT
        year,
        0.6 * ((1 + stocks) / (1 + inflation) - 1)
            + 0.4 * ((1 + bonds) / (1 + inflation) - 1) AS real_return
    FROM historical_returns
),
rolling AS (
    SELECT
        year AS end_year,
        COUNT(*) OVER (ORDER BY year ROWS BETWEEN 9 PRECEDING AND CURRENT ROW) AS years_in_window,
        EXP(SUM(LN(1 + real_return)) OVER (ORDER BY year ROWS BETWEEN 9 PRECEDING AND CURRENT ROW) / 10) - 1 AS yearly_return
    FROM portfolio
)
SELECT end_year - 9 AS start_year, end_year, yearly_return
FROM rolling
WHERE years_in_window = 10
ORDER BY yearly_return
LIMIT 10;
