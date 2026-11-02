# Design Decisions

The non-obvious choices in Stay the Course: what I chose, why, what I rejected, and what it cost.

---

## 1. Keep the finance math separate from the API
*2026-10-20, updated for Java 2026-10-21*

**Decision**
The backend has two packages. `engine` holds all the finance math as pure functions, with no HTTP, files, database or Spring. `api` is a thin Spring Boot layer that checks each request, calls the engine and returns JSON. Dependencies point one way: `api` imports `engine`, and `engine` never imports anything from Spring or from `api`.

**Why**
- **Testing.** I can call an engine method directly in a test and compare the result with a known formula. If an engine test fails, the bug is in the math, not in the request, the validation or the JSON.
- **Reuse.** If the math lived inside a controller, an HTTP request would be the only way to run it. As its own package, any code can call it: the Monte Carlo simulator's tests compare it directly with the fee engine.
- **Separate reasons to change.** The API changes when the contract with the frontend changes, such as a renamed field or a new error code. The engine changes when the math changes. Keeping them apart means a change to one can't break the other.

**Follow-up: why not test everything through the HTTP layer with MockMvc?**
MockMvc makes endpoint tests cheap, but when one fails, the cause could be a badly built request, a mismatched field name, rejected input, different JSON output or wrong math. So I test each layer on its own. Many fast engine tests check the math against exact numbers, and a few MockMvc tests check the contract: missing fields are rejected and responses have the right shape.

**Rejected alternative**
Writing the math directly inside the controller:

```
Rejected: math inside the controller
  POST /fees:
    read JSON, check fields
    loop 30 years: grow balance, subtract fee
    build JSON response

Chosen: split
  engine/FeeCalculator.java   the fee math (pure functions)
  api/FeeController.java      read JSON, check fields → call the engine → build JSON
```

**Trade-off**
More files, and one more layer to trace through when following a request. For a 20-line script that would be overkill. Here it's worth it because the engine has grown to several modules and carries most of the tests.

---

## 2. Request rules live on the request records in `api`
*2026-10-21, extended 2026-11-02*

**Decision**
The rules for incoming JSON (required fields and allowed ranges) are Bean Validation annotations such as `@NotNull` and `@DecimalMax` on the request records (`FeeRequest`, `SimulationRequest`, `PortfolioRequest`). Rules involving several fields, like a target mix adding up to 100%, use `@AssertTrue` methods. The controller's `@Valid` triggers the check. `ApiErrorHandler` turns failures into JSON errors with two status codes:
- **400** when the body can't be read at all: it isn't JSON, a whole-number field such as `years` got a decimal, or an asset class doesn't exist
- **422** when the JSON was read but a value broke a rule, with each bad field named, including nested ones: `{"holdings[0].value": "must be greater than or equal to 0"}`

`application.properties` turns off Jackson's `accept-float-as-int` setting, so `"years": 30.5` is rejected instead of quietly becoming 30.

**Why**
These rules describe the JSON the frontend sends, which is the API's contract and an HTTP concern. The API also caps values (at most 100 years, 10,000 simulations) so that one public request can't tie up the server. The engine has its own, looser guards for code that calls it directly.

**Rejected alternatives**
- **Annotations on the engine's methods:** the engine would depend on the validation library and on the HTTP contract, which breaks decision 1.
- **Primitive `double` and `int` fields:** a primitive can't be null, so a missing field makes the JSON reader fail with a 400 that doesn't say which field is missing. Boxed `Double` and `Integer` with `@NotNull` give a 422 that names it.

**Trade-off**
Each request record and the engine's inputs list the same values, so adding an input means changing both.

---

## 3. Write the backend in Java with Spring Boot
*2026-10-21 (switched from Python)*

**Decision**
The backend is Java 21 with Spring Boot 4, built with Maven. The first version was Python with FastAPI; it was ported once the fee engine and its endpoint worked. The Python version is still in the git history.

**Why**
Java and Spring Boot are standard for backend services at large financial firms, and that's the stack I want to be fluent in. The project was still small (one engine module and one endpoint), so switching early cost little compared with porting three modules later.

**Rejected alternatives**
- **Keep Python and port only the rebalancer to Java later:** two languages in one backend, and the main version wouldn't be in the language I'm aiming for.
- **Java without Spring Boot:** less going on behind the scenes, but Spring Boot is what most Java backend teams use.

**Trade-off**
Java is wordier than Python, and Spring Boot does a lot through annotations that run code behind the scenes. Spring Boot also starts more slowly than a small script, which matters on AWS Lambda, where a cold start happens on the first request after the function has been idle.

---

## 4. Deploy on AWS with API Gateway, Lambda, S3, CloudFront and Athena
*2026-10-21, updated 2026-11-02 when built*

**Decision**
One CloudFormation template (`infra/template.yaml`) creates everything; `infra/deploy.sh` builds and deploys it.
- **API Gateway (HTTP API) and Lambda** run the backend. The **Lambda Web Adapter** layer starts the Spring Boot jar and forwards each request to it, so the app runs unchanged.
- **S3 and CloudFront** host the built frontend. The bucket is private; only the CloudFront distribution may read it (Origin Access Control).
- **S3, Glue and Athena:** the returns CSV is uploaded to S3, Glue holds its table definition, and saved Athena queries analyze it.
- **IAM** gives each piece only what it needs: the function's role can only write logs.

