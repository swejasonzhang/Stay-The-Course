# Stay the Course

A portfolio checkup built on Vanguard's four Principles for Investing Success: **Goals, Balance, Cost and Discipline**. Each part of the app turns one principle into something you can measure.

> **Status:** in progress (started October 2026). The fee engine and its API endpoint work; the other features are next.

Named after *Stay the Course*, the memoir of Vanguard founder Jack Bogle.

## Features

| Principle | Feature | What it shows | Status |
|---|---|---|---|
| Cost | Fee drag | How much an expense ratio costs over decades, compared with a low-cost index fund | API done, frontend next |
| Goals | Retirement simulator | Runs thousands of possible market futures (Monte Carlo) and reports the odds your savings last | Planned |
| Balance + Discipline | Portfolio checkup and rebalancer | Breaks your holdings into an asset mix, flags drift from your target, and suggests trades, putting new money into underweight assets first so you sell less | Planned |

**Stretch goal:** compare the classic 4% withdrawal rule with Vanguard's dynamic spending rule, which limits how much yearly spending can rise or fall.

## How it works

```
Frontend   React + TypeScript: forms and charts
    │ JSON
API        Spring Boot: checks requests, calls the engine
    │
Engine     Plain Java classes: all the finance math, heavily tested
    │
Data       Fund info file + historical returns
```

All the finance math lives in the engine as pure functions, with no HTTP, files, database or Spring, so every formula can be tested on its own.

### Follow a request through the code

What happens when the frontend sends `POST /fees`, file by file. Every source file starts with a comment showing this same path.

| Step | File | What happens |
|---|---|---|
| Startup | [`StayTheCourseApplication.java`](backend/src/main/java/com/staythecourse/StayTheCourseApplication.java) | Starts Spring and the web server once |
| 1 | [`api/FeeController.java`](backend/src/main/java/com/staythecourse/api/FeeController.java) | Spring matches `POST /fees` to `calculateFees()` |
| 2 | [`api/FeeRequest.java`](backend/src/main/java/com/staythecourse/api/FeeRequest.java) | The JSON body becomes a `FeeRequest` and is checked against its rules |
| 2b | [`api/ApiErrorHandler.java`](backend/src/main/java/com/staythecourse/api/ApiErrorHandler.java) | Only if step 2 fails: sends a 400 (unreadable body) or 422 (a rule broke), and nothing below runs |
| 3 | [`api/FeeController.java`](backend/src/main/java/com/staythecourse/api/FeeController.java) | `calculateFees()` pulls out the numbers and calls the engine |
| 4 | [`engine/FeeCalculator.java`](backend/src/main/java/com/staythecourse/engine/FeeCalculator.java) | Projects the balance under both fees, year by year |
| 5 | [`engine/FeeComparison.java`](backend/src/main/java/com/staythecourse/engine/FeeComparison.java) | Holds the engine's result |
| 6 | [`api/FeeResponse.java`](backend/src/main/java/com/staythecourse/api/FeeResponse.java) | The result is copied into the response and sent back as JSON with a 200 |

## Tech stack

- **Backend:** Java 21, Spring Boot 4, Bean Validation
- **Tests:** JUnit 6, MockMvc
- **Build:** Maven (through the included `mvnw` wrapper)
- **Frontend:** Vite, React, TypeScript, Recharts

## Deployment on AWS (planned)

```
Browser ──HTTPS──▶ API Gateway ──▶ Lambda (Spring Boot) ──▶ engine
   ▲                                      │ reads return assumptions
   │ website files                        ▼
 S3 + CloudFront                    S3 data files ◀── Athena (SQL over S3)
```

| Service | Job |
|---|---|
| **API Gateway** | Public HTTPS URL that receives requests and passes them to Lambda |
| **Lambda** | Runs the Spring Boot app only when a request arrives |
| **S3** | Stores the built frontend, plus data files: historical annual returns and the fund list |
| **Athena** | Runs SQL over the returns data in S3 to work out average returns and volatility for the Monte Carlo simulator. It runs ahead of time, not on each request |
| **CloudFront** | Serves the frontend over HTTPS |
| **IAM** | Permissions: each piece can reach only what it needs |

## Project structure

```
backend/
  pom.xml                                    dependencies and build settings
  src/main/java/com/staythecourse/
    StayTheCourseApplication.java            starts the app
    engine/                                  finance math: fees, Monte Carlo, rebalancing
    api/                                     HTTP endpoints, request/response shapes, error handling
  src/main/resources/application.properties  app settings
  src/test/java/com/staythecourse/           tests, mirroring the folders above
frontend/
data/                                        fund info and historical returns
DECISIONS.md
```

## Running locally

Requires Java 21. From `backend/`:

```
./mvnw test                 # run all tests
./mvnw spring-boot:run      # start the API on http://localhost:8080
```

With the API running, try it from another terminal:

```
curl -X POST http://localhost:8080/fees \
  -H 'Content-Type: application/json' \
  -d '{"initial": 10000, "annualReturn": 0.07, "fundFee": 0.01, "baselineFee": 0.0004, "years": 30}'
```

Frontend instructions will be added once it's built.

## Design decisions

Every non-obvious choice, with the alternatives I rejected and the trade-offs, is in [DECISIONS.md](DECISIONS.md).

## Disclaimer

This is an educational project, not investment advice. It is not affiliated with or endorsed by Vanguard.
