import { useEffect, useState, type FormEvent } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api } from "../../api/client";
import type { FeeRequest, FeeResponse } from "../../api/types";
import { ChartFrame } from "../../components/ChartFrame";
import { ChartTooltip } from "../../components/ChartTooltip";
import { ErrorMessage } from "../../components/ErrorMessage";
import { NumberField } from "../../components/NumberField";
import { friendlyError, percentToDecimal, toNumber } from "../../lib/forms";
import { StatTile } from "../../components/StatTile";
import { formatCompactDollars, formatDollars } from "../../lib/format";
import { yearTicks } from "../../lib/scales";
import { useRequest } from "../../lib/useRequest";

const DEFAULTS = { initial: "10000", annualReturn: "7", fundFee: "1", baselineFee: "0.04", years: "30" };

interface Row {
  year: number;
  fund: number;
  baseline: number;
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
  const { data, error, loading, run, fieldErrors } = useRequest<FeeResponse>();

  const set = (field: keyof typeof DEFAULTS) => (value: string) => setValues({ ...values, [field]: value });

  const calculate = (event: FormEvent) => {
    event.preventDefault();
    run(() => api.fees(toRequest(values)));
  };

  // Show a result as soon as the page opens, using the default inputs.
  useEffect(() => {
    run(() => api.fees(toRequest(DEFAULTS)));
  }, [run]);

  const rows: Row[] = data
    ? data.fundBalances.map((fund, year) => ({ year, fund, baseline: data.baselineBalances[year] }))
    : [];
  const years = rows.length - 1;

  return (
    <>
      <div className="page-intro">
        <h2>Cost: what a fee really costs</h2>
        <p>
          An expense ratio looks tiny, but it's taken every year from a balance that keeps growing. Compare your
          fund's fee with a low-cost index fund's and see the dollars it costs by the end.
        </p>
      </div>
      <div className="layout">
        <form className="card" onSubmit={calculate}>
          <NumberField id="initial" label="Starting balance" prefix="$" value={values.initial}
            onChange={set("initial")} error={fieldErrors.initial} />
          <NumberField id="annualReturn" label="Expected yearly return" suffix="%" value={values.annualReturn}
            onChange={set("annualReturn")} error={friendlyError(fieldErrors.annualReturn, true)}
            hint="Before fees. 7% is a common long-run assumption for stocks." />
          <NumberField id="fundFee" label="Your fund's expense ratio" suffix="%" value={values.fundFee}
            onChange={set("fundFee")} error={friendlyError(fieldErrors.fundFee, true)} />
          <NumberField id="baselineFee" label="Low-cost fund's expense ratio" suffix="%" value={values.baselineFee}
            onChange={set("baselineFee")} error={friendlyError(fieldErrors.baselineFee, true)} />
          <NumberField id="years" label="Years" step="1" value={values.years} onChange={set("years")}
            error={fieldErrors.years} />
          <button type="submit" className="primary" disabled={loading}>
            {loading ? "Calculating…" : "Calculate"}
          </button>
        </form>

        <div className={loading ? "stack results loading" : "stack results"}>
          <ErrorMessage error={error} shownFields={Object.keys(DEFAULTS)} />
          {data && (
            <>
              <div className="kpi-row">
                <StatTile hero label="What the higher fee costs" value={formatDollars(data.feeCost)}
                  detail={`after ${years} years`} />
                <StatTile label="Ending balance, your fund" color="var(--series-2)"
                  value={formatDollars(rows[years].fund)} />
                <StatTile label="Ending balance, low-cost fund" color="var(--series-1)"
                  value={formatDollars(rows[years].baseline)} />
              </div>
              <ChartFrame
                title="Balance over time"
                subtitle="Same money and same market return. The only difference is the fee."
                legend={[
                  { label: "Low-cost fund", color: "var(--series-1)", shape: "line" },
                  { label: "Your fund", color: "var(--series-2)", shape: "line" },
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
    <ResponsiveContainer width="100%" height={320}>
      <LineChart data={rows} margin={{ top: 8, right: 110, bottom: 8, left: 8 }}>
        <CartesianGrid stroke="var(--grid)" vertical={false} />
        <XAxis dataKey="year" ticks={yearTicks(0, last)} stroke="var(--axis)" tickLine={false}
          tick={{ fill: "var(--text-muted)", fontSize: 12 }}
          label={{ value: "Years", position: "insideBottomRight", offset: -4, fill: "var(--text-muted)", fontSize: 12 }} />
        <YAxis tickFormatter={formatCompactDollars} stroke="var(--axis)" axisLine={false} tickLine={false} width={72}
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
                { name: "Lost to the higher fee", value: formatDollars(row.baseline - row.fund), color: "transparent" },
              ]}
            />
          )}
        />
        <Line type="linear" dataKey="baseline" name="Low-cost fund" stroke="var(--series-1)" strokeWidth={2}
          dot={false} activeDot={{ r: 4, stroke: "var(--surface)", strokeWidth: 2 }} isAnimationActive={false}
          label={endLabel("Low-cost fund")} />
        <Line type="linear" dataKey="fund" name="Your fund" stroke="var(--series-2)" strokeWidth={2}
          dot={false} activeDot={{ r: 4, stroke: "var(--surface)", strokeWidth: 2 }} isAnimationActive={false}
          label={endLabel("Your fund")} />
      </LineChart>
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
          <th>Difference</th>
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
