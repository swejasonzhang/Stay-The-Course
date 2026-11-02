# 4. Data and Athena

Files: [`data/historical-returns.csv`](../data/historical-returns.csv), [`data/scripts/extract_returns.py`](../data/scripts/extract_returns.py), [`data/athena/`](../data/athena/)

## Where the numbers come from

**Source:** Aswath Damodaran (NYU Stern), *Historical Returns on Stocks, Bonds and Bills*, the `histretSP.xls` spreadsheet, updated January 5, 2026. It's a widely cited, free dataset of yearly US returns since 1928.

| Column in our CSV | Meaning | Source column |
|---|---|---|
| `year` | 1928 … 2025 (98 years) | Year |
| `stocks` | S&P 500 total return, **including dividends** | S&P 500 (includes dividends) |
| `bonds` | 10-year US Treasury bond total return | US T. Bond (10-year) |
| `bills` | 3-month Treasury bill return (kept for future use) | 3-month T.Bill |
| `inflation` | Consumer price inflation | Inflation Rate |

All values are **nominal decimals**: 0.4381 means the S&P 500 returned 43.81% in 1928, before inflation.

## How the CSV was built

[`extract_returns.py`](../data/scripts/extract_returns.py) reads the spreadsheet's "Returns by year" sheet, finds the columns by their header text (not by position, so a moved column can't silently shift the data), and writes the CSV.

It also **checks itself**: for every year it computes the real return, (1 + nominal) / (1 + inflation) − 1, and compares it with the real-return columns Damodaran publishes in the same sheet. If any year differs by more than 0.000000001, the script stops. All 98 years matched, which proves the right columns were picked.

```
uv run --no-project --with xlrd python data/scripts/extract_returns.py path/to/histretSP.xls
```

## One copy, used three ways

```
data/historical-returns.csv
   ├── Maven copies it into the backend jar  → the simulator replays it, /assumptions summarizes it
   ├── deploy.sh uploads it to S3            → Athena queries it with SQL
   └── it's in the repo                      → anyone can see exactly what data the app uses
```

## Real vs nominal

A **nominal** return is what the statement shows. A **real** return removes inflation: what the money could actually buy.

> 1974: stocks −25.9% nominal, inflation 12.3%, so real = (1 − 0.259) / (1 + 0.123) − 1 ≈ **−34%**.

The simulator uses real returns so that every amount it shows is in **today's dollars**. "You'll have $900,000" means $900,000 of today's buying power.

## What the data says (real returns, 1928–2025)

| | Stocks | Bonds |
|---|---|---|
| Average yearly return | 8.6% | 1.8% |
| Compounded yearly return | 6.8% | 1.5% |
| Volatility (standard deviation) | 19.3% | 8.9% |
| Worst year | 1931: −38.1% | 2022: −22.8% |
| Best year | 1954: +53.7% | 1982: +27.9% |

Average inflation: 3.1% a year. Stock–bond correlation: 0.09 (nearly unrelated overall).

## Athena: SQL over files in S3

**Athena** runs SQL directly on files sitting in S3. There's no database server to run; you pay per amount of data scanned (our file is a few kilobytes). **AWS Glue Data Catalog** stores the table definition Athena needs: column names, types and where the file lives. In MongoDB terms, it's like running an aggregation pipeline over a CSV file without importing it first.

The table (defined in [`infra/template.yaml`](../infra/template.yaml) as `ReturnsTable`):

| Setting | Value |
|---|---|
| Database / table | `stay_the_course.historical_returns` |
| Location | `s3://<data bucket>/historical-returns/` |
| Format | CSV (comma-delimited), header line skipped |
| Columns | `year int, stocks double, bonds double, bills double, inflation double` |

**Athena runs ahead of time, not per request.** A query takes seconds, because Athena is built for analyzing large amounts of data, not for answering clicks. The live API never calls Athena; it reads the same CSV from inside its jar. Athena is the analysis tool: for exploring the data, checking the app's numbers independently, and answering questions the app doesn't.

### The queries ([`data/athena/`](../data/athena/), also saved in Athena as named queries)

**1. `01_summary.sql`: averages, compounding, volatility, correlation.** The results match `GET /assumptions` to every digit shown (8.61%, 6.78%, 19.3%, correlation 0.091), which double-checks the Java statistics with a completely separate implementation.

SQL has no "multiply all the rows" function, so the compounded return uses a logarithm trick: adding logs is the same as multiplying the numbers.

```sql
EXP(AVG(LN(1 + real_stocks))) - 1 AS stocks_compounded
```

**2. `02_worst_decades.sql`: the worst 10-year stretches for a 60/40 portfolio.** A **window function** (`OVER (ORDER BY year ROWS BETWEEN 9 PRECEDING AND CURRENT ROW)`) looks at each year plus the 9 before it. Result:

| Period | Yearly real return |
|---|---|
| 1972–1981 | −2.7% |
| 1965–1974 | −2.6% |
| 1969–1978 | −2.3% |

Every one of the worst stretches falls in the **high-inflation era of 1965–1982**, when stocks and bonds were both hurt by inflation. This is the "sequence of returns" risk retirees fear, and it's why the dynamic spending rule's ability to cut back matters.

**3. `03_worst_years.sql`: the worst years for stocks, and what bonds did.**

| Year | Stocks (real) | Bonds (real) |
|---|---|---|
| 1931 | −38.1% | +7.5% |
| 1937 | −37.1% | −1.4% |
| 2008 | −36.6% | +20.0% |
| 1974 | −34.0% | −9.2% |
| 2022 | −23.0% | −22.8% |

Bonds cushioned the 1931 and 2008 crashes but not 2022, when rising inflation and interest rates hit both at once. That's why the correlation over the whole period (0.09) hides big differences between eras.

### How the queries were tested

Athena runs on AWS, but the same SQL runs locally in DuckDB (a small analytics database) against the same CSV. All three queries were run that way before being added to the template, and the template itself passes `cfn-lint`, AWS's CloudFormation checker.

### Running them on AWS (after deploying)

1. Open the **Athena** console and pick the **stay-the-course** workgroup.
2. Under **Saved queries**, open `real-return-summary`, `worst-decades-60-40` or `worst-stock-years`.
3. Click **Run**. Results also land in `s3://<data bucket>/athena-results/`, which deletes them after 30 days. The workgroup refuses any query that would scan more than 10 MB, so a mistake can't cost much.

## Key facts

- Data: Damodaran (NYU Stern), 1928–2025, S&P 500 with dividends, 10-year Treasuries, inflation.
- The extraction script **cross-checks** real returns against Damodaran's own columns.
- **Real** = (1 + nominal) / (1 + inflation) − 1; the simulator works in real terms (today's dollars).
- **Athena** = SQL directly over files in S3; Glue stores the table definition; it's an analysis tool, **not** in the request path.
- The SQL summary **matches the Java numbers**; the worst decades were the 1965–1982 inflation era.
