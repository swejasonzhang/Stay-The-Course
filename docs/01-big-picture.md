# 1. The big picture

## What the app does

Stay the Course is a portfolio checkup built around four investing principles: **Goals, Balance, Cost and Discipline**. Each tab in the app turns one of them into something you can measure.

| Tab | Principle | Question it answers | Endpoint |
|---|---|---|---|
| Cost | Cost | "What does my fund's fee cost me over the years?" | `POST /fees` |
| Goals | Goals | "Will my savings last through retirement?" | `POST /simulate` |
| Balance & Discipline | Balance, Discipline | "Has my mix drifted from my target, and how do I fix it?" | `POST /portfolio` |
| Assumptions | (transparency) | "What history is the simulator based on?" | `GET /assumptions` |

## The pieces

```
Browser (React app)
   │  HTTP request with JSON  ──▶  backend checks it, does the math, answers with JSON
   ▼
Backend (Java + Spring Boot)
   ├── api      receives requests, checks them, sends responses        (the "waiter")
   ├── engine   all the finance math, nothing else                     (the "kitchen")
   ├── data     loads the 1928–2025 market history once, at startup
   └── config   settings, such as which websites may call the API (CORS)
```

Locally, the frontend runs on `http://localhost:5173` and the backend on `http://localhost:8080`. On AWS, the frontend is served by CloudFront from S3, and the backend runs on Lambda behind API Gateway (see [AWS deployment](06-aws.md)).

### The layers and their one job each

| Layer | Folder | Its one job | What it never does |
|---|---|---|---|
| Frontend | `frontend/` | Collect inputs, draw charts | Math |
| API | `backend/.../api/` | Receive requests, check them, call the engine, send JSON back | Math |
| Engine | `backend/.../engine/` | The math | Anything about the web |
| Data | `backend/.../data/` | Read the history file once | Math |

**The rule that holds it together:** the `api` package uses the `engine`, and the `engine` never imports anything from `api`, `data` or Spring. Because the engine has no web code in it:
- **tests call it directly**, so when a test fails, the bug has to be in the math;
- **it's reusable**: the retirement simulator and its tests use it without going through HTTP.

## How the parts talk to each other

There are two very different kinds of connection, and interviewers like to ask about both.

