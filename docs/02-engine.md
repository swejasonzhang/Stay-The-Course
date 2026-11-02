# 2. The engine: all the math

Folder: [`backend/src/main/java/com/staythecourse/engine/`](../backend/src/main/java/com/staythecourse/engine/)

Everything here is **pure**: numbers in, numbers out. No HTTP, no files, no database, no Spring. Most classes are **utility classes** (`public final class` with a `private` constructor and only `static` methods), like JS's `Math`: you call `FeeCalculator.compareFees(...)` the way you'd call `Math.max(...)`, without creating an object. The rest are **records**: small classes that only hold values (like a TypeScript interface plus the object, or Python's `@dataclass`).

| File | Kind | Job |
|---|---|---|
| `FeeCalculator` | utility class | Fee drag: project a balance year by year under two fees |
| `FeeComparison` | record | Result of `compareFees` |
| `MarketYear` | record | One year of history, plus its real (after-inflation) returns |
| `Percentiles` | utility class | "What value are X% of outcomes below?" |
| `DynamicSpending` | utility class | Vanguard's +5% / −2.5% spending guardrails |
| `RetirementSimulator` | utility class | The Monte Carlo simulation |
| `SimulationInputs`, `SimulationResult`, `SpendingRuleResult`, `PercentileBands` | records | Simulator inputs and outputs |
| `HistoryStatistics` | utility class | Averages, volatility, correlation of the history |
| `HistorySummary`, `AssetStatistics` | records | Its outputs |
| `PortfolioAnalyzer` | utility class | Mix, drift, fees and the rebalancing plan |
| `AssetClass`, `Holding`, `AllocationLine`, `Trade`, `PortfolioReport` | enum + records | Its inputs and outputs |

---

## Fee drag: `FeeCalculator` and `FeeComparison`

**Picture: a notebook.** Write today's balance on line 0. Each year, look at the last line, multiply by the yearly growth, and write the result on the next line.

```java
double growth = 1 + annualReturn - expenseRatio;   // 1 + 0.07 - 0.01 = 1.06
List<Double> balances = new ArrayList<>();
balances.add(initial);                              // line 0: today
for (int year = 1; year <= years; year++) {
    balances.add(balances.getLast() * growth);      // last line × 1.06
}
return balances;
```

| Year | Calculation | Balance | Fee that year (≈1% of balance) |
|---|---|---|---|
| 0 | — | $10,000 | — |
| 1 | 10,000 × 1.06 | $10,600 | ~$100 |
| 2 | **10,600** × 1.06 | $11,236 | ~$106 |
| 3 | **11,236** × 1.06 | $11,910.16 | ~$112 |

- **Compounding:** each year multiplies the *previous* balance, which already includes earlier growth. That's why `balances.getLast()` matters: with `initial` instead, the list would be `[10000, 10600, 10600, …]`.
- **Why the fee costs so much:** it's taken from a bigger balance every year. $10,000 for 30 years at 7%: a 0.04% fee leaves **$75,273.45**, a 1% fee leaves **$57,434.91**, so the 1% fee costs **$17,838.54**, almost a quarter of the ending balance.
- **Fee model:** the fee is subtracted from the return (1 + return − fee), a common simplification. Real funds take a sliver of the fee every day. Multiplying instead, (1 + return) × (1 − fee), also charges the fee on that year's growth and gives a slightly bigger gap (about $18,900).
- **The list has years + 1 entries**, so the chart starts at today's amount.
- `compareFees` fills in two notebooks and returns a `FeeComparison` with both lists and `feeCost` = **the cheap fund's last balance minus yours** (in dollars, not a percentage).
- **Guards:** negative years, starting balance or fee throw `IllegalArgumentException`. HTTP requests can't trigger them (the API's rules are stricter); they protect code that calls the engine directly, like tests. Without the guard, `years = -1` would quietly return `[10000]` because the loop never runs.
- **Speed:** O(n) in the number of years: one multiplication per year. Doubling the years doubles the work.
- **Java has no named arguments**, so swapping two `double` arguments (return and fee) compiles and runs, giving $1,148 instead of $75,273. The compiler only catches type mismatches, like `30.5` for an `int`. The tests catch the swap.

