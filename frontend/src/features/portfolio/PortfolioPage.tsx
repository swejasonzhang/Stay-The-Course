import { useEffect, useState, type FormEvent } from "react";
import { api } from "../../api/client";
import type { AssetClass, PortfolioRequest, PortfolioResponse } from "../../api/types";
import { ChartFrame } from "../../components/ChartFrame";
import { ErrorMessage } from "../../components/ErrorMessage";
import { NumberField } from "../../components/NumberField";
import { friendlyError, percentToDecimal, toNumber } from "../../lib/forms";
import { StatTile } from "../../components/StatTile";
import { assetClassName, formatCents, formatDollars, formatPercent, formatPoints } from "../../lib/format";
import { useRequest } from "../../lib/useRequest";
import { AllocationChart } from "./AllocationChart";

interface HoldingRow {
  id: number;
  name: string;
  assetClass: AssetClass;
  value: string;
  expenseRatio: string;
}

interface FormState {
  holdings: HoldingRow[];
  usStocks: string;
  internationalStocks: string;
  bonds: string;
  cash: string;
  newContribution: string;
  driftThreshold: string;
}

const ASSET_CLASSES: AssetClass[] = ["US_STOCKS", "INTERNATIONAL_STOCKS", "BONDS", "CASH"];

const DEFAULTS: FormState = {
  holdings: [
    { id: 1, name: "US stock index fund", assetClass: "US_STOCKS", value: "60000", expenseRatio: "0.04" },
    { id: 2, name: "International stock index fund", assetClass: "INTERNATIONAL_STOCKS", value: "20000", expenseRatio: "0.08" },
    { id: 3, name: "Bond index fund", assetClass: "BONDS", value: "15000", expenseRatio: "0.05" },
    { id: 4, name: "Actively managed stock fund", assetClass: "US_STOCKS", value: "5000", expenseRatio: "0.85" },
  ],
  usStocks: "50",
  internationalStocks: "30",
  bonds: "20",
  cash: "0",
  newContribution: "0",
  driftThreshold: "5",
};

function toRequest(form: FormState): PortfolioRequest {
  return {
    holdings: form.holdings.map((h) => ({
      name: h.name,
      assetClass: h.assetClass,
      value: toNumber(h.value),
      expenseRatio: percentToDecimal(h.expenseRatio),
    })),
    target: {
      usStocks: percentToDecimal(form.usStocks),
      internationalStocks: percentToDecimal(form.internationalStocks),
      bonds: percentToDecimal(form.bonds),
      cash: percentToDecimal(form.cash),
    },
    newContribution: toNumber(form.newContribution),
    driftThreshold: percentToDecimal(form.driftThreshold),
  };
}

