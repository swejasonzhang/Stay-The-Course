import { useState, type ReactNode } from "react";

export interface LegendItem {
  label: string;
  color: string;
  shape: "line" | "bar";
}

interface ChartFrameProps {
  title: string;
  subtitle?: string;
  legend?: LegendItem[];
  chart: ReactNode;
  table: ReactNode;
}

// Every chart sits in a frame with a title, an optional legend, and a "Show table" toggle,
// so every value can be read without relying on color or hovering.
export function ChartFrame({ title, subtitle, legend, chart, table }: ChartFrameProps) {
  const [showTable, setShowTable] = useState(false);
  return (
    <figure className="card chart-frame" style={{ margin: 0 }}>
      <header>
        <div>
          <h3>{title}</h3>
          {subtitle && <p className="subtitle">{subtitle}</p>}
        </div>
        <button type="button" className="secondary" onClick={() => setShowTable(!showTable)} aria-pressed={showTable}>
          {showTable ? "Show chart" : "Show table"}
        </button>
      </header>
      {legend && legend.length > 0 && !showTable && (
        <div className="legend">
          {legend.map((item) => (
            <span key={item.label}>
              <span
                className="swatch"
                aria-hidden="true"
                style={{ background: item.color, height: item.shape === "bar" ? 10 : 3, width: item.shape === "bar" ? 10 : 14 }}
              />
              {item.label}
            </span>
          ))}
        </div>
      )}
      {showTable ? <div className="table-wrap">{table}</div> : chart}
    </figure>
  );
}
