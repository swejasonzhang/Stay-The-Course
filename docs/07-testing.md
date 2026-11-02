# 7. Testing

**69 automated tests:** 56 in the backend (`./mvnw test` in `backend/`) and 13 in the frontend (`npm test` in `frontend/`).

## The strategy: test each layer on its own

| Kind | Tool | How many | What a failure means |
|---|---|---|---|
| **Engine tests** | JUnit, calling the engine directly | Many, fast (milliseconds) | The math is wrong |
| **API tests** | MockMvc with `@WebMvcTest` | Fewer | The contract is wrong: status codes, JSON shape, validation |
| **Startup test** | `@SpringBootTest` | 1 | The app can't start (e.g. two methods claim the same URL) |
| **Frontend tests** | Vitest | 13 | Formatting, form conversion, axis ticks or the API client is wrong |

Why not test everything through HTTP? When an HTTP test fails, the cause could be the request, a field name, validation, JSON conversion or the math. When an engine test fails, it can only be the math. So the math is tested directly and thoroughly, and the HTTP tests focus on the contract.

## Anchor tests: numbers checked against something outside the code

These are the most convincing tests, because they compare the code with an answer worked out independently:

| Test | Checks against |
|---|---|
| `FeeCalculatorTest.matchesTheHandCalculation` | The hand-calculated homework answers: $75,273.45 and $57,434.91 |
| `FeeCalculatorTest.everyYearMatchesTheCompoundGrowthFormula` | The textbook formula `initial × growth^year`, for all 31 years |
| `DynamicSpendingTest.ceilingMatchesVanguardsWorkedExample` | Vanguard's published example: £50,000 → £52,500 |
| `RetirementSimulatorTest.withoutRandomnessTheSimulatorMatchesTheFeeEngine` | With a one-year "history" there's no randomness, so the simulator must equal the fee engine exactly: $57,434.91 |
| `RetirementSimulatorTest.constantSpendingRunsOutAfterExactly25YearsAtZeroReturn` | $1,000,000 at 4% is $40,000 a year: with 0% returns it lasts exactly 25 years, and fails at 26 |
| `PortfolioAnalyzerTest.newMoneyGoesToUnderweightClassesFirst` | A rebalancing plan worked out by hand ($8,666.67 / $1,333.33) |
| `HistoricalReturnsTest.theRealDataLooksRight` | Known history: the worst real year for stocks was 1931 |

## Backend test files