---

## `MarketYear`: one year of history

```java
public record MarketYear(int year, double stocks, double bonds, double bills, double inflation) {
    public double realStockReturn() { return (1 + stocks) / (1 + inflation) - 1; }
    public double realBondReturn()  { return (1 + bonds) / (1 + inflation) - 1; }
}
```

- The four returns are **nominal**: what the statement showed, before inflation.
- A **real** return removes inflation: what the money could actually buy. Stocks up 10% with 5% inflation is (1.10 / 1.05) − 1 ≈ **4.76%** real, not 5%. (Subtracting, 10% − 5%, is only an approximation.)
- The simulator works entirely in real returns, so **every dollar it shows is in today's dollars**.
- A record can have methods. These two are calculated from its fields each time they're called.

---

## `Percentiles`

**"What value are X% of outcomes below?"** The 50th percentile is the median: half the simulations ended below it, half above. The 10th percentile is a bad-luck outcome: only 10% did worse.

```java
double[] sorted = values.clone();          // copy, so the caller's array isn't reordered
Arrays.sort(sorted);
double position = percentile * (sorted.length - 1);
int below = (int) Math.floor(position);
int above = (int) Math.ceil(position);
double fraction = position - below;
results[i] = sorted[below] + (sorted[above] - sorted[below]) * fraction;
```

Example: the 10th percentile of `[10, 20, 30, 40, 50]`. Position = 0.1 × 4 = 0.4, so it's 40% of the way from 10 to 20: **14**. This is the same method as Excel's `PERCENTILE.INC`.

- It **sorts once** and then reads several percentiles from the sorted copy. The simulator asks for five at a time (10th, 25th, 50th, 75th, 90th) for every year.
- It **sorts a copy** (`clone()`), so callers' data never changes under them.

---

## `DynamicSpending`: Vanguard's guardrails

The rule, from Vanguard's research note *Sustainable spending rates in turbulent markets* (March 2021):

1. Each year, the target is a fixed percentage of the portfolio's **real** balance.
2. But spending may rise by **at most 5%** (the ceiling) and fall by **at most 2.5%** (the floor) compared with last year's real spending.

```java
public static double nextSpending(double previousSpending, double balance, double withdrawalRate) {
    double target = withdrawalRate * balance;
    double highest = previousSpending * (1 + CEILING);   // +5%
    double lowest = previousSpending * (1 - FLOOR);      // -2.5%
    return Math.min(highest, Math.max(lowest, target));
}
```

`Math.min(highest, Math.max(lowest, target))` is a **clamp**: keep `target`, but no lower than `lowest` and no higher than `highest`.

**Vanguard's own worked example** (it's a unit test): £1,000,000 at 5% means £50,000 in year 1. Next year the real balance is £1,100,000, so 5% would be £55,000, but the ceiling caps the raise at 50,000 × 1.05 = **£52,500**. If instead the balance fell to £800,000, 5% would be £40,000, but the floor limits the cut to 50,000 × 0.975 = **£48,750**.

Why it helps: in good years you bank some of the gains instead of spending them all; in bad years you cut a little, which protects the portfolio. Vanguard's research found flexibility on the downside (the floor) matters most.

---

## `RetirementSimulator`: the Monte Carlo simulation

### The picture

Instead of assuming the market earns a steady 7% every year, the simulator **replays real history in random order**, thousands of times. Each simulated year picks a random year from 1928–2025 and uses that year's real stock and bond returns. One full run (saving years plus retirement years) is a **path**. Run 5,000 paths and you see the whole range of possible futures: the median, the lucky ones, and the unlucky ones.

This is called a **bootstrap**: sampling from real data with replacement (the same year can come up more than once).

### Why replay history instead of using a bell curve?

