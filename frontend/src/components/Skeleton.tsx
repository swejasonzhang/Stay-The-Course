import { useEffect, useState, type ReactNode } from "react";

// Skeletons: grey placeholder shapes laid out like the real results, shown while the first answer loads.
// The page keeps its shape, so nothing jumps around when the numbers arrive.

function Bone({ width = "100%", height = 12, gap = 0 }: { width?: number | string; height?: number; gap?: number }) {
  return <span className="skeleton" style={{ width, height, marginTop: gap }} />;
}

// Wraps a page's placeholder shapes. Screen readers hear "Loading results" instead of empty shapes.
// If loading takes over 2.5 seconds, it explains why: the server is starting up (a Lambda cold start).
export function LoadingResults({ children }: { children: ReactNode }) {
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setSlow(true), 2500);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <div className="stack" role="status" aria-busy="true">
      <span className="sr-only">Loading results…</span>
      {slow && (
        <p className="slow-note">
          The server is waking up. The first request after a quiet spell takes a few seconds; after that it's fast.
        </p>
      )}
      <div className="stack" aria-hidden="true">
        {children}
      </div>
    </div>
  );
}

export function SkeletonInsight() {
  return (
    <div className="skeleton-box">
      <Bone width="38%" height={16} />
      <Bone width="94%" gap={12} />
      <Bone width="68%" gap={8} />
    </div>
  );
}

export function SkeletonTiles({ count }: { count: number }) {
  return (
    <div className="kpi-row">
      {Array.from({ length: count }, (_, i) => (
        <div className="stat-tile" key={i}>
          <Bone width="62%" />
          <Bone width="78%" height={28} gap={12} />
          <Bone width="46%" gap={10} />
        </div>
      ))}
    </div>
  );
}

export function SkeletonChart({ height }: { height: number }) {
  return (
    <div className="card">
      <Bone width="36%" height={16} />
      <Bone width="62%" gap={10} />
      <Bone height={height} gap={20} />
    </div>
  );
}

// Shown while a page's code downloads (code-splitting): the header, the form, and the results area.
export function PageSkeleton() {
  return (
    <div role="status" aria-busy="true">
      <span className="sr-only">Loading page…</span>
      <div aria-hidden="true">
        <div className="page-header">
          <Bone width={110} />
          <Bone width="55%" height={32} gap={16} />
          <Bone width="88%" gap={16} />
          <Bone width="64%" gap={10} />
        </div>
        <div className="layout">
          <div className="card">
            {Array.from({ length: 5 }, (_, i) => (
              <div key={i} style={{ marginBottom: 20 }}>
                <Bone width="45%" />
                <Bone height={40} gap={8} />
              </div>
            ))}
            <Bone height={44} />
          </div>
          <div className="stack">
            <SkeletonInsight />
            <SkeletonTiles count={3} />
            <SkeletonChart height={300} />
          </div>
        </div>
      </div>
    </div>
  );
}
