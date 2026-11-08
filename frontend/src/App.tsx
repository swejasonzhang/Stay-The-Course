import { lazy, Suspense, useEffect, useState, type ComponentType, type LazyExoticComponent } from "react";

// Each tab's code (and the chart library) is downloaded only when that tab is first opened,
// so the first page loads faster. This is "code-splitting".
const FeesPage = lazy(() => import("./features/fees/FeesPage").then((m) => ({ default: m.FeesPage })));
const RetirementPage = lazy(() =>
  import("./features/retirement/RetirementPage").then((m) => ({ default: m.RetirementPage })),
);
const PortfolioPage = lazy(() =>
  import("./features/portfolio/PortfolioPage").then((m) => ({ default: m.PortfolioPage })),
);
const AssumptionsPage = lazy(() =>
  import("./features/assumptions/AssumptionsPage").then((m) => ({ default: m.AssumptionsPage })),
);

interface Page {
  id: string;
  label: string;
  component: LazyExoticComponent<ComponentType>;
}

// One tab per investing principle, plus the data behind the simulator.
const PAGES: Page[] = [
  { id: "fees", label: "Cost", component: FeesPage },
  { id: "retirement", label: "Goals", component: RetirementPage },
  { id: "portfolio", label: "Balance & Discipline", component: PortfolioPage },
  { id: "assumptions", label: "Assumptions", component: AssumptionsPage },
];

// The current tab lives in the URL hash (#retirement), so links and the back button work without a router library.
function pageFromHash(): Page {
  const id = window.location.hash.replace("#", "");
  return PAGES.find((page) => page.id === id) ?? PAGES[0];
}

export function App() {
  const [page, setPage] = useState(pageFromHash);

  useEffect(() => {
    const onHashChange = () => setPage(pageFromHash());
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  const Current = page.component;
  return (
    <>
      <header className="app-header">
        <h1>Stay the Course</h1>
        <p>A portfolio checkup built on four investing principles: Goals, Balance, Cost and Discipline.</p>
      </header>
      <nav className="tabs" aria-label="Sections">
        {PAGES.map((p) => (
          <a key={p.id} href={`#${p.id}`} aria-current={p.id === page.id ? "page" : undefined}>
            {p.label}
          </a>
        ))}
      </nav>
      <main>
        <Suspense fallback={<p className="empty">Loading…</p>}>
          <Current />
        </Suspense>
      </main>
      <footer>
        Educational project, not investment advice. Not affiliated with or endorsed by Vanguard. Historical returns:
        Aswath Damodaran, NYU Stern.
      </footer>
    </>
  );
}
