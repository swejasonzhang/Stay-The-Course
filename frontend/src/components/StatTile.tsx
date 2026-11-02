// A single headline number with a label. A colored swatch next to the label ties the tile to its chart series.
interface StatTileProps {
  label: string;
  value: string;
  detail?: string;
  color?: string;
  hero?: boolean;
}

export function StatTile({ label, value, detail, color, hero }: StatTileProps) {
  return (
    <div className={hero ? "stat-tile hero" : "stat-tile"}>
      <div className="label">
        {color && <span className="swatch" style={{ background: color }} aria-hidden="true" />}
        {label}
      </div>
      <div className="value">{value}</div>
      {detail && <div className="detail">{detail}</div>}
    </div>
  );
}
