import { useEffect, useState, type FormEvent } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api } from "../../api/client";
import type { SimulationRequest, SimulationResponse } from "../../api/types";
import { ChartFrame } from "../../components/ChartFrame";
import { ChartTooltip } from "../../components/ChartTooltip";
import { ErrorMessage } from "../../components/ErrorMessage";
import { FormSection } from "../../components/FormSection";
import { GoalsIcon } from "../../components/Icons";
import { Insight } from "../../components/Insight";
import { NumberField } from "../../components/NumberField";
import { PageHeader } from "../../components/PageHeader";
import { SliderField } from "../../components/SliderField";
import { LoadingResults, SkeletonChart, SkeletonInsight, SkeletonTiles } from "../../components/Skeleton";
import { StatTile } from "../../components/StatTile";
import { formatCompactDollars, formatDollars, formatPercent } from "../../lib/format";
import { friendlyError, percentToDecimal, toNumber } from "../../lib/forms";
import { retirementInsight } from "../../lib/insights";
import { yearTicks } from "../../lib/scales";
import { useCompact } from "../../lib/useCompact";
import { useRequest } from "../../lib/useRequest";
import { BandChart, BandTable } from "./BandChart";
import { toBandRows } from "./bands";

const DEFAULTS = {
  currentBalance: "50000",
  annualContribution: "10000",
  yearsToRetirement: "30",
  yearsInRetirement: "30",
  withdrawalRate: "4",
  stockAllocation: "60",
  expenseRatio: "0.05",
  simulations: "5000",
  seed: "2026",
};

const FIXED_COLOR = "var(--series-1)";
const DYNAMIC_COLOR = "var(--series-2)";

function toRequest(values: typeof DEFAULTS): SimulationRequest {
  return {
    currentBalance: toNumber(values.currentBalance),
    annualContribution: toNumber(values.annualContribution),
    yearsToRetirement: toNumber(values.yearsToRetirement),
    yearsInRetirement: toNumber(values.yearsInRetirement),
    withdrawalRate: percentToDecimal(values.withdrawalRate),
    stockAllocation: percentToDecimal(values.stockAllocation),
    expenseRatio: percentToDecimal(values.expenseRatio),
    simulations: toNumber(values.simulations),
    ...(values.seed.trim() === "" ? {} : { seed: toNumber(values.seed) }),
  };
}

