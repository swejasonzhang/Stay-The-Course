import { Area, CartesianGrid, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChartTooltip } from "../../components/ChartTooltip";
import { formatCompactDollars, formatDollars } from "../../lib/format";
import { niceScale, yearTicks } from "../../lib/scales";
import type { BandRow } from "./bands";

interface BandChartProps {
  rows: BandRow[];
  color: string;
  yMax: number;
  retirementYear?: number;
  xLabel: string;
}

// A "fan chart": the line is the median outcome; the darker band holds the middle 50% of
// simulated outcomes, the lighter band the middle 80%. Two 10% washes overlap to make the darker band.
export function BandChart({ rows, color, yMax, retirementYear, xLabel }: BandChartProps) {
  const y = niceScale(0, yMax);
  return (
    <ResponsiveContainer width="100%" height={260}>
      <ComposedChart data={rows} margin={{ top: 8, right: 16, bottom: 8, left: 8 }}>
        <CartesianGrid stroke="var(--grid)" vertical={false} />
        <XAxis dataKey="year" ticks={yearTicks(rows[0].year, rows[rows.length - 1].year)} stroke="var(--axis)" tickLine={false} tick={{ fill: "var(--text-muted)", fontSize: 12 }}
          label={{ value: xLabel, position: "insideBottomRight", offset: -4, fill: "var(--text-muted)", fontSize: 12 }} />
        <YAxis domain={y.domain} ticks={y.ticks} tickFormatter={formatCompactDollars} stroke="var(--axis)" axisLine={false}
          tickLine={false} width={72} tick={{ fill: "var(--text-muted)", fontSize: 12 }} allowDataOverflow />
        {retirementYear !== undefined && retirementYear > 0 && (
          <ReferenceLine x={retirementYear} stroke="var(--axis)"
            label={{ value: "Retire", position: "insideTopLeft", fill: "var(--text-muted)", fontSize: 12 }} />
        )}
        <Tooltip
          cursor={{ stroke: "var(--axis)", strokeWidth: 1 }}
          content={(props) => (
            <ChartTooltip<BandRow>
              {...props}
              title={(row) => `Year ${row.year}`}
              rows={(row) => [
                { name: "median", value: formatDollars(row.p50), color },
                { name: "middle 50%", value: `${formatCompactDollars(row.p25)} – ${formatCompactDollars(row.p75)}`, color: "transparent" },
                { name: "middle 80%", value: `${formatCompactDollars(row.p10)} – ${formatCompactDollars(row.p90)}`, color: "transparent" },
              ]}
            />
          )}
        />
        <Area type="linear" dataKey="outer" stroke="none" fill={color} fillOpacity={0.1} isAnimationActive={false}
          activeDot={false} />
        <Area type="linear" dataKey="inner" stroke="none" fill={color} fillOpacity={0.1} isAnimationActive={false}
          activeDot={false} />
        <Line type="linear" dataKey="p50" stroke={color} strokeWidth={2} dot={false} isAnimationActive={false}
          activeDot={{ r: 4, stroke: "var(--surface)", strokeWidth: 2 }} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

export function BandTable({ rows, yearLabel }: { rows: BandRow[]; yearLabel: string }) {
  return (
    <table>
      <thead>
        <tr>
          <th>{yearLabel}</th>
          <th>10th pct</th>
          <th>25th pct</th>
          <th>Median</th>
          <th>75th pct</th>
          <th>90th pct</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.year}>
            <td>{row.year}</td>
            <td>{formatDollars(row.p10)}</td>
            <td>{formatDollars(row.p25)}</td>
            <td>{formatDollars(row.p50)}</td>
            <td>{formatDollars(row.p75)}</td>
            <td>{formatDollars(row.p90)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
