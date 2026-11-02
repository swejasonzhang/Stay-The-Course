# 3. The API: Spring Boot

Folders: [`api/`](../backend/src/main/java/com/staythecourse/api/), [`data/`](../backend/src/main/java/com/staythecourse/data/), [`config/`](../backend/src/main/java/com/staythecourse/config/), plus [`StayTheCourseApplication.java`](../backend/src/main/java/com/staythecourse/StayTheCourseApplication.java), [`application.properties`](../backend/src/main/resources/application.properties) and [`pom.xml`](../backend/pom.xml).

**Picture: a restaurant.** The controllers are **waiters**: they take the order to the kitchen (the engine) and bring the plate back, but never cook. The request records are the **order form** with its rules; the response records are the **standard plates**; `ApiErrorHandler` is the **manager** who handles orders that can't be read or break the rules, so the waiter never sees them.

## Endpoints

| Method + path | Controller | Request → response | Engine call |
|---|---|---|---|
| `POST /fees` | `FeeController` | `FeeRequest` → `FeeResponse` | `FeeCalculator.compareFees` |
| `POST /simulate` | `SimulationController` | `SimulationRequest` → `SimulationResponse` | `RetirementSimulator.simulate` |
| `POST /portfolio` | `PortfolioController` | `PortfolioRequest` → `PortfolioResponse` | `PortfolioAnalyzer.analyze` |
| `GET /assumptions` | `AssumptionsController` | (none) → `AssumptionsResponse` | `HistoryStatistics.summarize` |

Example (`POST /fees`):

```bash
curl -X POST http://localhost:8080/fees -H 'Content-Type: application/json' \
  -d '{"initial": 10000, "annualReturn": 0.07, "fundFee": 0.01, "baselineFee": 0.0004, "years": 30}'
# → 200 {"fundBalances":[10000.0, 10600.0, ...],"baselineBalances":[10000.0, 10696.0, ...],"feeCost":17838.54...}
```

All rates in the API are **decimals** (0.07 = 7%). The frontend shows percents and converts.

---

## Starting the app

### `StayTheCourseApplication.java`

```java
@SpringBootApplication
public class StayTheCourseApplication {
    public static void main(String[] args) {
        SpringApplication.run(StayTheCourseApplication.class, args);
    }
}
```

- `main` is where every Java program starts. `SpringApplication.run` starts Spring and its built-in web server (**Tomcat**) on port 8080. MERN equivalent: `server.js` calling `app.listen(3000)`.
- `@SpringBootApplication` switches on Spring Boot's automatic setup and tells Spring to **scan** `com.staythecourse` and every package inside it for classes marked `@RestController`, `@RestControllerAdvice`, `@Component` or `@Configuration`. Spring creates **one object of each** at startup. An object Spring creates and manages is a **bean**.

### `application.properties`

| Setting | What it does |
|---|---|
| `spring.application.name=stay-the-course` | The app's name in log lines |
| `spring.jackson.deserialization.accept-float-as-int=false` | Makes `"years": 30.5` an error (400) instead of quietly becoming 30 |
| `app.cors.allowed-origins=http://localhost:5173` | Which website may call the API from a browser. On AWS it's overridden by the `APP_CORS_ALLOWEDORIGINS` environment variable |

Spring lets an environment variable override any property: uppercase it, turn dots into underscores and drop dashes (`app.cors.allowed-origins` → `APP_CORS_ALLOWEDORIGINS`). That's how the same jar runs locally and on AWS with different settings.

### `pom.xml` (Maven, like `package.json`)

- `spring-boot-starter-parent` supplies versions of every Spring library that are known to work together, so the dependencies don't list versions.
- **Dependencies:** `spring-boot-starter-webmvc` (Spring MVC, Tomcat, and Jackson for JSON), `spring-boot-starter-validation` (Bean Validation), and two test starters (JUnit, MockMvc, `@WebMvcTest`). `<scope>test</scope>` is like `devDependencies`.
- **Resources:** a `<resources>` block copies `../data/historical-returns.csv` into the app as `data/historical-returns.csv`. The repo keeps **one** copy of the data, and Maven puts it inside the jar at build time.
- Commands from `backend/`: `./mvnw test`, `./mvnw spring-boot:run`, `./mvnw package` (builds `target/stay-the-course-0.0.1-SNAPSHOT.jar`, the file deployed to Lambda). `./mvnw` is the Maven **wrapper**: it downloads the right Maven version the first time, so nobody needs Maven installed.

---

## Controllers

### `FeeController`

```java
@RestController
public class FeeController {

    @PostMapping("/fees")
    public FeeResponse calculateFees(@Valid @RequestBody FeeRequest request) {
        FeeComparison result = FeeCalculator.compareFees(
                request.initial(),
                request.annualReturn(),
                request.fundFee(),
                request.baselineFee(),
                request.years());
        return new FeeResponse(result.fundBalances(), result.baselineBalances(), result.feeCost());
    }
}
```

