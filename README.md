# Stay the Course

A portfolio checkup built on Vanguard's four Principles for Investing Success: **Goals, Balance, Cost and Discipline**. Each part of the app turns one principle into something you can measure.

Named after *Stay the Course*, the memoir of Vanguard founder Jack Bogle.

## Features

| Principle | Feature | What it shows |
|---|---|---|
| Cost | Fee drag | How much an expense ratio costs over decades, compared with a low-cost index fund |
| Goals | Retirement simulator | Replays real market years from 1928–2025 thousands of times and reports the chance your savings last, comparing the classic 4% rule with Vanguard's dynamic spending rule |
| Balance + Discipline | Portfolio checkup and rebalancer | Your mix vs your target, your average fee, and a plan that puts new money into underweight assets first and sells only if needed |
| — | Assumptions | The historical returns behind the simulator: averages, volatility, worst years |

## How it works

```
Browser (React + TypeScript)
    │  JSON over HTTPS
API (Spring Boot)        checks every request, calls the engine
    │  plain method calls
Engine (plain Java)      all the finance math, heavily tested
    │
Data                     1928–2025 returns (Aswath Damodaran, NYU Stern)
```

All the finance math lives in the engine as pure functions, with no HTTP, files, database or Spring, so every formula can be tested on its own.

### Follow a request through the code

What happens when the frontend sends `POST /fees`. The other endpoints (`POST /simulate`, `POST /portfolio`, `GET /assumptions`) follow the same path.

| Step | File | What happens |
|---|---|---|
| 1 | [`api/FeeController.java`](backend/src/main/java/com/staythecourse/api/FeeController.java) | Spring matches `POST /fees` to `calculateFees()` |
| 2 | [`api/FeeRequest.java`](backend/src/main/java/com/staythecourse/api/FeeRequest.java) | The JSON body becomes a `FeeRequest` and is checked against its rules |
| 2b | [`api/ApiErrorHandler.java`](backend/src/main/java/com/staythecourse/api/ApiErrorHandler.java) | Only if step 2 fails: sends a 400 (unreadable body) or 422 (a rule broke), and nothing below runs |
| 3 | [`api/FeeController.java`](backend/src/main/java/com/staythecourse/api/FeeController.java) | `calculateFees()` pulls out the numbers and calls the engine |
| 4 | [`engine/FeeCalculator.java`](backend/src/main/java/com/staythecourse/engine/FeeCalculator.java) | Projects the balance under both fees, year by year |
| 5 | [`engine/FeeComparison.java`](backend/src/main/java/com/staythecourse/engine/FeeComparison.java) | Holds the engine's result |
| 6 | [`api/FeeResponse.java`](backend/src/main/java/com/staythecourse/api/FeeResponse.java) | The result is copied into the response and sent back as JSON with a 200 |

## Documentation

The [`docs/`](docs/) folder explains every part of the project in plain English: [the big picture](docs/01-big-picture.md), [the engine](docs/02-engine.md), [the API](docs/03-api.md), [data and Athena](docs/04-data-and-athena.md), [the frontend](docs/05-frontend.md), [AWS deployment](docs/06-aws.md), [testing](docs/07-testing.md), [design questions](docs/08-faq.md) and a [glossary](docs/glossary.md). Every design choice, with what was rejected and why, is in [DECISIONS.md](DECISIONS.md).

## Tech stack

- **Backend:** Java 21, Spring Boot 4, Bean Validation, Maven
- **Frontend:** Vite, React 19, TypeScript, Recharts
- **Tests:** JUnit 6 and MockMvc (56), Vitest (13)
- **AWS:** API Gateway, Lambda (with the Lambda Web Adapter), S3, CloudFront, Athena + Glue, IAM, CloudFormation

## Project structure

```
backend/      Spring Boot API: api/, engine/, data/, config/ (+ tests mirroring them)
frontend/     React app: api/, components/, features/ (one folder per tab), lib/
data/         historical-returns.csv, the script that builds it, and Athena SQL
infra/        CloudFormation template, deploy.sh, destroy.sh, run.sh
docs/         how everything works
DECISIONS.md  why it's built this way
```

## Running locally

Requires Java 21 and Node 20+.

```bash
# Terminal 1: the API on http://localhost:8080
cd backend
./mvnw spring-boot:run

# Terminal 2: the website on http://localhost:5173
cd frontend
npm install
npm run dev
```

Tests: `./mvnw test` in `backend/`, `npm test` in `frontend/`.

Try the API directly:

```bash
curl -X POST http://localhost:8080/fees \
  -H 'Content-Type: application/json' \
  -d '{"initial": 10000, "annualReturn": 0.07, "fundFee": 0.01, "baselineFee": 0.0004, "years": 30}'
```

## Deploying to AWS

After signing in with `aws login`, run `./infra/deploy.sh`. It builds both apps, deploys the CloudFormation stack, uploads the data and the website, and prints the site URL. `./infra/destroy.sh` removes everything. See [docs/06-aws.md](docs/06-aws.md).

## Data

Historical returns on stocks (S&P 500 with dividends), 10-year Treasury bonds and inflation, 1928–2025, from Aswath Damodaran, NYU Stern School of Business. See [data/README.md](data/README.md).

## Disclaimer

This is an educational project, not investment advice. It is not affiliated with or endorsed by Vanguard.
