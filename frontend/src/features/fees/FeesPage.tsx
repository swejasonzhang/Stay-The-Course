import { useEffect, useState, type FormEvent } from "react";
import { Area, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api } from "../../api/client";
import type { FeeRequest, FeeResponse } from "../../api/types";
import { ChartFrame } from "../../components/ChartFrame";
import { ChartTooltip } from "../../components/ChartTooltip";
import { ErrorMessage } from "../../components/ErrorMessage";
import { FormSection } from "../../components/FormSection";
import { CostIcon } from "../../components/Icons";
import { Insight } from "../../components/Insight";
import { NumberField } from "../../components/NumberField";
import { PageHeader } from "../../components/PageHeader";
import { SliderField } from "../../components/SliderField";
import { LoadingResults, SkeletonChart, SkeletonInsight, SkeletonTiles } from "../../components/Skeleton";
import { StatTile } from "../../components/StatTile";
import { formatCompactDollars, formatDollars } from "../../lib/format";
import { friendlyError, percentToDecimal, toNumber } from "../../lib/forms";
import { feeInsight } from "../../lib/insights";
import { yearTicks } from "../../lib/scales";
import { useCompact } from "../../lib/useCompact";
import { useRequest } from "../../lib/useRequest";

const DEFAULTS = { initial: "10000", annualReturn: "7", fundFee: "1", baselineFee: "0.04", years: "30" };

interface Row {
  year: number;
  fund: number;
  baseline: number;
  gap: [number, number];
}

// Form text to API request: percents become decimals (7 becomes 0.07).
function toRequest(values: typeof DEFAULTS): FeeRequest {
  return {
    initial: toNumber(values.initial),
    annualReturn: percentToDecimal(values.annualReturn),
    fundFee: percentToDecimal(values.fundFee),
    baselineFee: percentToDecimal(values.baselineFee),
    years: toNumber(values.years),
  };
}

// Cost principle: how much an expense ratio takes from a balance over the years.
export function FeesPage() {
  const [values, setValues] = useState(DEFAULTS);
  const [submitted, setSubmitted] = useState(DEFAULTS);
  const { data, error, loading, run, fieldErrors } = useRequest<FeeResponse>();

  const set = (field: keyof typeof DEFAULTS) => (value: string) => setValues({ ...values, [field]: value });

  const calculate = (event: FormEvent) => {
    event.preventDefault();
    setSubmitted(values);
    run(() => api.fees(toRequest(values)));
  };

  // Show a result as soon as the page opens, using the default inputs.
  useEffect(() => {
    run(() => api.fees(toRequest(DEFAULTS)));
  }, [run]);

  const rows: Row[] = data
    ? data.fundBalances.map((fund, year) => ({
        year,
        fund,
        baseline: data.baselineBalances[year],
        gap: [fund, data.baselineBalances[year]],
      }))
    : [];
  const years = rows.length - 1;

  return (
    <>
      <PageHeader eyebrow="Cost" icon={<CostIcon size={14} />} title="What does your fund's fee really cost?">
        An expense ratio looks tiny, but it's taken every year from a balance that keeps growing. Compare your fund
        with a low-cost index fund and see the dollars it costs by the end.
      </PageHeader>
      <div className="layout">
        <form className="card sidebar" onSubmit={calculate}>
          <FormSection title="Your investment">
            <NumberField id="initial" label="Starting balance" prefix="$" value={values.initial}
              onChange={set("initial")} error={fieldErrors.initial} />
            <SliderField id="years" label="Years invested" value={values.years} onChange={set("years")}
              min={1} max={50} step={1} error={fieldErrors.years} />
          </FormSection>
          <FormSection title="Fees">
            <SliderField id="fundFee" label="Your fund's expense ratio" suffix="%" value={values.fundFee}
              onChange={set("fundFee")} min={0} max={2} step={0.01} error={friendlyError(fieldErrors.fundFee, true)} />
            <SliderField id="baselineFee" label="Low-cost fund's expense ratio" suffix="%" value={values.baselineFee}
              onChange={set("baselineFee")} min={0} max={0.5} step={0.01}
              error={friendlyError(fieldErrors.baselineFee, true)} hint="Broad index funds often charge under 0.10%." />
          </FormSection>
          <FormSection title="Market">
            <SliderField id="annualReturn" label="Expected yearly return" suffix="%" value={values.annualReturn}
              onChange={set("annualReturn")} min={0} max={12} step={0.1}
              error={friendlyError(fieldErrors.annualReturn, true)} hint="Before fees. The same for both funds." />
          </FormSection>
          <button type="submit" className="primary" disabled={loading}>
            {loading ? "Calculating…" : "Calculate"}
          </button>
        </form>

        <div className={loading && data ? "stack results loading" : "stack results"}>
          <ErrorMessage error={error} shownFields={Object.keys(DEFAULTS)} />
          {!data && !error && (
            <LoadingResults>
              <SkeletonInsight />
              <SkeletonTiles count={3} />
              <SkeletonChart height={340} />
            </LoadingResults>
          )}
          {data && (
            <>
              <Insight insight={feeInsight(data, percentToDecimal(submitted.fundFee), percentToDecimal(submitted.baselineFee))} />
              <div className="kpi-row">
                <StatTile featured label="What the higher fee costs" value={formatDollars(data.feeCost)}
                  detail={`after ${years} years`} />
                <StatTile label="Your fund" color="var(--series-2)" value={formatDollars(rows[years].fund)}
                  detail="ending balance" />
                <StatTile label="Low-cost fund" color="var(--series-1)" value={formatDollars(rows[years].baseline)}
                  detail="ending balance" />
              </div>
              <ChartFrame
                title="Balance over time"
                subtitle="Same money and same market return. The shaded gap is what the higher fee takes."
                legend={[
                  { label: "Low-cost fund", color: "var(--series-1)", shape: "line" },
                  { label: "Your fund", color: "var(--series-2)", shape: "line" },
                  { label: "Lost to fees", color: "color-mix(in srgb, var(--series-2) 30%, transparent)", shape: "bar" },
                ]}
                chart={<FeeChart rows={rows} />}
                table={<FeeTable rows={rows} />}
              />
            </>
          )}
        </div>
      </div>
    </>
  );
}

