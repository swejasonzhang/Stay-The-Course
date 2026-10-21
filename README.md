# Stay the Course

A portfolio checkup built on Vanguard's four Principles for Investing Success: **Goals, Balance, Cost and Discipline**. Each part of the app turns one principle into something you can measure.

> **Status:** in progress (started October 2026). The fee engine is being built first.

Named after *Stay the Course*, the memoir of Vanguard founder Jack Bogle.

## Features

| Principle | Feature | What it shows | Status |
|---|---|---|---|
| Cost | Fee drag | How much an expense ratio costs over decades, compared with a low-cost index fund | In progress |
| Goals | Retirement simulator | Runs thousands of possible market futures (Monte Carlo) and reports the odds your savings last | Planned |
| Balance + Discipline | Portfolio checkup and rebalancer | Breaks your holdings into an asset mix, flags drift from your target, and suggests trades, putting new money into underweight assets first so you sell less | Planned |

**Stretch goal:** compare the classic 4% withdrawal rule with Vanguard's dynamic spending rule, which limits how much yearly spending can rise or fall.

## How it works

```
Frontend   React + TypeScript: forms and charts
    │ JSON
API        FastAPI: checks requests, calls the engine
    │
Engine     Pure Python functions: all the finance math, heavily tested
    │
Data       Fund info file + historical returns
```

All the finance math lives in the engine as pure functions, with no HTTP, files or database, so every formula can be tested on its own.

## Tech stack

- **Engine:** Python, NumPy, pytest
- **API:** FastAPI, Pydantic
- **Frontend:** Vite, React, TypeScript, Recharts
- **Tooling:** uv

## Project structure

```
backend/
  engine/    finance math: fees, Monte Carlo, rebalancing
  api/       FastAPI routes and request/response schemas
  tests/
frontend/
data/        fund info and historical returns
DECISIONS.md
```

## Running locally

Requires [uv](https://docs.astral.sh/uv/). To run the engine tests:

```
cd backend
uv run pytest
```

Instructions for the API and frontend will be added as they're built.

## Design decisions

Every non-obvious choice, with the alternatives I rejected and the trade-offs, is in [DECISIONS.md](DECISIONS.md).

## Disclaimer

This is an educational project, not investment advice. It is not affiliated with or endorsed by Vanguard.