**Why**
These are services that engineers at large financial firms use every day, suggested by a friend who works with them. The app is stateless, with no database and nothing remembered between requests, so it fits Lambda's run-per-request model and scales by running more copies.

**Athena is for analysis, not in the request path**
An Athena query takes seconds, because it's built for analyzing data, not for answering clicks. The simulator needs every historical year anyway, so the API reads the same CSV from inside its jar (decision 8). Athena explores the data (worst decades, worst years) and independently checks the app's statistics; its summary matches `GET /assumptions`.

**Rejected alternatives**
- **ECS or EC2 servers:** always running and always billing, and more to manage.
- **Calling Athena from the API:** seconds per request, and the function would need S3 and Athena permissions.

**Trade-off**
More moving parts than a single server, and cold starts: the first request after an idle period waits a few seconds while Java starts. `run.sh` uses a faster-starting JIT setting; SnapStart or provisioned concurrency would shorten it further.

---

## 5. Monte Carlo by replaying real years, in real terms
*2026-11-02*

**Decision**
The retirement simulator builds each simulated year by picking a random year from 1928–2025 (a bootstrap) and using that year's real (inflation-adjusted) stock and bond returns. Thousands of paths give percentile bands and a success rate. The random generator is passed in, seeded per request when a seed is given.

**Why**
- Real markets have more extreme years than a bell curve: stocks lost 34% or more after inflation in 4 of 98 years, where a normal distribution with the same average and volatility expects about 1.3.
- Picking whole years keeps each year's stock and bond returns together, so their relationship is preserved without modeling it.
- Real returns put every dollar in today's buying power.
- A passed-in, seeded generator makes results repeatable, which makes the simulator testable.

**Rejected alternatives**
- **A normal distribution with a fixed average and volatility:** simpler to describe, but it understates crashes and needs a separate correlation model.
- **A single average return:** hides sequence-of-returns risk entirely.

**Trade-off**
Years are drawn independently, so multi-year stretches like the 1965–1982 inflation era are broken up. A block bootstrap (sampling runs of years) would keep them.

---

## 6. Compare two spending rules on the same simulated markets
*2026-11-02*

**Decision**
Every simulation runs both rules on identical market paths: **fixed spending** (the "4% rule": the first year's amount, held constant in real terms) and **dynamic spending** (Vanguard's rule: a fixed percentage of the real balance, with spending changes capped at +5% and −2.5% a year). The rule is implemented exactly as in Vanguard's research note *Sustainable spending rates in turbulent markets* (2021), and its worked example is a unit test.

**Why**
Running both on the same paths means any difference comes from the rule, not from luck. Dynamic spending is drawn from Vanguard's own research, which makes the comparison specific rather than generic.

**Trade-off**
Each simulation does the retirement phase twice, roughly doubling that part of the work. It's still under half a second for the largest request.

---

## 7. Rebalance with new money first, sell only past a threshold
*2026-11-02*

**Decision**
The portfolio checkup sends new money to underweight asset classes first, in proportion to how far short each is. Only if the mix is still further off target than the user's threshold (default 5 percentage points) does the plan include selling, and it then warns about capital gains taxes.

**Why**
Selling in a taxable account can trigger taxes, and Vanguard's research recommends rebalancing with cash flows where possible. It also found no single optimal threshold, so the threshold is the user's choice.

**Rejected alternative**
Always rebalancing exactly to target: simpler, but it would suggest unnecessary sales.

---

## 8. One data file, copied into the jar, loaded once
*2026-11-02*

**Decision**
`data/historical-returns.csv` is the only copy of the data. Maven copies it into the jar at build time; `HistoricalReturnsRepository` (a Spring bean) reads it once at startup into an unchangeable list, which controllers receive by constructor injection. `data/scripts/extract_returns.py` rebuilds the CSV from Damodaran's spreadsheet and checks it against the spreadsheet's own real-return columns.

**Why**
The engine stays pure (file reading lives in the `data` package), the app needs no network call to get its data, and sharing one unchangeable list across request threads is safe.

**Trade-off**
New data means rebuilding and redeploying the app. That's fine for data that changes once a year.

---

## 9. CORS from a property, overridden in production
*2026-11-02*

**Decision**
`CorsConfig` allows the origins listed in `app.cors.allowed-origins` (`http://localhost:5173` locally). On AWS, the template sets `APP_CORS_ALLOWEDORIGINS` to the CloudFront address, so only the deployed site may call the API from a browser.

**Why**
The site and API are on different origins both locally and on AWS. The same jar runs everywhere; only configuration changes.

**Rejected alternative**
Allowing every origin (`*`): any website could use the API from its visitors' browsers.

---

## 10. Frontend: Vite, React, TypeScript, Recharts, no router
*2026-11-02*

**Decision**
A Vite + React + TypeScript app with Recharts for charts. The current tab lives in the URL hash (`#retirement`), so no router library is needed. Colors are CSS variables with separate, validated values for light and dark mode; each series keeps its color everywhere; every chart has a table view. Forms keep inputs as text, show percents, and convert to the API's decimals in one place (`toRequest`).

**Why**
Vite and React are what I know from MERN, TypeScript catches mismatches with the API's records at compile time, and four tabs don't need a router. Converting percents in one place prevents the most likely bug: sending 7 when the API expects 0.07.

**Trade-off**
The bundle is about 190 KB compressed, mostly the chart library; code-splitting would load it only when needed.
