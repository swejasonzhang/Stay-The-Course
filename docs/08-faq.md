# 8. Design questions and answers

The "why" behind each choice. Each answer starts with the short version.

## Architecture

**Walk through what happens when someone clicks "Run simulation."**
The browser sends `POST /simulate` with the inputs as JSON. Spring routes it to `SimulationController`, but first Jackson turns the JSON into a `SimulationRequest` (400 if it can't) and Bean Validation checks its rules (422 if any fail, naming the fields). The controller copies the numbers into `SimulationInputs`, creates a random generator, and calls `RetirementSimulator.simulate` with the history loaded at startup. The engine runs thousands of paths, the controller copies the result into a `SimulationResponse`, and Spring sends it back as JSON with a 200. The React page turns the percentile lists into chart rows and draws the fan charts.

**Why separate the engine from the API?**
So the math has no web code in it. It can be tested directly (a failing engine test always means a math bug), reused by other code without HTTP, and changed without touching the API contract.

**Why do the API's response records duplicate the engine's records?**
The response records are the contract with the frontend; the engine's records are internal. Keeping them separate lets the engine change without breaking the frontend: only the `from(...)` mapping changes. The cost is some duplication.

**What happens if many people use it at once?**
Each request runs on its own thread. Controllers are shared single instances but store no data; everything a request uses is a local variable or a fresh object (a new random generator, new arrays). The one shared piece, the market history, can't be changed. On AWS, Lambda also runs more copies as traffic grows, which works because the app is stateless.

**How would this scale to millions of users?**
The app is stateless, so you run more copies; Lambda does this automatically. Every request's work is bounded by the validation caps (at most 10,000 paths × 120 years, about 0.4 s). Beyond that: cache common simulation results, keep functions warm to avoid cold starts, and move very large simulations to a queue processed in the background.

## The math

**Why Monte Carlo instead of assuming the average return?**
Averages hide the risk. Two retirees with the same average return can end very differently depending on *when* the bad years land: a crash early in retirement, while you're withdrawing, does far more damage than the same crash later ("sequence of returns" risk). Simulating thousands of orderings shows the range of outcomes and the chance of running out.

**Why replay historical years (bootstrap) instead of a normal distribution?**
Real markets have more extreme years than a bell curve: stocks lost 34% or more after inflation in 4 of 98 years, where a bell curve with the same average and volatility expects about 1.3. Replaying whole years also keeps each year's stock and bond returns together, so their real relationship (including 2022, when both fell) is preserved. The limitation: years are drawn independently, so long stretches like the 1970s are broken up; a block bootstrap would fix that.

**Why real (inflation-adjusted) returns?**
So every dollar amount is in today's buying power, and spending can be held constant in real terms (which is what the 4% rule means).

**How is the fee modeled?**
Subtracted from the return each year: growth = 1 + return − fee. It's a common simplification; funds actually deduct a sliver daily. The alternative, (1 + return) × (1 − fee), also charges the fee on that year's growth and gives a slightly larger cost.

**What does "success rate" mean, and why does dynamic spending score higher?**
The share of simulated paths in which every year's planned spending was fully paid. Dynamic spending cuts back (by at most 2.5% a year) after bad markets, which protects the portfolio, so it runs out less often. The trade-off is that its spending varies: higher in good paths, lower in bad ones.

**Why are average and compounded returns different?**
Volatility. Up 10% then down 10% averages 0% but turns $1 into $0.99. For stocks since 1928 (real): 8.6% average, 6.8% compounded.

**Why doubles instead of BigDecimal for money?**
These are projections based on assumed or historical returns; a billionth of a cent is meaningless next to that uncertainty, and doubles are much faster for hundreds of thousands of calculations. A real account ledger, where every cent must add up, would use `BigDecimal`.

**What's the time complexity?**
Fee projection: O(years). Simulation: O(simulations × years), plus sorting each year's values for percentiles: O(years × simulations × log(simulations)).

**How do you test something random?**
Three ways: pass in a seeded random generator so a given seed always produces the same result; remove the randomness entirely (a one-year history) and check the simulator matches a known answer; and check properties that must always hold (percentile bands in order, success rates between 0 and 1).

## The portfolio checkup

**Why put new money in before selling?**
Selling in a taxable account can trigger capital gains taxes, and Vanguard's research recommends using cash flows to rebalance where possible. New money goes to underweight classes first; selling is suggested only if the mix is still further off than your threshold.

**Why is the threshold adjustable?**
Vanguard's research found no single optimal rebalancing threshold or frequency. 5 percentage points is a common choice, so it's the default.

## The API

**What's the difference between a 400 and a 422 here?**
400: the body couldn't be read at all (not JSON, a decimal for `years`, an unknown asset class). 422: it was read, but a value broke a rule (missing, or out of range); the response names each field.

**Why `Double` instead of `double` in the request records?**
So a missing field can be null and reported by name (`{"fundFee": "must not be null"}`) instead of failing with a generic 400.

**What's CORS and why is it needed?**
Browsers block a page from calling an API on a different origin unless the API allows that origin. The site and API are on different origins both locally (ports 5173 and 8080) and on AWS (CloudFront and API Gateway domains), so the API lists the allowed origin.

## AWS

**Why Lambda?**
The app is stateless, so it suits Lambda's run-per-request model: no server to manage, it scales by itself, and it costs nothing when idle. The trade-off is cold starts.

**How does Spring Boot run on Lambda without changes?**
The Lambda Web Adapter layer starts the jar with `run.sh` and translates each Lambda event into a normal HTTP request to the app on port 8080.

**Why isn't Athena in the request path?**
An Athena query takes seconds; it's built for analysis, not for answering clicks. The API reads the same CSV from inside its jar instead. Athena is used to explore the data and independently check the app's numbers.

**What does IAM control here?**
The Lambda function may only write logs; only the CloudFront distribution may read the site bucket; the developer deploys with an IAM user, not the root account. That's least privilege.

## What would you improve?

1. **Block bootstrap** so multi-year stretches like the 1970s stay intact.
2. **Accounts and saved portfolios** (sign-in plus a database).
3. **Unchangeable lists in the engine's records** (`List.copyOf` in a compact constructor; records are only shallowly immutable).
4. **SnapStart** to shorten Lambda cold starts.
5. **Code-splitting** the frontend so the chart library loads only when a chart is shown.
6. **CI** (GitHub Actions) to run both test suites and deploy on every push to `main`.