function FeeChart({ rows }: { rows: Row[] }) {
  const compact = useCompact();
  const last = rows.length - 1;
  // Name each line at its right-hand end, so identity never depends on color alone.
  const endLabel = (name: string) => (props: { x?: number | string; y?: number | string; index?: number }) =>
    props.index === last ? (
      <text x={Number(props.x) + 8} y={Number(props.y)} dy={4} fontSize={12} fill="var(--text-secondary)">
        {name}
      </text>
    ) : (
      <g />
    );

  return (
    <ResponsiveContainer width="100%" height={340}>
      <ComposedChart data={rows} margin={{ top: 8, right: compact ? 12 : 110, bottom: 8, left: compact ? 0 : 8 }}>
        <CartesianGrid stroke="var(--grid)" vertical={false} />
        <XAxis dataKey="year" ticks={yearTicks(0, last)} stroke="var(--axis)" tickLine={false}
          tick={{ fill: "var(--text-muted)", fontSize: 12 }}
          label={{ value: "Years", position: "insideBottomRight", offset: -4, fill: "var(--text-muted)", fontSize: 12 }} />
        <YAxis tickFormatter={formatCompactDollars} stroke="var(--axis)" axisLine={false} tickLine={false} width={compact ? 52 : 72}
          tick={{ fill: "var(--text-muted)", fontSize: 12 }} />
        <Tooltip
          cursor={{ stroke: "var(--axis)", strokeWidth: 1 }}
          content={(props) => (
            <ChartTooltip<Row>
              {...props}
              title={(row) => `Year ${row.year}`}
              rows={(row) => [
                { name: "Low-cost fund", value: formatDollars(row.baseline), color: "var(--series-1)" },
                { name: "Your fund", value: formatDollars(row.fund), color: "var(--series-2)" },
                { name: "lost to the higher fee", value: formatDollars(row.baseline - row.fund), color: "transparent" },
              ]}
            />
          )}
        />
        <Area type="linear" dataKey="gap" stroke="none" fill="var(--series-2)" fillOpacity={0.12}
          isAnimationActive={false} activeDot={false} />
        <Line type="linear" dataKey="baseline" stroke="var(--series-1)" strokeWidth={2} dot={false}
          activeDot={{ r: 4, stroke: "var(--surface)", strokeWidth: 2 }} isAnimationActive={false}
          label={compact ? undefined : endLabel("Low-cost fund")} />
        <Line type="linear" dataKey="fund" stroke="var(--series-2)" strokeWidth={2} dot={false}
          activeDot={{ r: 4, stroke: "var(--surface)", strokeWidth: 2 }} isAnimationActive={false}
          label={compact ? undefined : endLabel("Your fund")} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

function FeeTable({ rows }: { rows: Row[] }) {
  return (
    <table>
      <thead>
        <tr>
          <th>Year</th>
          <th>Your fund</th>
          <th>Low-cost fund</th>
          <th>Lost to fees</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.year}>
            <td>{row.year}</td>
            <td>{formatDollars(row.fund)}</td>
            <td>{formatDollars(row.baseline)}</td>
            <td>{formatDollars(row.baseline - row.fund)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
