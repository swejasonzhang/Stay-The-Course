# 5. The frontend: React + TypeScript

Folder: [`frontend/`](../frontend/)

| Tool | Job | MERN equivalent |
|---|---|---|
| **Vite** | Dev server with instant reload; builds the production files into `dist/` | create-react-app / webpack |
| **React 19** | The UI | Same React |
| **TypeScript** | JavaScript with types, checked before the code runs | — |
| **Recharts** | Line, area and bar charts as React components | Chart.js / Recharts |
| **Vitest** | Unit tests | Jest |
| **oxlint** | Linting | ESLint |

Commands (in `frontend/`): `npm install`, `npm run dev` (http://localhost:5173), `npm test`, `npm run lint`, `npm run build`.

## File map

```
src/
  main.tsx              mounts <App /> into index.html and loads styles.css
  App.tsx               header, the four tabs, footer; picks the page from the URL hash
  styles.css            design tokens (colors for light and dark mode) and layout
  api/
    types.ts            TypeScript copies of every backend request/response record
    client.ts           fetch wrapper: one function per endpoint, ApiError for failures
  lib/
    format.ts           $17,839 / $1.3M / 7.0% / +15.0 pts / "International stocks"
    forms.ts            form text → numbers; percent → decimal; friendlier error text
    scales.ts           round axis ticks ($0, $2M, $4M…) and year ticks (every 5 or 10)
    useRequest.ts       a hook that runs an API call and tracks data / error / loading
  components/
    NumberField.tsx     labeled number input with $ or % and an error line
    StatTile.tsx        one headline number
    ChartFrame.tsx      card with title, legend and a "Show table" toggle
    ChartTooltip.tsx    the hover box every chart uses
    ErrorMessage.tsx    shows API errors that aren't tied to a specific input
  features/
    fees/FeesPage.tsx                 Cost tab
    retirement/RetirementPage.tsx     Goals tab
    retirement/BandChart.tsx          the "fan chart" (median line + shaded bands)
    retirement/bands.ts               turns the API's percentile lists into chart rows
    portfolio/PortfolioPage.tsx       Balance & Discipline tab (holdings editor + results)
    portfolio/AllocationChart.tsx     current-vs-target bars, in plain HTML
    assumptions/AssumptionsPage.tsx   Assumptions tab (stats + yearly return bars)
```

## How a page works, start to finish (the Cost tab)

1. **Form state is text.** `useState(DEFAULTS)` holds every input as a string (`"7"`, `"0.04"`), so typing "0." doesn't get mangled into 0.
2. **On submit, convert.** `toRequest(values)` turns text into the exact JSON the backend expects:
   ```ts
   annualReturn: percentToDecimal(values.annualReturn),   // "7" → 0.07
   years: toNumber(values.years),                          // "30" → 30, "" → NaN
   ```
   **The units bug is handled here:** people type 7 for 7%, the API takes 0.07. And an empty box becomes `NaN`, which `JSON.stringify` sends as `null`, so the backend answers "must not be null" instead of the form quietly sending 0.
3. **Call the API.** `run(() => api.fees(request))` from the `useRequest` hook.
4. **`useRequest` tracks the call:** `loading` while waiting, `data` on success, `error` on failure. If you submit twice quickly, only the newest answer is kept (it counts calls with a `useRef`).
5. **Render.** While loading, the old results stay visible but faded (`.results.loading`), instead of flashing a blank screen. Then stat tiles, the chart, and the table toggle.
6. **On page open**, a `useEffect` runs the calculation once with the defaults, so every tab shows real results immediately.

## The API client ([`api/client.ts`](../frontend/src/api/client.ts))

```ts
export const API_URL = (import.meta.env.VITE_API_URL ?? "http://localhost:8080").replace(/\/$/, "");
```

- `VITE_API_URL` is set **at build time**. Locally it defaults to the Spring Boot server; `deploy.sh` builds with the API Gateway URL.
- Every failure becomes an `ApiError` with a `status`:
  - **422** → `fieldErrors`, the backend's `{ "years": "must be less than or equal to 100" }` map;
  - **400** → the backend's `error` message;
  - **network failure** (backend down, or CORS refused) → status 0, "Can't reach the API."
- `types.ts` mirrors the backend's records field for field. TypeScript then catches typos like `annual_return` at compile time.

### Showing validation errors next to the right input

Each input passes `error={fieldErrors.years}`. Nested errors use the backend's paths: the portfolio editor shows `fieldErrors["holdings[2].value"]` under the third holding's value box. Any error that isn't shown next to an input is listed by `ErrorMessage`, so nothing is hidden.

`friendlyError(message, true)` rewrites the backend's decimal limits for percent fields: "must be less than or equal to 0.1" becomes "must be at most 10%", matching what the user typed.

## Charts

All charts follow the same rules:

- **Colors are defined once as CSS variables** in `styles.css` (`--series-1`, `--text-secondary`, …) and used by role. Recharts accepts them directly: `stroke="var(--series-1)"`.
- **Each thing keeps its color everywhere.** On the Goals tab, fixed spending is always blue and dynamic spending is always orange, in the tiles, both fan charts and the spending chart. The color pair was checked with a palette validator for color-blind readers in both light and dark mode.
- **Dark mode has its own validated colors**, not an automatic inversion. `@media (prefers-color-scheme: dark)` swaps the variables.
- **Identity never depends on color alone:** lines are named at their right end, every chart with two series has a legend, and every chart has a **Show table** toggle with the exact numbers.
- **Thin marks:** 2px lines, hairline solid gridlines, bands drawn as 10% washes.
- **Shared tooltip** (`ChartTooltip`): value first, then the series name, with a short line in the series color.
- **Round axis ticks** from `lib/scales.ts`: `niceScale` picks steps of 1, 2, 2.5 or 5 × a power of ten, so the axis reads $0 / $2M / $4M / $6M instead of $1.4M / $2.9M.

### The fan chart ([`BandChart.tsx`](../frontend/src/features/retirement/BandChart.tsx))

The backend sends five lists per rule (`p10`, `p25`, `p50`, `p75`, `p90`). `toBandRows` reshapes them into one object per year, plus two ranges:

```ts
outer: [bands.p10[i], bands.p90[i]],   // middle 80% of simulations
inner: [bands.p25[i], bands.p75[i]],   // middle 50%
```

Recharts draws an `<Area>` between the two values of a range. Both bands are drawn at 10% opacity; where they overlap, the inner band naturally looks darker. The median is a solid line on top, and a vertical line marks the retirement year. **Both fan charts share one y-axis**, so fixed and dynamic spending can be compared at a glance.

### The allocation bars ([`AllocationChart.tsx`](../frontend/src/features/portfolio/AllocationChart.tsx))

Four bars don't need a chart library, so these are plain `<div>`s: a blue bar for the current share and a thin orange marker for the target. Each bar can be focused with the keyboard (`tabIndex={0}`) and has an `aria-label` with its details; hovering or focusing shows them under the chart.

### The yearly returns bars (Assumptions tab)

98 thin bars per chart: blue for gains, red for losses, rounded only at the end away from zero (a small custom `shape` function). Stocks and bonds use the same y-axis, so bonds' smaller swings are visible at a glance.

## Navigation without a router

The current tab lives in the URL hash (`#retirement`). `App.tsx` reads it on load and listens for `hashchange`. Links and the back button work with no router library. The site is a single `index.html`, which suits S3 + CloudFront hosting.

## Tests ([`lib/*.test.ts`](../frontend/src/lib/), [`api/client.test.ts`](../frontend/src/api/client.test.ts))

- **Formatting:** dollars, compact dollars, percents, signed points.
- **Form conversion:** "7" → 0.07, an empty box → `null` in JSON, decimal limits rewritten as percents.
- **Axis scales:** round steps, ticks covering the data, year ticks.
- **API client:** with a fake `fetch`, a 200 returns the body, a 422 becomes field errors, a 400 uses the backend's message, and a network failure says the API can't be reached.

## Key facts

- **Form text → `toRequest` → `api.*` → `useRequest` → render.** Percents become decimals in `toRequest`.
- **`VITE_API_URL`** is baked in at build time; locally it's `http://localhost:8080`.
- **422 field errors appear next to their inputs**, matched by the backend's field paths.
- **Colors are CSS variables**, each series keeps its color everywhere, and every chart has a table view.
- **Hash navigation** (`#fees`) instead of a router; the build is static files in `dist/`.