| Piece | What it tells Spring |
|---|---|
| `@RestController` | This class handles HTTP requests, and whatever its methods return becomes JSON. Create one at startup. |
| `@PostMapping("/fees")` | Call this method for **POST** requests to **/fees** (Express: `app.post('/fees', …)`) |
| `@RequestBody` | Build the parameter from the JSON body (**checkpoint 1**, Jackson) |
| `@Valid` | Then check it against the rules on `FeeRequest` (**checkpoint 2**, Bean Validation) |
| return type `FeeResponse` | Turn this into JSON with status 200 |

- **Why five plain numbers instead of passing `request` to the engine?** The engine must not depend on web classes. Tests and the simulator call the engine directly and have no `FeeRequest`. (Also, `request.initial()` returns a `Double`, which Java automatically unwraps into the `double` the engine expects.)
- **What breaks without each annotation** (all tested by temporarily removing it):
  - no `@RestController` → `POST /fees` is **404**, because the route is never registered;
  - no `@RequestBody` → Spring looks for the values in the URL instead of the body, finds nothing, so every field is null → **422**;
  - no `@Valid` → no rules are checked: `"annualReturn": 7` gets a 200 with nonsense, and a missing field crashes with **500** (`NullPointerException` while unwrapping null).
- Two methods claiming `POST /fees` → **the app refuses to start** ("Ambiguous mapping"). `StayTheCourseApplicationTests.contextLoads` exists to catch this.
- Wrong method (`GET /fees`) → **405**; wrong path (`/fee`) → **404**; body not labeled JSON → **415**.

### `SimulationController`, `AssumptionsController`: constructor injection

```java
@RestController
public class SimulationController {

    private final HistoricalReturnsRepository history;

    public SimulationController(HistoricalReturnsRepository history) {
        this.history = history;
    }

    @PostMapping("/simulate")
    public SimulationResponse simulate(@Valid @RequestBody SimulationRequest request) {
        SimulationInputs inputs = new SimulationInputs(/* the eight numbers from the request */);
        SplittableRandom random = request.seed() == null ? new SplittableRandom() : new SplittableRandom(request.seed());
        return SimulationResponse.from(RetirementSimulator.simulate(inputs, history.all(), random));
    }
}
```

- The controller needs the market history. Instead of creating it (`new HistoricalReturnsRepository()`), it **asks for it in its constructor**, and Spring passes in its single shared instance. This is **dependency injection**: objects receive what they need instead of building it. It makes classes easy to test (a test can pass in anything) and ensures the file is read once, not per request.
- `private final` means the field is set once in the constructor and never changes, which is why sharing the controller across threads is safe.
- **A new random generator per request**, so requests never share state. With a `seed`, the same request always gives the same answer.
- `AssumptionsController` (`GET /assumptions`) works the same way and returns `HistoryStatistics.summarize(...)` plus every year's real returns for the chart.

### `PortfolioController`

Converts the request into engine types: each `PortfolioRequest.Holding` becomes an engine `Holding`, and the four target fields become an `EnumMap<AssetClass, Double>`. Then it calls `PortfolioAnalyzer.analyze(...)`.

---

## Request records and their rules

A **record** is a class that only holds values; Java writes the constructor and a reader method for each field (`request.years()`). **Jackson** builds the record from JSON by matching keys to field names. Missing keys become `null`; unknown keys are ignored (so a misspelled `annual_return` counts as missing).

Rule annotations (Jakarta Bean Validation):

| Annotation | Meaning |
|---|---|
| `@NotNull` | Must be present |
| `@DecimalMin("0")` / `@DecimalMax("0.1")` | Smallest / largest allowed decimal. Limits are written as text so they're compared exactly. `inclusive = false` makes it strict ("more than", not "or more") |
| `@Min` / `@Max` | The same for whole numbers |
| `@NotBlank`, `@NotEmpty`, `@Size(max = 50)` | Text not blank, list not empty, list not too long |
| `@Valid` on a nested field or list element | Check the rules inside it too |
| `@AssertTrue` on a method | A rule involving several fields (e.g. the target mix adds up to 100%) |

**Why `Double` and `Integer`, not `double` and `int`?** Lowercase `double` can never be empty, so a missing field would make Jackson fail with a generic 400 that doesn't say which field. A `Double` can be `null`, so `@NotNull` catches it and the 422 names the field. The rule of thumb in this codebase: **a wrong type (line declaring the type) → 400; a broken rule (line with the annotations) → 422.**

**Why the limits?** Each one either catches a likely mistake (`annualReturn` at most 1 catches "7" sent for 7%) or protects the server: one public request can't ask for a billion years or a million simulations.

| `FeeRequest` | Rule |
|---|---|
| `initial` | 0 to 1 billion |
| `annualReturn` | more than −1, at most 1 |
| `fundFee`, `baselineFee` | 0 to 0.1 |
| `years` | whole number, 0 to 100 |