1. **Browser ↔ API: over the network.** The browser sends an HTTP request with a JSON body; the API answers with JSON and a status code. They can be on different computers. Because the site and the API are on different **origins** (different domain or port), the browser only allows it because the API says so (that's **CORS**, see [the API guide](03-api.md#cors-which-websites-may-call-the-api)).
2. **API ↔ engine: a plain method call** inside the same running Java program, like calling a function you imported in Node. No network, no JSON. The controller passes plain numbers to, for example, `FeeCalculator.compareFees(...)` and gets a result object back.

## One request's journey

Here is `POST /fees`, step by step. The other three endpoints follow the same path with different classes.

| Step | What happens | Who does it | MERN equivalent |
|---|---|---|---|
| 1 | Tomcat, the web server inside Spring Boot, receives the request | Library | The server `app.listen()` starts |
| 2 | DispatcherServlet finds the method for `POST /fees` | Spring | Express route matching |
| 3 | Jackson turns the JSON text into a `FeeRequest` object | Library | `express.json()` / `JSON.parse` |
| 4 | Bean Validation checks every rule on `FeeRequest` | Library, switched on by `@Valid` | Joi / express-validator |
| 4b | If step 3 failed → **400**. If step 4 failed → **422**. Steps 5–7 never run | `ApiErrorHandler` (ours) | Error middleware |
| 5 | `FeeController.calculateFees()` pulls out the numbers and calls the engine | Ours | Your route handler |
| 6 | `FeeCalculator.compareFees()` does the math | Ours | A function you imported |
| 7 | The result is copied into a `FeeResponse`, Jackson turns it into JSON, status **200** | Ours + library | `res.json()` |

### The two checkpoints (400 vs 422)

Think of a clerk taking a paper form:

| Checkpoint | Question | Fails when | Status |
|---|---|---|---|
| 1. Reading (Jackson) | "Can I even read this?" | Not JSON, or a value of the wrong type (`"years": 30.5`, `"assetClass": "CRYPTO"`) | **400** |
| 2. Rules (`@Valid`) | "Does every field follow its rules?" | A value is missing or out of range (`"years": 101`) | **422**, naming each bad field |

Codes starting with **4** mean the sender made a mistake. **500** would mean our code crashed. **200** means it all worked.

## Ideas behind the design

**Separation of concerns.** Each layer has one job (above). You can change how requests look without touching the math, and vice versa.

**Pure functions.** Every engine method takes numbers in and gives numbers out. It doesn't read files, call the network or remember anything. Same inputs, same outputs, every time. That's what makes the math easy to test.

**Stateless.** The app remembers nothing between requests. Every request carries everything it needs. That gives three things:
- requests can't interfere with each other;
- you can run many copies of the app and any copy can answer any request (that's how apps scale, and it's what AWS Lambda does automatically);
- nothing is lost if a copy is stopped.

**Many requests at once (threads).** The web server runs each request on its own **thread**, a separate line of work running at the same time. Spring creates **one** object of each controller and every thread shares it. That's safe because the controllers store no data of their own; every value lives in **local variables**, and each thread has its own copy. The one piece of shared data, the market history list, is created once and can't be changed (`List.copyOf`), so sharing it is safe too. If a controller had a field that every request wrote to, two requests could overwrite each other's values: a **race condition**.

**Check at the door.** The API checks input before anything else runs. The engine keeps its own simple guards (`throw new IllegalArgumentException(...)`) for code that calls it directly, like the tests.

## Repository layout

```
backend/                  Java + Spring Boot API (Maven)
  src/main/java/com/staythecourse/
    StayTheCourseApplication.java   starts the app
    api/        controllers, request/response records, ApiErrorHandler
    engine/     the finance math (no Spring)
    data/       loads historical-returns.csv
    config/     CORS settings
  src/test/java/...                 tests, mirroring the folders above
frontend/                 React + TypeScript app (Vite)
  src/api/        API client and TypeScript types for every request/response
  src/features/   one folder per tab
  src/components/ shared pieces: inputs, stat tiles, chart frame, tooltip
  src/lib/        formatting, form helpers, axis scales, the request hook
data/
  historical-returns.csv    1928–2025 returns (the one copy of the data)
  scripts/extract_returns.py  rebuilds the CSV from the source spreadsheet
  athena/*.sql              analysis queries run in AWS Athena
infra/                    AWS: CloudFormation template + deploy/destroy scripts
docs/                     these guides
DECISIONS.md              why each design choice was made
```

## What's honestly missing

| Gap | Why it's fine for now | What you'd do |
|---|---|---|
| No user accounts or saved portfolios | No personal data is stored | Add sign-in (e.g. Amazon Cognito) and a database once data must be kept |
| No database | Nothing needs saving between requests | DynamoDB or PostgreSQL when it does |
| Money stored as `double` | Projections built on assumed returns; a billionth of a cent doesn't matter | `BigDecimal` for real account balances |
| The simulator treats each year as independent | Keeps the model simple and explainable | A "block bootstrap" that samples multi-year stretches, so streaks like the 1970s stay together |
| No real fund database | Users type in their own funds and fees | Load fund data from a provider |

## Key facts

- Four tabs, four endpoints: `POST /fees`, `POST /simulate`, `POST /portfolio`, `GET /assumptions`.
- Browser ↔ API is **HTTP with JSON** (allowed across origins by **CORS**); API ↔ engine is a **plain method call**.
- The **engine has no web code**, so it's testable on its own and reusable.
- **Checkpoint 1 (reading) → 400; checkpoint 2 (rules) → 422; success → 200; our crash → 500.**
- **Stateless + no fields in controllers** = safe with many threads and easy to scale.
