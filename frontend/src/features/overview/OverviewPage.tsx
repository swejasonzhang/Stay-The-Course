import type { ReactNode } from "react";
import { ArrowRightIcon, BalanceIcon, CostIcon, DataIcon, GoalsIcon } from "../../components/Icons";

interface Principle {
  href: string;
  icon: ReactNode;
  name: string;
  question: string;
  what: string;
}

const PRINCIPLES: Principle[] = [
  {
    href: "#fees",
    icon: <CostIcon />,
    name: "Cost",
    question: "What does my fund's fee really cost?",
    what: "Compare your expense ratio with a low-cost index fund and see the dollars it takes over decades.",
  },
  {
    href: "#retirement",
    icon: <GoalsIcon />,
    name: "Goals",
    question: "Will my savings last through retirement?",
    what: "Replay 98 years of real markets thousands of times and compare the 4% rule with dynamic spending.",
  },
  {
    href: "#portfolio",
    icon: <BalanceIcon />,
    name: "Balance & Discipline",
    question: "Has my mix drifted from my plan?",
    what: "See how far each asset class is off target, what you pay in fees, and the trades that fix it.",
  },
  {
    href: "#assumptions",
    icon: <DataIcon />,
    name: "Assumptions",
    question: "What history is this built on?",
    what: "Every year of real stock and bond returns since 1928, with the averages and worst years.",
  },
];

// The landing page: what the app is, the four tools, and how a request flows through the system.
export function OverviewPage() {
  return (
    <>
      <section className="hero">
        <span className="eyebrow">A portfolio checkup</span>
        <h1>Stay the course.</h1>
        <p className="lede">
          Four investing principles (Goals, Balance, Cost and Discipline) turned into tools you can use. Built on 98
          years of real market history, with every assumption out in the open.
        </p>
        <div className="hero-actions">
          <a className="button-primary" href="#fees">
            See what fees cost <ArrowRightIcon size={18} />
          </a>
          <a className="button-secondary" href="#retirement">
            Run a retirement simulation
          </a>
        </div>
      </section>

      <div className="principles">
        {PRINCIPLES.map((principle) => (
          <a key={principle.href} className="card principle-card" href={principle.href}>
            <span className="icon-badge">{principle.icon}</span>
            <h3>{principle.name}</h3>
            <p className="question">{principle.question}</p>
            <p className="what">{principle.what}</p>
            <span className="open">
              Open <ArrowRightIcon size={16} />
            </span>
          </a>
        ))}
      </div>

      <section className="overview-section">
        <h2>How it works</h2>
        <p>Every number on this site comes from the same path: your inputs, a tested engine, and real data.</p>
        <div className="steps">
          <div className="card step">
            <h3>Your inputs</h3>
            <p>This React app checks what you type and sends it as JSON over HTTPS.</p>
            <div className="chips">
              <span className="chip">React</span>
              <span className="chip">TypeScript</span>
              <span className="chip">CloudFront</span>
            </div>
          </div>
          <div className="card step">
            <h3>A tested engine</h3>
            <p>A Spring Boot API on AWS Lambda validates the request, then runs pure, unit-tested finance math.</p>
            <div className="chips">
              <span className="chip">Java 21</span>
              <span className="chip">Spring Boot</span>
              <span className="chip">API Gateway</span>
              <span className="chip">Lambda</span>
            </div>
          </div>
          <div className="card step">
            <h3>Real data</h3>
            <p>Yearly returns from 1928–2025 (Aswath Damodaran, NYU Stern), also queryable with SQL in Athena.</p>
            <div className="chips">
              <span className="chip">S3</span>
              <span className="chip">Athena</span>
              <span className="chip">IAM</span>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
