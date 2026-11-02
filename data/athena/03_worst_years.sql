-- The ten worst single years for stocks after inflation, with what bonds did the same year.
-- Shows when bonds cushioned a stock crash (1931, 2008) and when they didn't (2022).
SELECT
    year,
    (1 + stocks) / (1 + inflation) - 1 AS real_stocks,
    (1 + bonds) / (1 + inflation) - 1 AS real_bonds,
    inflation
FROM historical_returns
ORDER BY real_stocks
LIMIT 10;
