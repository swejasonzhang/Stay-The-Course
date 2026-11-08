import type { Insight as InsightText } from "../lib/insights";
import { InfoIcon } from "./Icons";

// The plain-English takeaway shown above each set of results.
export function Insight({ insight }: { insight: InsightText }) {
  return (
    <div className="insight" role="status">
      <span className="icon">
        <InfoIcon />
      </span>
      <div>
        <div className="insight-title">{insight.title}</div>
        <p className="insight-body">{insight.body}</p>
      </div>
    </div>
  );
}
