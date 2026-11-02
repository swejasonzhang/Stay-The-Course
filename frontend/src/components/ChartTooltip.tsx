export interface TooltipRow {
  name: string;
  value: string;
  color: string;
}

interface ChartTooltipProps<T> {
  active?: boolean;
  payload?: ReadonlyArray<{ payload?: T }>;
  title: (datum: T) => string;
  rows: (datum: T) => TooltipRow[];
}

// Shared hover box for every Recharts chart: the value leads, the series name follows,
// and a short line in the series color identifies it.
export function ChartTooltip<T>({ active, payload, title, rows }: ChartTooltipProps<T>) {
  const datum = payload?.[0]?.payload;
  if (!active || !datum) {
    return null;
  }
  return (
    <div className="chart-tooltip">
      <div className="tooltip-title">{title(datum)}</div>
      {rows(datum).map((row) => (
        <div className="row" key={row.name}>
          <span className="swatch" style={{ background: row.color }} aria-hidden="true" />
          <strong>{row.value}</strong>
          <span>{row.name}</span>
        </div>
      ))}
    </div>
  );
}
