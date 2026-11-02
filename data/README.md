# Data

`historical-returns.csv`: yearly US returns, 1928–2025, as nominal decimals.

| Column | Meaning |
|---|---|
| `year` | Calendar year |
| `stocks` | S&P 500 total return, including dividends |
| `bonds` | 10-year US Treasury bond total return |
| `bills` | 3-month Treasury bill return |
| `inflation` | Consumer price inflation |

**Source:** Aswath Damodaran, NYU Stern School of Business, *Historical Returns on Stocks, Bonds and Bills* (`histretSP.xls`, updated January 5, 2026): https://pages.stern.nyu.edu/~adamodar/New_Home_Page/datafile/histretSP.html

- `scripts/extract_returns.py` rebuilds the CSV from that spreadsheet and checks the real returns against the spreadsheet's own real-return columns.
- `athena/` holds the SQL used to analyze the data in AWS Athena.
- The backend build copies the CSV into the app (see `backend/pom.xml`), and `infra/deploy.sh` uploads it to S3 for Athena.

See [docs/04-data-and-athena.md](../docs/04-data-and-athena.md) for the full explanation.