// Goals principle: will the money last? Thousands of simulated markets, two spending rules.
export function RetirementPage() {
  const [values, setValues] = useState(DEFAULTS);
  const { data, error, loading, run, fieldErrors } = useRequest<SimulationResponse>();
  const set = (field: keyof typeof DEFAULTS) => (value: string) => setValues({ ...values, [field]: value });

  const simulate = (event: FormEvent) => {
    event.preventDefault();
    run(() => api.simulate(toRequest(values)));
  };

  useEffect(() => {
    run(() => api.simulate(toRequest(DEFAULTS)));
  }, [run]);

  return (
    <>
      <PageHeader eyebrow="Goals" icon={<GoalsIcon size={14} />} title="Will your money last?">
        Each simulation replays real market years from 1928–2025 in random order, thousands of times, in today's
        dollars. Two spending rules face the same markets: <strong>fixed spending</strong> (the classic "4% rule")
        and <strong>dynamic spending</strong> (Vanguard's guardrails: never raise spending more than 5% or cut it more
        than 2.5% in a year).
      </PageHeader>
      <div className="layout">
        <form className="card sidebar" onSubmit={simulate}>
          <FormSection title="Saving">
            <NumberField id="currentBalance" label="Current savings" prefix="$" value={values.currentBalance}
              onChange={set("currentBalance")} error={fieldErrors.currentBalance} />
            <NumberField id="annualContribution" label="Saved each year" prefix="$" value={values.annualContribution}
              onChange={set("annualContribution")} error={fieldErrors.annualContribution} />
            <SliderField id="yearsToRetirement" label="Years until retirement" value={values.yearsToRetirement}
              onChange={set("yearsToRetirement")} min={0} max={50} step={1} error={fieldErrors.yearsToRetirement} />
          </FormSection>
          <FormSection title="Retirement">
            <SliderField id="yearsInRetirement" label="Years in retirement" value={values.yearsInRetirement}
              onChange={set("yearsInRetirement")} min={1} max={50} step={1} error={fieldErrors.yearsInRetirement} />
            <SliderField id="withdrawalRate" label="First-year withdrawal rate" suffix="%"
              value={values.withdrawalRate} onChange={set("withdrawalRate")} min={2} max={8} step={0.1}
              error={friendlyError(fieldErrors.withdrawalRate, true)}
              hint="Share of savings spent in the first year of retirement." />
          </FormSection>
          <FormSection title="Portfolio">
            <SliderField id="stockAllocation" label="Stocks" suffix="%" value={values.stockAllocation}
              onChange={set("stockAllocation")} min={0} max={100} step={5}
              error={friendlyError(fieldErrors.stockAllocation, true)} hint="The rest is in bonds, rebalanced yearly." />
            <NumberField id="expenseRatio" label="Average fund fee" suffix="%" value={values.expenseRatio}
              onChange={set("expenseRatio")} error={friendlyError(fieldErrors.expenseRatio, true)} />
          </FormSection>
          <FormSection title="Simulation">
            <div className="pair">
              <NumberField id="simulations" label="Simulations" step="100" value={values.simulations}
                onChange={set("simulations")} error={fieldErrors.simulations} />
              <NumberField id="seed" label="Random seed" step="1" value={values.seed} onChange={set("seed")}
                error={fieldErrors.seed} />
            </div>
            <p className="form-note">
              100 to 10,000 simulations. The same seed gives the same markets; clear it for a fresh draw.
            </p>
          </FormSection>
          <button type="submit" className="primary" disabled={loading}>
            {loading ? "Simulating…" : "Run simulation"}
          </button>
        </form>

        <div className={loading && data ? "stack results loading" : "stack results"}>
          <ErrorMessage error={error} shownFields={Object.keys(DEFAULTS)} />
          {!data && !error && (
            <LoadingResults>
              <SkeletonInsight />
              <SkeletonTiles count={4} />
              <div className="small-multiples">
                <SkeletonChart height={260} />
                <SkeletonChart height={260} />
              </div>
              <SkeletonChart height={280} />
            </LoadingResults>
          )}
          {data && <Results data={data} />}
        </div>
      </div>
    </>
  );
}

function Results({ data }: { data: SimulationResponse }) {
  const fixed = toBandRows(data.constantSpending.balances);
  const dynamic = toBandRows(data.dynamicSpending.balances);
  // Both charts share one y-axis so they can be compared at a glance.
  const yMax = Math.max(...fixed.map((r) => r.p90), ...dynamic.map((r) => r.p90));
  const fixedSpending = toBandRows(data.constantSpending.spending, 1);
  const dynamicSpending = toBandRows(data.dynamicSpending.spending, 1);

  return (
    <>
      <Insight insight={retirementInsight(data)} />
      <div className="kpi-row">
        <StatTile label="Fixed spending" color={FIXED_COLOR}
          value={formatPercent(data.constantSpending.successRate, 0)} detail="chance the money lasts" />
        <StatTile label="Dynamic spending" color={DYNAMIC_COLOR}
          value={formatPercent(data.dynamicSpending.successRate, 0)} detail="chance the money lasts" />
        <StatTile label="Savings at retirement" value={formatCompactDollars(data.medianBalanceAtRetirement)}
          detail="median, today's dollars" />
        <StatTile label="First-year spending" value={formatDollars(data.medianFirstYearSpending)}
          detail="median, today's dollars" />
      </div>

      <div className="small-multiples">
        <ChartFrame
          title="Savings: fixed spending"
          subtitle="Line: median. Bands: middle 50% and 80% of simulations."
          chart={<BandChart rows={fixed} color={FIXED_COLOR} yMax={yMax} retirementYear={data.retirementYear}
            xLabel="Years from today" />}
          table={<BandTable rows={fixed} yearLabel="Year" />}
        />
        <ChartFrame
          title="Savings: dynamic spending"
          subtitle="Line: median. Bands: middle 50% and 80% of simulations."
          chart={<BandChart rows={dynamic} color={DYNAMIC_COLOR} yMax={yMax} retirementYear={data.retirementYear}
            xLabel="Years from today" />}
          table={<BandTable rows={dynamic} yearLabel="Year" />}
        />
      </div>

      <ChartFrame
        title="Yearly spending in retirement (median)"
        subtitle="Fixed spending stays flat until the money runs out; dynamic spending moves with the markets."
        legend={[
          { label: "Fixed spending", color: FIXED_COLOR, shape: "line" },
          { label: "Dynamic spending", color: DYNAMIC_COLOR, shape: "line" },
        ]}
        chart={<SpendingChart fixed={fixedSpending.map((r) => r.p50)} dynamic={dynamicSpending.map((r) => r.p50)} />}
        table={<SpendingTable fixed={fixedSpending} dynamic={dynamicSpending} />}
      />
    </>
  );
}

