"""Builds data/historical-returns.csv from Aswath Damodaran's histretSP.xls.

Download the spreadsheet from
https://pages.stern.nyu.edu/~adamodar/New_Home_Page/datafile/histretSP.html
then run, from the repo root:

    uv run --no-project --with xlrd python data/scripts/extract_returns.py path/to/histretSP.xls

It also checks our inflation-adjusted (real) returns against the real-return
columns in the same spreadsheet, so a column mix-up fails loudly.
"""

import csv
import sys
from pathlib import Path

import xlrd

SHEET = "Returns by year"
HEADER_ROW = 19
COLUMNS = {
    "year": "Year",
    "stocks": "S&P 500 (includes dividends)",
    "bonds": "US T. Bond (10-year)",
    "bills": "3-month T.Bill",
    "inflation": "Inflation Rate",
}
DAMODARAN_REAL_STOCKS_COLUMN = 21
DAMODARAN_REAL_BONDS_COLUMN = 24


def find_columns(sheet):
    headers = [str(sheet.cell_value(HEADER_ROW, c)).strip() for c in range(sheet.ncols)]
    return {key: headers.index(name) for key, name in COLUMNS.items()}


def main(xls_path):
    sheet = xlrd.open_workbook(xls_path).sheet_by_name(SHEET)
    cols = find_columns(sheet)
    rows = []
    for r in range(HEADER_ROW + 1, sheet.nrows):
        year = sheet.cell_value(r, cols["year"])
        if not isinstance(year, float):
            break
        row = {key: sheet.cell_value(r, c) for key, c in cols.items()}
        row["year"] = int(year)

        for asset, damodaran_col in [("stocks", DAMODARAN_REAL_STOCKS_COLUMN), ("bonds", DAMODARAN_REAL_BONDS_COLUMN)]:
            ours = (1 + row[asset]) / (1 + row["inflation"]) - 1
            theirs = sheet.cell_value(r, damodaran_col)
            if abs(ours - theirs) > 1e-9:
                sys.exit(f"{row['year']} {asset}: real return {ours} doesn't match spreadsheet {theirs}")
        rows.append(row)

    out = Path(__file__).resolve().parent.parent / "historical-returns.csv"
    with out.open("w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(COLUMNS.keys())
        for row in rows:
            writer.writerow([row["year"]] + [f"{row[k]:.10f}" for k in ["stocks", "bonds", "bills", "inflation"]])
    print(f"Wrote {len(rows)} years ({rows[0]['year']}-{rows[-1]['year']}) to {out}")


if __name__ == "__main__":
    main(sys.argv[1])
