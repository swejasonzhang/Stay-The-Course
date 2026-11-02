import { useState } from "react";
import type { Allocation } from "../../api/types";
import { assetClassName, formatDollars, formatPercent, formatPoints } from "../../lib/format";

// One horizontal bar per asset class showing its current share, with a thin marker at its target share.
// Built in plain HTML because it's just four bars; hovering or focusing a bar shows its details.
export function AllocationChart({ allocations }: { allocations: Allocation[] }) {
  const [hovered, setHovered] = useState<string | null>(null);
  const largest = Math.max(...allocations.flatMap((a) => [a.currentWeight, a.targetWeight]));
  // Scale so the biggest bar or target fills about 80% of the track, leaving room for its label.
  const scale = Math.max(largest, 0.1) / 0.8;

  return (
    <div>
      {allocations.map((allocation) => {
        const width = (allocation.currentWeight / scale) * 100;
        const target = (allocation.targetWeight / scale) * 100;
        const name = assetClassName(allocation.assetClass);
        const details = `${name}: ${formatPercent(allocation.currentWeight)} now (${formatDollars(allocation.value)}), `
          + `target ${formatPercent(allocation.targetWeight)}, drift ${formatPoints(allocation.drift)}`;
        return (
          <div className="allocation-row" key={allocation.assetClass}>
            <span className="name">{name}</span>
            <div className="allocation-track">
              <div
                className="allocation-bar"
                style={{ width: `${width}%`, minWidth: allocation.currentWeight > 0 ? 2 : 0 }}
                tabIndex={0}
                role="img"
                aria-label={details}
                onMouseEnter={() => setHovered(details)}
                onMouseLeave={() => setHovered(null)}
                onFocus={() => setHovered(details)}
                onBlur={() => setHovered(null)}
              />
              <div className="allocation-target" style={{ left: `${target}%` }} aria-hidden="true" />
              <span className="allocation-label" style={{ left: `${Math.max(width, target)}%` }}>
                {formatPercent(allocation.currentWeight, 0)} · target {formatPercent(allocation.targetWeight, 0)}
              </span>
            </div>
          </div>
        );
      })}
      <p className="hint" aria-live="polite" style={{ minHeight: "1.5em", margin: "8px 0 0", color: "var(--text-secondary)" }}>
        {hovered ?? "Hover or tab to a bar for details."}
      </p>
    </div>
  );
}