interface SpendingRow {
  year: number;
  fixed: number;
  dynamic: number;
}

function SpendingChart({ fixed, dynamic }: { fixed: number[]; dynamic: number[] }) {
  const compact = useCompact();
  const rows: SpendingRow[] = fixed.map((value, i) => ({ year: i + 1, fixed: value, dynamic: dynamic[i] }));
  const last = rows.length - 1;
  const endLabel = (name: string) => (props: { x?: number | string; y?: number | string; index?: number }) =>
    props.index === last ? (
      <text x={Number(props.x) + 8} y={Number(props.y)} dy={4} fontSize={12} fill="var(--text-secondary)">
        {name}
      </text>
    ) : (
      <g />
    );
  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={rows} margin={{ top: 8, right: compact ? 12 : 70, bottom: 8, left: compact ? 0 : 8 }}>
        <CartesianGrid stroke="var(--grid)" vertical={false} />
        <XAxis dataKey="year" ticks={yearTicks(1, rows.length)} stroke="var(--axis)" tickLine={false}
          tick={{ fill: "var(--text-muted)", fontSize: 12 }}
          label={{ value: "Year of retirement", position: "insideBottomRight", offset: -4, fill: "var(--text-muted)", fontSize: 12 }} />
        <YAxis tickFormatter={formatCompactDollars} stroke="var(--axis)" axisLine={false} tickLine={false} width={compact ? 52 : 72}
          tick={{ fill: "var(--text-muted)", fontSize: 12 }} />
        <Tooltip
          cursor={{ stroke: "var(--axis)", strokeWidth: 1 }}
          content={(props) => (
            <ChartTooltip<SpendingRow>
              {...props}
              title={(row) => `Retirement year ${row.year}`}
              rows={(row) => [
                { name: "Fixed spending", value: formatDollars(row.fixed), color: FIXED_COLOR },
                { name: "Dynamic spending", value: formatDollars(row.dynamic), color: DYNAMIC_COLOR },
              ]}
            />
          )}
        />
        <Line type="linear" dataKey="fixed" stroke={FIXED_COLOR} strokeWidth={2} dot={false} isAnimationActive={false}
          activeDot={{ r: 4, stroke: "var(--surface)", strokeWidth: 2 }} label={compact ? undefined : endLabel("Fixed")} />
        <Line type="linear" dataKey="dynamic" stroke={DYNAMIC_COLOR} strokeWidth={2} dot={false}
          isAnimationActive={false} activeDot={{ r: 4, stroke: "var(--surface)", strokeWidth: 2 }}
          label={compact ? undefined : endLabel("Dynamic")} />
      </LineChart>
    </ResponsiveContainer>
  );
}

function SpendingTable({ fixed, dynamic }: { fixed: ReturnType<typeof toBandRows>; dynamic: ReturnType<typeof toBandRows> }) {
  return (
    <table>
      <thead>
        <tr>
          <th>Retirement year</th>
          <th>Fixed: 10th pct</th>
          <th>Fixed: median</th>
          <th>Dynamic: 10th pct</th>
          <th>Dynamic: median</th>
          <th>Dynamic: 90th pct</th>
        </tr>
      </thead>
      <tbody>
        {fixed.map((row, i) => (
          <tr key={row.year}>
            <td>{row.year}</td>
            <td>{formatDollars(row.p10)}</td>
            <td>{formatDollars(row.p50)}</td>
            <td>{formatDollars(dynamic[i].p10)}</td>
            <td>{formatDollars(dynamic[i].p50)}</td>
            <td>{formatDollars(dynamic[i].p90)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
