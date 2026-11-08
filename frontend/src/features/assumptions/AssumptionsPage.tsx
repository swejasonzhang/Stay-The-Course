import { useEffect } from "react";
import { Bar, BarChart, CartesianGrid, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api } from "../../api/client";
import type { AssumptionsResponse, YearReturn } from "../../api/types";
import { ChartFrame } from "../../components/ChartFrame";
import { ChartTooltip } from "../../components/ChartTooltip";
import { ErrorMessage } from "../../components/ErrorMessage";
import { DataIcon } from "../../components/Icons";
import { Insight } from "../../components/Insight";
import { PageHeader } from "../../components/PageHeader";
import { LoadingResults, SkeletonChart, SkeletonInsight, SkeletonTiles } from "../../components/Skeleton";
import { StatTile } from "../../components/StatTile";
import { formatPercent } from "../../lib/format";
import { assumptionsInsight } from "../../lib/insights";
import { niceScale } from "../../lib/scales";
import { useRequest } from "../../lib/useRequest";

// The data behind the simulator, so its assumptions are visible instead of hidden.
export function AssumptionsPage() {
  const { data, error, loading, run } = useRequest<AssumptionsResponse>();

  useEffect(() => {
    run(() => api.assumptions());
  }, [run]);

  return (
    <>
      <PageHeader eyebrow="Assumptions" icon={<DataIcon size={14} />} title="The history behind the simulator">
        The retirement simulator doesn't assume a steady return. It replays these real years. Returns here are{" "}
        <strong>real</strong>, meaning after inflation, so they show what money could actually buy.
      </PageHeader>
      <div className={loading && data ? "stack results loading" : "stack results"}>
        <ErrorMessage error={error} />
        {!data && !error && (
          <LoadingResults>
            <SkeletonInsight />
            <SkeletonTiles count={4} />
            <SkeletonTiles count={4} />
            <SkeletonTiles count={3} />
            <div className="small-multiples">
              <SkeletonChart height={260} />
              <SkeletonChart height={260} />
            </div>
          </LoadingResults>
        )}
        {data && <Results data={data} />}
      </div>
    </>
  );
}

function Results({ data }: { data: AssumptionsResponse }) {
  // Both charts share one y-axis, so bonds' smaller swings are visible at a glance.
  const extremes = data.yearly.flatMap((y) => [y.realStocks, y.realBonds]);
  const scale = niceScale(Math.min(...extremes), Math.max(...extremes), 5);

  return (
    <>
      <Insight insight={assumptionsInsight(data)} />
      <h2 className="group-heading">Stocks · S&P 500 with dividends</h2>
      <div className="kpi-row">
        <StatTile label="Average yearly return" value={formatPercent(data.realStocks.averageReturn)} />
        <StatTile label="Compounded yearly return" value={formatPercent(data.realStocks.compoundReturn)}
          detail="what $1 actually grew at" />
        <StatTile label="Volatility" value={formatPercent(data.realStocks.volatility)} detail="standard deviation" />
        <StatTile label="Worst year" value={formatPercent(data.realStocks.worstReturn)} detail={String(data.realStocks.worstYear)} />
      </div>
      <h2 className="group-heading">Bonds · 10-year US Treasury</h2>
      <div className="kpi-row">
        <StatTile label="Average yearly return" value={formatPercent(data.realBonds.averageReturn)} />
        <StatTile label="Compounded yearly return" value={formatPercent(data.realBonds.compoundReturn)} />
        <StatTile label="Volatility" value={formatPercent(data.realBonds.volatility)} />
        <StatTile label="Worst year" value={formatPercent(data.realBonds.worstReturn)} detail={String(data.realBonds.worstYear)} />
      </div>
      <h2 className="group-heading">Inflation and the mix</h2>
      <div className="kpi-row">
        <StatTile label="Average inflation" value={formatPercent(data.averageInflation)} detail="per year" />
        <StatTile label="Stock–bond correlation" value={data.stockBondCorrelation.toFixed(2)}
          detail="0 = unrelated, 1 = move together" />
        <StatTile label="Years of history" value={String(data.years)} detail={`${data.firstYear}–${data.lastYear}`} />
      </div>

      <div className="small-multiples">
        <ChartFrame
          title="Real stock returns by year"
          subtitle="After inflation. Both charts share one scale."
          legend={[
            { label: "Gain", color: "var(--series-1)", shape: "bar" },
            { label: "Loss", color: "var(--negative)", shape: "bar" },
          ]}
          chart={<ReturnsChart rows={data.yearly} field="realStocks" scale={scale} />}
          table={<ReturnsTable rows={data.yearly} />}
        />
        <ChartFrame
          title="Real bond returns by year"
          subtitle="After inflation. Both charts share one scale."
          legend={[
            { label: "Gain", color: "var(--series-1)", shape: "bar" },
            { label: "Loss", color: "var(--negative)", shape: "bar" },
          ]}
          chart={<ReturnsChart rows={data.yearly} field="realBonds" scale={scale} />}
          table={<ReturnsTable rows={data.yearly} />}
        />
      </div>
      <p className="source-note">Source: {data.source}.</p>
    </>
  );
}