- **Real crashes happen more often than a bell curve predicts.** Stocks lost 34% or more after inflation in 4 of the 98 years (1931, 1937, 1974, 2008). A bell curve with the same average (8.6%) and volatility (19.3%) expects about 1.3 such years. Those "fat tails" are what sink retirements.
- **Stocks and bonds stay matched.** Picking a whole year keeps that year's stock *and* bond return together, so their real relationship (including years like 2022 when both fell) is preserved without modeling it separately.
- **Honest limitation:** years are picked independently, so multi-year stretches like the 1970s (the worst decade for a 60/40 portfolio, see [Data and Athena](04-data-and-athena.md)) are broken up. A "block bootstrap" that samples runs of several years would keep them.

### Step by step

```
1. Work out the growth multiplier each historical year would give this portfolio:
   growth = 1 + (stocks% × real stock return + bonds% × real bond return) − fee
2. For each path (e.g. 5,000 times):
   a. Draw one random historical year for every simulated year.
   b. Saving years: balance = balance × growth + yearly contribution.
   c. At retirement, first-year spending = withdrawal rate × balance (4% → "the 4% rule").
   d. Retirement years, twice on the same path, once per spending rule:
        - withdraw this year's spending at the start of the year,
        - then grow what's left.
      Fixed spending: the same amount every year (in today's dollars).
      Dynamic spending: DynamicSpending.nextSpending(...) each year after the first.
   e. Count the path a "success" if every year's planned spending was fully paid.
3. For every year, read the 10th/25th/50th/75th/90th percentiles across all paths.
4. Success rate = successful paths ÷ all paths.
```

Key lines:

```java
// One growth number per historical year, worked out once instead of once per simulated year.
growth[i] = 1 + portfolioReturn - inputs.expenseRatio();

// One path: a random historical year for each simulated year.
growth[i] = yearlyGrowth[random.nextInt(yearlyGrowth.length)];

// Saving phase.
balance = balance * growth[year - 1] + inputs.annualContribution();

// Retirement phase (inside retire()).
if (dynamic && year > 0) {
    planned = DynamicSpending.nextSpending(planned, balance, inputs.withdrawalRate());
}
double withdrawal = Math.min(planned, balance);    // can't spend money you don't have
if (withdrawal < planned) {
    fullyPaid = false;                              // ran out: this path failed
}
balance = (balance - withdrawal) * growth[saving + year];
```

### Design details worth knowing

- **Both rules use the same market path.** `retire(...)` is called twice with the same `growth` array, so any difference in results comes from the spending rule alone, not luck.
- **Data layout `[year][path]`:** `double[][] balances = new double[totalYears + 1][sims]`. Each row holds one year's value across every path, which is exactly what the percentile step needs. Plain `double[]` arrays are used instead of `List<Double>` because there are hundreds of thousands of numbers, and arrays avoid wrapping each number in an object.
- **The random generator is passed in** (`RandomGenerator random`). The API creates a new `SplittableRandom(seed)` per request, so the same seed always gives the same answer (used in tests), and requests never share a generator.
- **Success means fully funded.** Under fixed spending, a path fails when the money can't cover the planned amount. Dynamic spending usually succeeds more often (97% vs 90% with the default inputs) because it cuts back after bad years, but its spending varies more.
- **Speed:** O(simulations × years). 10,000 paths × 120 years is the largest request the API allows, and takes about 0.4 seconds once Java is warmed up. The first version took about 7 seconds on its first call; working out each historical year's growth multiplier once, instead of again for every simulated year, brought that under half a second. Measuring found it.
- **Withdrawals happen at the start of each year**, a common, slightly conservative convention.

### Example output (default inputs: $50,000 saved, $10,000/year for 30 years, then 30 years retired, 60/40, 4%)

| | Fixed spending | Dynamic spending |
|---|---|---|
| Chance the money lasts | about 90% | about 97% |
| Median first-year spending | about $37,000 | same |
| Median spending in the last year | flat, then a little lower as some paths run out | higher, about $49,000, because good markets allow raises |

---

## `HistoryStatistics`: describing the history

Used by `GET /assumptions` to show what the simulator is built on. Four calculations:

| Measure | Formula (in words) | Stocks, 1928–2025 (real) |
|---|---|---|
| **Average return** (arithmetic mean) | Add the yearly returns, divide by the count | 8.6% |
| **Compounded return** (geometric mean) | Grow $1 through every year, then find the steady rate that gives the same result: (product of (1 + r))^(1/n) − 1 | 6.8% |
| **Volatility** (sample standard deviation) | How far returns typically land from their average; divides by n − 1 | 19.3% |
| **Correlation** (Pearson) | +1 = stocks and bonds always move together, −1 = opposite, 0 = unrelated | 0.09 |

**Why the average and compounded return differ:** up 10% then down 10% averages 0%, but $1 becomes 1.10 × 0.90 = **$0.99**: you lost money. The more returns bounce around, the further the compounded return falls below the average. This "volatility drag" is why the simulator replays real sequences instead of assuming the average every year.

---

## `PortfolioAnalyzer`: checkup and rebalancing

### Inputs and outputs

- **In:** a list of `Holding`s (name, `AssetClass`, dollar value, expense ratio), a target mix (`Map<AssetClass, Double>`, adding up to 1), new money to invest, and a drift threshold (e.g. 0.05 = 5 percentage points).
- **Out:** a `PortfolioReport`: total value, weighted average fee, yearly fees in dollars, current vs target per asset class, the largest drift, the trades, the mix after the trades, and warnings.

### The calculations

- **Current mix:** add up holdings by asset class (`current.merge(assetClass, value, Double::sum)`), divide each by the total.
- **Drift** = current share − target share. 65% US stocks against a 50% target is **+15 points**.
- **Weighted expense ratio** = Σ(value × fee) ÷ total. Fees are weighted by dollars, so a small expensive fund matters less than a big one.

### The rebalancing plan: new money first, sell only if needed

Vanguard's research recommends rebalancing with cash flows (new contributions) where possible, because selling can mean taxes. So:

1. **Put new money where it's most needed.** The total after investing is `total + newMoney`. Each class's **shortfall** = target share × new total − current value (or 0 if it's overweight). New money is split across the underweight classes in proportion to their shortfalls. If there's more money than shortfall, the extra is split by target weights.
2. **Check the drift after that.** If every class is now within the threshold, stop: the plan is buys only.
3. **Otherwise, rebalance fully.** Each class's trade = target share × new total − current value: positive is a **buy**, negative is a **sell**. Afterwards every class is exactly on target, and a warning mentions possible capital gains taxes.

**Worked example (from the tests).** $100,000: US stocks $60,000, international $20,000, bonds $20,000. Target 50 / 30 / 20.
- With **$10,000 new money**, the new total is $110,000. Targets: international $33,000 (short $13,000), bonds $22,000 (short $2,000), US $55,000 (over). The $10,000 is split 13:2: **buy $8,666.67 international, $1,333.33 bonds.** The largest drift left is about 4.5 points, under 5, so nothing is sold.
- With **no new money**, US stocks are 10 points over, so it rebalances fully: **sell $10,000 US stocks, buy $10,000 international.**

### Other details

- **Warnings:** any holding with a fee above 0.50% ("Many broad index funds charge less than 0.10%"), and the tax note when the plan sells.
- **`EnumMap`** is a map whose keys are an enum. It keeps the asset classes in their declared order (US, international, bonds, cash), which keeps the output order stable.
- **There's no single right threshold.** Vanguard's research found no optimal threshold or frequency, so the threshold is the user's choice; 5 points is a common one.
- **Trades under one cent are skipped** (`SMALLEST_TRADE`), so floating-point dust like $0.0000001 never becomes a "trade."

## Key facts

- **Fee drag:** growth = 1 + return − fee; each year multiplies the last balance (compounding); the fee comes out of a growing balance.
- **Real return** = (1 + nominal) / (1 + inflation) − 1. The simulator works in real terms, so it shows today's dollars.
- **Monte Carlo here = bootstrap:** each simulated year is a random real year from 1928–2025, keeping that year's stock and bond returns together.
- **Both spending rules run on the same paths**, so the comparison is fair.
- **Dynamic spending** = target % of the balance, clamped between −2.5% and +5% of last year's spending.
- **Average vs compounded return:** volatility makes the compounded return lower (8.6% vs 6.8% for stocks).
- **Rebalancing:** new money to underweight classes first; sell only if drift is still past the threshold.