// Balance and Discipline principles: is the mix still what you chose, and what would fix it?
export function PortfolioPage() {
  const [form, setForm] = useState<FormState>(DEFAULTS);
  const { data, error, loading, run, fieldErrors } = useRequest<PortfolioResponse>();

  useEffect(() => {
    run(() => api.portfolio(toRequest(DEFAULTS)));
  }, [run]);

  const check = (event: FormEvent) => {
    event.preventDefault();
    run(() => api.portfolio(toRequest(form)));
  };

  const setField = (field: keyof Omit<FormState, "holdings">) => (value: string) => setForm({ ...form, [field]: value });
  const setHolding = (id: number, changes: Partial<HoldingRow>) =>
    setForm({ ...form, holdings: form.holdings.map((h) => (h.id === id ? { ...h, ...changes } : h)) });
  const addHolding = () => {
    const id = Math.max(0, ...form.holdings.map((h) => h.id)) + 1;
    setForm({ ...form, holdings: [...form.holdings, { id, name: "New fund", assetClass: "US_STOCKS", value: "0", expenseRatio: "0.05" }] });
  };
  const removeHolding = (id: number) => setForm({ ...form, holdings: form.holdings.filter((h) => h.id !== id) });

  // The API names errors by path, e.g. "holdings[2].value"; these are shown next to their inputs.
  const shownFields = [
    ...form.holdings.flatMap((_, i) => [`holdings[${i}].name`, `holdings[${i}].value`, `holdings[${i}].expenseRatio`]),
    "target.usStocks", "target.internationalStocks", "target.bonds", "target.cash", "target.totalOneHundredPercent",
    "newContribution", "driftThreshold",
  ];

  return (
    <>
      <div className="page-intro">
        <h2>Balance and Discipline: is your mix still on target?</h2>
        <p>
          Markets move your mix away from the one you chose. This checkup shows how far each asset class has drifted,
          what you pay in fees, and a plan to get back on target. New money goes to whatever is underweight first;
          it only suggests selling if that isn't enough, because selling can mean taxes.
        </p>
      </div>
      <div className="layout">
        <form className="card" onSubmit={check}>
          <strong>Holdings</strong>
          {form.holdings.map((holding, i) => (
            <div className="holding-row" key={holding.id}>
              <div className="field">
                <label htmlFor={`name-${holding.id}`}>Name</label>
                <div className="input-wrap">
                  <input id={`name-${holding.id}`} value={holding.name}
                    onChange={(e) => setHolding(holding.id, { name: e.target.value })} />
                </div>
                {fieldErrors[`holdings[${i}].name`] && <p className="field-error">{fieldErrors[`holdings[${i}].name`]}</p>}
              </div>
              <div className="field">
                <label htmlFor={`class-${holding.id}`}>Asset class</label>
                <div className="input-wrap">
                  <select id={`class-${holding.id}`} value={holding.assetClass}
                    onChange={(e) => setHolding(holding.id, { assetClass: e.target.value as AssetClass })}>
                    {ASSET_CLASSES.map((c) => (
                      <option key={c} value={c}>{assetClassName(c)}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="pair">
                <NumberField id={`value-${holding.id}`} label="Value" prefix="$" value={holding.value}
                  onChange={(value) => setHolding(holding.id, { value })} error={fieldErrors[`holdings[${i}].value`]} />
                <NumberField id={`fee-${holding.id}`} label="Expense ratio" suffix="%" value={holding.expenseRatio}
                  onChange={(expenseRatio) => setHolding(holding.id, { expenseRatio })}
                  error={friendlyError(fieldErrors[`holdings[${i}].expenseRatio`], true)} />
              </div>
              <button type="button" className="link" onClick={() => removeHolding(holding.id)}
                aria-label={`Remove ${holding.name}`}>
                Remove
              </button>
            </div>
          ))}
          <button type="button" className="secondary" onClick={addHolding}>Add holding</button>

          <strong>Target mix</strong>
          <div className="holding-row" style={{ borderBottom: "none" }}>
            <div className="pair">
              <NumberField id="usStocks" label="US stocks" suffix="%" value={form.usStocks} onChange={setField("usStocks")}
                error={friendlyError(fieldErrors["target.usStocks"], true)} />
              <NumberField id="internationalStocks" label="International" suffix="%" value={form.internationalStocks}
                onChange={setField("internationalStocks")} error={friendlyError(fieldErrors["target.internationalStocks"], true)} />
            </div>
            <div className="pair">
              <NumberField id="bonds" label="Bonds" suffix="%" value={form.bonds} onChange={setField("bonds")}
                error={friendlyError(fieldErrors["target.bonds"], true)} />
              <NumberField id="cash" label="Cash" suffix="%" value={form.cash} onChange={setField("cash")}
                error={friendlyError(fieldErrors["target.cash"], true)} />
            </div>
            {fieldErrors["target.totalOneHundredPercent"] && (
              <p className="field-error">Target mix {fieldErrors["target.totalOneHundredPercent"]}</p>
            )}
            {fieldErrors.holdings && <p className="field-error">Holdings {fieldErrors.holdings}</p>}
          </div>

          <NumberField id="newContribution" label="New money to invest" prefix="$" value={form.newContribution}
            onChange={setField("newContribution")} error={fieldErrors.newContribution} />
          <NumberField id="driftThreshold" label="Rebalance when off target by more than" suffix="pts"
            value={form.driftThreshold} onChange={setField("driftThreshold")}
            error={friendlyError(fieldErrors.driftThreshold, true)}
            hint="Percentage points. 5 is a common choice; there's no single right answer." />
          <button type="submit" className="primary" disabled={loading}>
            {loading ? "Checking…" : "Check my portfolio"}
          </button>
        </form>

        <div className={loading ? "stack results loading" : "stack results"}>
          <ErrorMessage error={error} shownFields={shownFields} />
          {data && <Results data={data} />}
        </div>
      </div>
    </>
  );
}

function Results({ data }: { data: PortfolioResponse }) {
  return (
    <>
      <div className="kpi-row">
        <StatTile label="Total value" value={formatDollars(data.totalValue)} />
        <StatTile label="Average fee" value={formatPercent(data.weightedExpenseRatio, 2)} detail="weighted by dollars" />
        <StatTile label="Fees per year" value={formatDollars(data.annualFees)} detail="at today's balance" />
        <StatTile label="Largest drift" value={formatPoints(data.largestDrift)} detail="from target" />
      </div>

      {data.warnings.map((warning) => (
        <div className="message warning" key={warning} role="note">
          <span className="icon" aria-hidden="true">⚠</span>
          <span>{warning}</span>
        </div>
      ))}

      <ChartFrame
        title="Your mix vs your target"
        subtitle="Bar: current share. Marker: target share."
        legend={[
          { label: "Current", color: "var(--series-1)", shape: "bar" },
          { label: "Target", color: "var(--series-2)", shape: "line" },
        ]}
        chart={<AllocationChart allocations={data.allocations} />}
        table={<AllocationTable data={data} />}
      />

      <section className="card">
        <h3 style={{ margin: "0 0 4px", fontSize: "1rem" }}>Rebalancing plan</h3>
        <p className="subtitle" style={{ margin: "0 0 12px", color: "var(--text-secondary)", fontSize: "0.85rem" }}>
          {data.trades.length === 0
            ? "You're within your threshold, so no trades are needed."
            : data.fullRebalanceNeeded
              ? "New money alone can't close the gap, so this plan sells what's overweight to buy what's underweight."
              : "New money alone brings you within your threshold. Nothing needs to be sold."}
        </p>
        {data.trades.length > 0 && (
          <ul className="trade-list">
            {data.trades.map((trade) => (
              <li key={trade.assetClass}>
                <span>
                  <span className="action">{trade.action === "BUY" ? "Buy" : "Sell"}</span> {assetClassName(trade.assetClass)}
                </span>
                <span>{formatCents(trade.amount)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card">
        <h3 style={{ margin: "0 0 8px", fontSize: "1rem" }}>Before and after the plan</h3>
        <AllocationTable data={data} />
      </section>
    </>
  );
}

function AllocationTable({ data }: { data: PortfolioResponse }) {
  return (
    <table>
      <thead>
        <tr>
          <th>Asset class</th>
          <th>Now</th>
          <th>Target</th>
          <th>Drift</th>
          <th>After plan</th>
        </tr>
      </thead>
      <tbody>
        {data.allocations.map((allocation, i) => (
          <tr key={allocation.assetClass}>
            <td>{assetClassName(allocation.assetClass)}</td>
            <td>{formatPercent(allocation.currentWeight)}</td>
            <td>{formatPercent(allocation.targetWeight)}</td>
            <td>{formatPoints(allocation.drift)}</td>
            <td>{formatPercent(data.allocationsAfter[i].currentWeight)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
