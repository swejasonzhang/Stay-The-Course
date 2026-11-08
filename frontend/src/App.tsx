import { lazy, Suspense, useEffect, useState, type ComponentType, type ReactNode } from "react";
import { BalanceIcon, CostIcon, DataIcon, GitHubIcon, GoalsIcon, HomeIcon, LogoMark } from "./components/Icons";
import { PageSkeleton } from "./components/Skeleton";
import { ThemeSwitch } from "./components/ThemeSwitch";
import { OverviewPage } from "./features/overview/OverviewPage";

// Each tool's code (and the chart library) downloads only when that tab is first opened
// ("code-splitting"). The overview is small, so it loads with the app.
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

const REPO_URL = "https://github.com/swejasonzhang/Stay-The-Course";

interface Page {
  id: string;
  label: string;
  short: string;
  icon: ReactNode;
  component: ComponentType;
}

const PAGES: Page[] = [
  { id: "overview", label: "Overview", short: "Home", icon: <HomeIcon size={16} />, component: OverviewPage },
  { id: "fees", label: "Cost", short: "Cost", icon: <CostIcon size={16} />, component: FeesPage },
  { id: "retirement", label: "Goals", short: "Goals", icon: <GoalsIcon size={16} />, component: RetirementPage },
  { id: "portfolio", label: "Balance & Discipline", short: "Balance", icon: <BalanceIcon size={16} />, component: PortfolioPage },
  { id: "assumptions", label: "Assumptions", short: "History", icon: <DataIcon size={16} />, component: AssumptionsPage },
];

// The current tab lives in the URL hash (#retirement), so links and the back button work without a router library.
function pageFromHash(): Page {
  const id = window.location.hash.replace("#", "");
  return PAGES.find((page) => page.id === id) ?? PAGES[0];
}

export function App() {
  const [page, setPage] = useState(pageFromHash);

  useEffect(() => {
    const onHashChange = () => {
      setPage(pageFromHash());
      window.scrollTo({ top: 0 });
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  useEffect(() => {
    document.title = page.id === "overview" ? "Stay the Course" : `${page.label} · Stay the Course`;
  }, [page]);

  const Current = page.component;
  return (
    <>
      {/* Moves focus to the content without changing the hash, which picks the page. */}
      <a className="skip-link" href="#main" onClick={(event) => {
        event.preventDefault();
        document.getElementById("main")?.focus();
      }}>
        Skip to content
      </a>
      <header className="topbar">
        <div className="container topbar-inner">
          <a className="brand" href="#overview">
            <LogoMark />
            Stay the Course
          </a>
          <nav className="nav" aria-label="Sections">
            {PAGES.map((p) => (
              <a key={p.id} href={`#${p.id}`} aria-current={p.id === page.id ? "page" : undefined}>
                {p.icon}
                {/* Phones show the short name so all five links fit on one line. */}
                <span className="label-full">{p.label}</span>
                <span className="label-short">{p.short}</span>
              </a>
            ))}
          </nav>
          <div className="topbar-actions">
            <ThemeSwitch />
            <a className="github-link" href={REPO_URL} target="_blank" rel="noreferrer" title="Source code on GitHub">
              <GitHubIcon size={16} />
              <span className="github-text">GitHub</span>
            </a>
          </div>
        </div>
      </header>
      <main id="main" className="container" tabIndex={-1}>
        <Suspense fallback={<PageSkeleton />}>
          {/* A new key on every page change remounts this wrapper, which replays its fade-in animation. */}
          <div key={page.id} className="page-enter">
            <Current />
          </div>
        </Suspense>
      </main>
      <footer className="site-footer">
        <div className="container site-footer-inner">
          <span>
            Educational project, not investment advice. Not affiliated with or endorsed by Vanguard. Historical
            returns: Aswath Damodaran, NYU Stern.
          </span>
          <nav aria-label="Project links">
            <a href={REPO_URL} target="_blank" rel="noreferrer">
              <GitHubIcon size={14} /> Source
            </a>
          </nav>
        </div>
      </footer>
    </>
  );
}