| File | Tests | What it proves |
|---|---|---|
| `engine/FeeCalculatorTest` | 8 | Zero years, the formula, the homework numbers, higher fee → lower balance, flat when nothing changes, negative inputs rejected, `compareFees` |
| `engine/DynamicSpendingTest` | 3 | Ceiling (Vanguard's example), floor, and following the balance inside the guardrails |
| `engine/PercentilesTest` | 4 | Median and ends, interpolation (10th percentile of 10…50 is 14), the caller's array isn't reordered, bad input rejected |
| `engine/RetirementSimulatorTest` | 6 | Matches the fee engine without randomness, runs out at exactly 25 years, dynamic spending cuts by no more than 2.5%, the same seed gives the same result, percentile bands are in order every year, bad inputs rejected |
| `engine/HistoryStatisticsTest` | 3 | Average vs compounded return (up 10%, down 10%), correlation of −1, real returns remove inflation |
| `engine/PortfolioAnalyzerTest` | 6 | Mix, drift and fees; new money first; selling only when needed; no trades when on target; high-fee warning; bad inputs rejected |
| `data/HistoricalReturnsTest` | 5 | CSV parsing, bad header/row rejected, all 98 years load, the shared list can't be changed, sanity checks on the real data |
| `api/FeeControllerTest` | 9 | 200 with the right shape, missing fields → 422, five out-of-range values → 422, decimal years → 400, non-JSON → 400 |
| `api/SimulationControllerTest` | 3 | 200 with both rules and the right list lengths, the same seed gives identical JSON, out-of-range values named in a 422 |
| `api/PortfolioControllerTest` | 5 | 200 with a plan, target not adding to 100% → 422, nested field error (`holdings[0].value`), no holdings → 422, unknown asset class → 400 |
| `api/AssumptionsControllerTest` | 1 | 98 years, 1928–2025, source named, yearly rows included |
| `config/CorsConfigTest` | 2 | The local frontend's origin is allowed; any other site gets 403 |
| `StayTheCourseApplicationTests` | 1 | The whole app starts |

### Reading a JUnit test

```java
@Test
void higherFeeMeansLowerBalance() {
    double lowFee = FeeCalculator.projectBalances(10_000, 0.07, 0.0004, 30).getLast();
    double highFee = FeeCalculator.projectBalances(10_000, 0.07, 0.01, 30).getLast();
    assertTrue(highFee < lowFee);
}
```

| JUnit | Jest | pytest |
|---|---|---|
| `@Test` | `test('name', () => {…})` | `def test_name():` |
| `assertEquals(expected, actual, delta)` | `expect(actual).toBeCloseTo(expected)` | `assert actual == pytest.approx(expected)` |
| `assertThrows(Type.class, () -> …)` | `expect(() => …).toThrow()` | `with pytest.raises(Type):` |
| `@ParameterizedTest` + `@CsvSource` | `test.each(…)` | `@pytest.mark.parametrize` |

Money comparisons allow a small difference (`ONE_CENT`), because decimals in a computer are very slightly approximate (`0.1 + 0.2` is `0.30000000000000004`).

### Reading a MockMvc test

```java
@WebMvcTest(FeeController.class)
class FeeControllerTest {
    @Autowired
    private MockMvc mockMvc;

    @Test
    void validRequestReturnsBothProjectionsAndTheCost() throws Exception {
        mockMvc.perform(post("/fees").contentType(MediaType.APPLICATION_JSON).content(VALID_REQUEST))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.fundBalances", hasSize(31)))
                .andExpect(jsonPath("$.feeCost", closeTo(17_838.54, 0.02)));
    }
}
```

- `@WebMvcTest` starts only the web layer (controllers, validation, error handler, CORS, JSON), not the whole app and not a real server. MERN equivalent: supertest.
- `@Autowired` asks Spring for the `MockMvc` object it created (dependency injection).
- `jsonPath("$.feeCost")` reads a field from the response (`$` is the whole body).
- Tests that need the data repository add `@Import(HistoricalReturnsRepository.class)`, because `@WebMvcTest` doesn't load non-web beans on its own.

## Tests that prove other tests matter

A test is only useful if it fails when the code is wrong. Some were checked by breaking the code on purpose:

- Turning off `accept-float-as-int=false` made `decimalYearsAreRejected` fail (30.5 got a 200).
- Removing `@Valid`, `@RequestBody` or `@RestController`, or adding a duplicate route, was tried against the running app; each broke in the way the guides describe.

## Checks beyond unit tests

| Check | Result |
|---|---|
| Athena SQL run locally in DuckDB | Matches the Java statistics (8.61%, 6.78%, 19.3%, 0.091) |
| Data extraction | Real returns match Damodaran's own real columns for all 98 years |
| `cfn-lint` on `infra/template.yaml` | No findings |
| Lambda package started locally with `run.sh` | Ready in ~1.6 s; production CORS setting allows CloudFront, refuses localhost |
| Frontend in a real browser (headless Chrome screenshots) | All four tabs render with live API data, in light and dark mode |
| Simulator speed | Largest allowed request (10,000 paths × 120 years) ≈ 0.4 s warm |

## Running the tests

```bash
cd backend && ./mvnw test        # 56 tests
cd frontend && npm test          # 13 tests
```

## Key facts

- **Engine tests check math; API tests check the contract; one test checks the app starts.**
- **Anchor tests** compare the code with independent answers: the homework numbers, the textbook formula, Vanguard's example, and "no randomness = the fee engine."
- **The same seed gives the same simulation**, which is what makes a random simulation testable.
- **Money is compared with a tolerance** because floating-point decimals are slightly approximate.
