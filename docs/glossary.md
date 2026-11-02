# Glossary

**Annotation** — A label starting with `@` that tells a framework to do something with the code under it (`@RestController`, `@Valid`, `@Test`).

**Bean** — An object Spring creates and manages. Spring makes one of each controller and component at startup and shares it.

**Bootstrap (statistics)** — Sampling from real data with replacement. The simulator picks a random historical year for each simulated year.

**Checkpoint 1 / 2** — This project's name for the two checks before a controller runs: reading the JSON (fails → 400) and checking the rules (fails → 422).

**CloudFormation** — AWS's infrastructure as code: a template describes every resource, and AWS creates or updates them to match.

**CloudFront** — AWS's CDN (content delivery network). Serves the website from servers near each visitor, over HTTPS.

**Cold start** — The delay on the first request to a Lambda function that isn't already running, while it starts Java and the app.

**Compounding** — Growth applied to a balance that already includes earlier growth.

**Compounded (geometric) return** — The steady yearly rate that would grow money the same way the real sequence did. Lower than the average when returns bounce around.

**Constructor injection** — A class lists what it needs as constructor parameters, and Spring passes those beans in.

**Correlation** — How much two things move together: +1 always together, −1 always opposite, 0 unrelated.

**CORS** — Cross-Origin Resource Sharing. Browsers block calls to an API on a different origin unless the API allows that origin.

**CSV** — Comma-separated values: a plain-text table.

**Drift** — How far an asset class's current share is from its target share, in percentage points.

**Dynamic spending** — Vanguard's rule: spend a fixed percentage of the balance each year, but never raise spending more than 5% or cut it more than 2.5% from last year.

**Engine** — This project's package of pure math classes, with no web code.

**Exception** — Java's error object. Code "throws" one when something goes wrong; a handler can "catch" it.

**Expense ratio** — A fund's yearly fee, as a share of the money invested (0.0004 = 0.04%).

**Fan chart** — A chart showing a median line with shaded bands for the range of outcomes.

**Glue Data Catalog** — Where AWS stores table definitions (columns, types, file locations) so Athena can query files in S3.

**IAM** — Identity and Access Management: AWS's permission system for users, roles and services.

**Jackson** — The Java library that turns JSON into objects and back.

**Lambda** — AWS's service that runs code only when it's called, scaling by itself.

**Lambda Web Adapter** — An AWS layer that lets a normal web app (like Spring Boot) run on Lambda unchanged.

**Least privilege** — Granting only the permissions something actually needs.

**Median** — The middle value: half the outcomes are below it. The 50th percentile.

**Monte Carlo simulation** — Running a model many times with random inputs to see the range of possible outcomes.

**Nominal return** — The return before inflation.

**O(n), Big-O** — How the work grows as the input grows. O(n): double the input, double the work. O(1): the work doesn't grow.

**Origin** — Scheme + domain + port, e.g. `http://localhost:5173`.

**Percentile** — The value a given share of outcomes falls below. The 10th percentile is a bad-luck outcome; the 90th a good-luck one.

**Pure function** — Same inputs always give the same output, with no side effects (no files, network or saved state).

**Race condition** — Two threads changing the same shared data at once, so one overwrites the other.

**Real return** — The return after inflation: (1 + nominal) / (1 + inflation) − 1.

**Rebalancing** — Buying and selling (or directing new money) to bring the mix back to its target.

**Record** — A Java class that only holds values. Java writes its constructor, readers, `equals` and `toString`.

**S3** — AWS's file storage.

**Seed** — A starting number for a random generator. The same seed always gives the same "random" sequence.

**Sequence of returns risk** — The danger that bad years arrive early in retirement, while you're withdrawing, which hurts far more than the same years later.

**Stateless** — The app remembers nothing between requests; each request carries everything needed.

**Static method** — A method called on the class itself (`FeeCalculator.compareFees(...)`), with no object needed.

**Success rate** — In the simulator, the share of paths where every year's planned spending was fully paid.

**Thread** — A separate line of work running at the same time as others. Each request runs on its own thread.

**Thread-safe** — Safe for many threads to use at once.

**Utility class** — A class with only static methods and a private constructor, used as a container for functions.

**Volatility** — The standard deviation of returns: how much they typically swing around their average.
