# Design Decisions

The non-obvious choices in Stay the Course: what I chose, why, what I rejected, and what it cost.

---

## 1. Keep the finance math separate from the API
*2026-10-20, updated for Java 2026-10-21*

**Decision**
The backend has two packages. `engine` holds all the finance math as pure functions, with no HTTP, files, database or Spring. `api` is a thin Spring Boot layer that checks each request, calls the engine and returns JSON. Dependencies point one way: `api` imports `engine`, and `engine` never imports anything from Spring or from `api`.

**Why**
- **Testing.** I can call an engine method directly in a test and compare the result with a known formula. If an engine test fails, the bug is in the math, not in the request, the validation or the JSON.
- **Reuse.** If the math lived inside a controller, an HTTP request would be the only way to run it. As its own package, any code can call it: the Monte Carlo simulator reuses the yearly growth logic.
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
More files, and one more layer to trace through when following a request. For a 20-line script that would be overkill. Here it's worth it because the engine will grow to three modules and carry most of the tests.

---

## 2. Request rules live on `api/FeeRequest.java`
*2026-10-21*

**Decision**
The rules for incoming JSON (required fields and allowed ranges) are Bean Validation annotations such as `@NotNull` and `@DecimalMax` on the `FeeRequest` record in the `api` package. The controller's `@Valid` triggers the check. `ApiErrorHandler` turns failures into JSON errors with two status codes:
- **400** when the body can't be read at all: it isn't JSON, or a whole-number field such as `years` got a decimal
- **422** when the JSON was read but a value broke a rule, with each bad field named: `{"years": "must be less than or equal to 100"}`

`application.properties` turns off Jackson's `accept-float-as-int` setting, so `"years": 30.5` is rejected instead of quietly becoming 30.

**Why**
These rules describe the JSON the frontend sends, which is the API's contract and an HTTP concern. The API also caps values (for example, at most 100 years) so that one public request can't tie up the server. The engine has its own, looser guards for code that calls it directly.

**Rejected alternatives**
- **Annotations on the engine's methods:** the engine would depend on the validation library and on the HTTP contract, which breaks decision 1.
- **Primitive `double` and `int` fields:** a primitive can't be null, so a missing field makes the JSON reader fail with a 400 that doesn't say which field is missing. Boxed `Double` and `Integer` with `@NotNull` give a 422 that names it.

**Trade-off**
`FeeRequest` and the engine's method parameters list the same five values, so adding an input means changing both.

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
Java is wordier than Python, and Spring Boot does a lot through annotations that run code behind the scenes. Spring Boot also starts more slowly (about 2.5 seconds locally), which matters on AWS Lambda, where a cold start happens on the first request after the function has been idle.

---

## 4. Deploy on AWS with API Gateway, Lambda, S3 and Athena
*2026-10-21 (planned)*

**Decision**
- **API Gateway and Lambda** run the backend. API Gateway gives the API a public HTTPS URL, and Lambda runs the Spring Boot app only when a request arrives.
- **S3 and CloudFront** host the built frontend, and S3 also holds the data files.
- **Athena** runs SQL over the historical returns data in S3 to work out the average return and volatility the Monte Carlo simulator uses.
- **IAM** gives each piece only the access it needs.

**Why**
These are services that engineers at large financial firms use every day, suggested by a friend who works with them. The engine is stateless, with no database and nothing remembered between requests, so it fits Lambda's run-per-request model. Storing real return data in S3 and analyzing it with Athena answers the question "where do your return assumptions come from?" with real data instead of numbers typed into the code.

**Athena runs ahead of time, not per request**
An Athena query takes seconds, because it's built for analyzing large amounts of data, not for fast responses. So Athena's results are saved to S3, and the API only reads those saved results.

**Trade-off**
More moving parts than a single server, and more setup: permissions for each service. Spring Boot also starts slowly on Lambda (a cold start); Lambda SnapStart is the planned fix.