// A thin bar per year, rounded only at its data end (the top for gains, the bottom for losses).
function ReturnBar(props: { x?: number; y?: number; width?: number; height?: number; fill?: string; value?: unknown }) {
  const { x = 0, y = 0, width = 0, fill } = props;
  const height = props.height ?? 0;
  const top = Math.min(y, y + height);
  const h = Math.abs(height);
  const r = Math.min(2, width / 2, h);
  const isLoss = Array.isArray(props.value) ? Number(props.value[1]) < 0 : Number(props.value) < 0;
  const path = isLoss
    ? `M${x},${top} H${x + width} V${top + h - r} Q${x + width},${top + h} ${x + width - r},${top + h} H${x + r} Q${x},${top + h} ${x},${top + h - r} Z`
    : `M${x},${top + h} V${top + r} Q${x},${top} ${x + r},${top} H${x + width - r} Q${x + width},${top} ${x + width},${top + r} V${top + h} Z`;
  return <path d={path} fill={fill} />;
}

function ReturnsChart({ rows, field, scale }: { rows: YearReturn[]; field: "realStocks" | "realBonds"; scale: ReturnType<typeof niceScale> }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={rows} margin={{ top: 8, right: 8, bottom: 8, left: 8 }} barCategoryGap={1}>
        <CartesianGrid stroke="var(--grid)" vertical={false} />
        <XAxis dataKey="year" stroke="var(--axis)" tickLine={false} interval={19}
          tick={{ fill: "var(--text-muted)", fontSize: 12 }} />
        <YAxis domain={scale.domain} ticks={scale.ticks} tickFormatter={(v: number) => formatPercent(v, 0)} stroke="var(--axis)" axisLine={false}
          tickLine={false} width={48} tick={{ fill: "var(--text-muted)", fontSize: 12 }} />
        <ReferenceLine y={0} stroke="var(--axis)" />
        <Tooltip
          cursor={{ fill: "var(--grid)", fillOpacity: 0.5 }}
          content={(props) => (
            <ChartTooltip<YearReturn>
              {...props}
              title={(row) => String(row.year)}
              rows={(row) => [
                { name: "stocks (real)", value: formatPercent(row.realStocks), color: row.realStocks < 0 ? "var(--negative)" : "var(--series-1)" },
                { name: "bonds (real)", value: formatPercent(row.realBonds), color: row.realBonds < 0 ? "var(--negative)" : "var(--series-1)" },
                { name: "inflation", value: formatPercent(row.inflation), color: "transparent" },
              ]}
            />
          )}
        />
        <Bar dataKey={field} shape={ReturnBar} isAnimationActive={false}>
          {rows.map((row) => (
            <Cell key={row.year} fill={row[field] < 0 ? "var(--negative)" : "var(--series-1)"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function ReturnsTable({ rows }: { rows: YearReturn[] }) {
  return (
    <table>
      <thead>
        <tr>
          <th>Year</th>
          <th>Stocks (real)</th>
          <th>Bonds (real)</th>
          <th>Inflation</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.year}>
            <td>{row.year}</td>
            <td>{formatPercent(row.realStocks)}</td>
            <td>{formatPercent(row.realBonds)}</td>
            <td>{formatPercent(row.inflation)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