| `SimulationRequest` | Rule |
|---|---|
| `currentBalance` | 0 to 1 billion |
| `annualContribution` | 0 to 10 million |
| `yearsToRetirement` | 0 to 60 |
| `yearsInRetirement` | 1 to 60 |
| `withdrawalRate` | more than 0, at most 0.2 |
| `stockAllocation` | 0 to 1 |
| `expenseRatio` | 0 to 0.1 |
| `simulations` | 100 to 10,000 |
| `seed` | optional |

| `PortfolioRequest` | Rule |
|---|---|
| `holdings` | 1 to 50; each: name not blank (max 100 chars), known `assetClass`, value 0 to 10 billion, expense ratio 0 to 0.1 |
| `target` | four shares, each 0 to 1, adding up to 1 (±0.001) |
| `newContribution` | 0 to 1 billion |
| `driftThreshold` | more than 0, at most 0.5 |
| (whole request) | holdings must add up to more than 0 |

## Response records

`FeeResponse`, `SimulationResponse`, `PortfolioResponse` and `AssumptionsResponse` mirror the engine's result records, and each has a `static from(...)` method that copies the engine result in. **Why not return the engine's records directly?** The response records are the **contract** with the frontend; the engine's records are internal. Keeping them separate means the engine can change without breaking the frontend: only the `from` method changes. The cost is some duplication.

## `ApiErrorHandler`: errors as JSON

```java
@RestControllerAdvice
public class ApiErrorHandler {

    @ExceptionHandler(HttpMessageNotReadableException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST) // 400
    public Map<String, String> handleUnreadableBody(HttpMessageNotReadableException exception) { ... }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    @ResponseStatus(HttpStatus.UNPROCESSABLE_CONTENT) // 422
    public Map<String, String> handleInvalidRequest(MethodArgumentNotValidException exception) {
        Map<String, String> errors = new LinkedHashMap<>();
        for (FieldError fieldError : exception.getBindingResult().getFieldErrors()) {
            errors.put(fieldError.getField(), fieldError.getDefaultMessage());
        }
        return errors;
    }
}
```

- When something goes wrong, Java **throws an exception** (an error object). Spring throws `HttpMessageNotReadableException` when checkpoint 1 fails and `MethodArgumentNotValidException` when checkpoint 2 fails.
- `@RestControllerAdvice` applies these handlers to **every** controller. `@ExceptionHandler(X.class)` means "call this method when X is thrown." `@ResponseStatus` sets the status code. MERN equivalent: Express error middleware.
- The 422 body names every broken rule at once, including nested ones: `{"holdings[0].value": "must be greater than or equal to 0", "target.totalOneHundredPercent": "must add up to 100%"}`. The frontend uses these keys to show each message next to its input.

## CORS: which websites may call the API

A browser blocks a page from calling an API on a **different origin** (scheme + domain + port) unless the API says that origin is allowed. `localhost:5173` (the site) and `localhost:8080` (the API) are different origins, and so are the CloudFront domain and the API Gateway domain on AWS.

```java
@Configuration
public class CorsConfig implements WebMvcConfigurer {
    public CorsConfig(@Value("${app.cors.allowed-origins}") String[] allowedOrigins) { ... }

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/**").allowedOrigins(allowedOrigins).allowedMethods("GET", "POST");
    }
}
```

- The browser sends an `Origin` header. If it's allowed, Spring answers with `Access-Control-Allow-Origin: <that origin>`; otherwise **403**.
- For JSON POSTs the browser first sends a **preflight** `OPTIONS` request asking permission; Spring answers it from the same settings.
- CORS only restricts **browsers**. `curl` or another server can still call the API, which is why the request rules and API Gateway's throttling still matter.
- `@Value("${...}")` reads a setting from `application.properties` (or its environment-variable override).

## Loading the data: `data` package

- `MarketYearCsv.parse(String)` turns the CSV text into a list of `MarketYear` records. It checks the header and that every row has 5 values, failing loudly otherwise.
- `HistoricalReturnsRepository` is a `@Component` (a bean). Its constructor reads `data/historical-returns.csv` from inside the jar (`ClassPathResource`) **once, at startup**, and keeps an unchangeable list (`List.copyOf`). Every controller that asks for it gets the same instance. Reading a file is I/O, which is why it lives here and not in the engine.

## Key facts

- `@SpringBootApplication` → Spring scans the package and creates **one bean** per controller/component.
- `@RestController` + `@PostMapping` register routes; `@RequestBody` = read (400 if not), `@Valid` = check rules (422 if not).
- **Constructor injection:** controllers ask for the repository; Spring hands in its single shared instance.
- **Boxed types + `@NotNull`** give a 422 that names the missing field.
- **Response records are the contract**; `from(...)` maps engine results into them.
- **CORS** lets the site's origin call the API from a browser; it's configured by a property that AWS overrides with an environment variable.
- **The data file is read once** at startup into an unchangeable list, so sharing it across threads is safe.
