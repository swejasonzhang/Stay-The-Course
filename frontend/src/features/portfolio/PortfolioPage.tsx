import { useEffect, useState, type FormEvent } from "react";
import { api } from "../../api/client";
import type { AssetClass, PortfolioRequest, PortfolioResponse } from "../../api/types";
import { ChartFrame } from "../../components/ChartFrame";
import { ErrorMessage } from "../../components/ErrorMessage";
import { FormSection } from "../../components/FormSection";
import { BalanceIcon, CloseIcon, PlusIcon, WarningIcon } from "../../components/Icons";
import { Insight } from "../../components/Insight";
import { NumberField } from "../../components/NumberField";
import { PageHeader } from "../../components/PageHeader";
import { SliderField } from "../../components/SliderField";
import { LoadingResults, SkeletonChart, SkeletonInsight, SkeletonTiles } from "../../components/Skeleton";
import { StatTile } from "../../components/StatTile";
import { assetClassName, formatCents, formatDollars, formatPercent, formatPoints } from "../../lib/format";
import { friendlyError, percentToDecimal, toNumber } from "../../lib/forms";
import { portfolioInsight } from "../../lib/insights";
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
  const [submitted, setSubmitted] = useState<FormState>(DEFAULTS);
  const { data, error, loading, run, fieldErrors } = useRequest<PortfolioResponse>();

  useEffect(() => {
    run(() => api.portfolio(toRequest(DEFAULTS)));
  }, [run]);

  const check = (event: FormEvent) => {
    event.preventDefault();
    setSubmitted(form);
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

  // A live total, so a mix that doesn't add up to 100% is caught before the request is sent.
  const targetTotal = [form.usStocks, form.internationalStocks, form.bonds, form.cash]
    .reduce((sum, value) => sum + (Number(value) || 0), 0);
  const totalIsOff = Math.abs(targetTotal - 100) > 0.01;

  // The API names errors by path, e.g. "holdings[2].value"; these are shown next to their inputs.
  const shownFields = [
    ...form.holdings.flatMap((_, i) => [`holdings[${i}].name`, `holdings[${i}].value`, `holdings[${i}].expenseRatio`]),
    "target.usStocks", "target.internationalStocks", "target.bonds", "target.cash", "target.totalOneHundredPercent",
    "holdings", "newContribution", "driftThreshold",
  ];

  return (
    <>
      <PageHeader eyebrow="Balance & Discipline" icon={<BalanceIcon size={14} />} title="Is your mix still on target?">
        Markets push your mix away from the one you chose. See how far each asset class has drifted, what you pay in
        fees, and a plan to get back on target. New money goes to whatever is underweight first; selling is suggested
        only if that isn't enough, because selling can mean taxes.
      </PageHeader>
      <div className="layout">
        <form className="card sidebar" onSubmit={check}>
          <FormSection title="Holdings">
            {form.holdings.map((holding, i) => (
              <div className="holding" key={holding.id}>
                <button type="button" className="remove" onClick={() => removeHolding(holding.id)}
                  aria-label={`Remove ${holding.name}`} title="Remove">
                  <CloseIcon size={16} />
                </button>
                <div className="field">
                  <label htmlFor={`name-${holding.id}`}>Fund name</label>
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
              </div>
            ))}
            {fieldErrors.holdings && <p className="field-error">Holdings {fieldErrors.holdings}</p>}
            <button type="button" className="secondary" onClick={addHolding}>
              <PlusIcon size={16} /> Add holding
            </button>
          </FormSection>

          <FormSection title="Target mix">
            <div className="pair">
              <NumberField id="usStocks" label="US stocks" suffix="%" value={form.usStocks} onChange={setField("usStocks")}
                error={friendlyError(fieldErrors["target.usStocks"], true)} />
              <NumberField id="internationalStocks" label="International" suffix="%" value={form.internationalStocks}
                onChange={setField("internationalStocks")}
                error={friendlyError(fieldErrors["target.internationalStocks"], true)} />
            </div>
            <div className="pair">
              <NumberField id="bonds" label="Bonds" suffix="%" value={form.bonds} onChange={setField("bonds")}
                error={friendlyError(fieldErrors["target.bonds"], true)} />
              <NumberField id="cash" label="Cash" suffix="%" value={form.cash} onChange={setField("cash")}
                error={friendlyError(fieldErrors["target.cash"], true)} />
            </div>
            <div className={totalIsOff ? "target-total off" : "target-total"} aria-live="polite">
              <span>Total</span>
              <strong>{totalIsOff ? `${targetTotal.toFixed(1).replace(".0", "")}%, must be 100%` : "100%"}</strong>
            </div>
            {fieldErrors["target.totalOneHundredPercent"] && (
              <p className="field-error">Target mix {fieldErrors["target.totalOneHundredPercent"]}</p>
            )}
          </FormSection>

          <FormSection title="Rebalancing">
            <NumberField id="newContribution" label="New money to invest" prefix="$" value={form.newContribution}
              onChange={setField("newContribution")} error={fieldErrors.newContribution} />
            <SliderField id="driftThreshold" label="Rebalance when off target by more than" suffix="pts"
              value={form.driftThreshold} onChange={setField("driftThreshold")} min={1} max={20} step={0.5}
              error={friendlyError(fieldErrors.driftThreshold, true)}
              hint="Percentage points. 5 is a common choice; there's no single right answer." />
          </FormSection>

          <button type="submit" className="primary" disabled={loading}>
            {loading ? "Checking…" : "Check my portfolio"}
          </button>
        </form>

        <div className={loading && data ? "stack results loading" : "stack results"}>
          <ErrorMessage error={error} shownFields={shownFields} />
          {!data && !error && (
            <LoadingResults>
              <SkeletonInsight />
              <SkeletonTiles count={4} />
              <SkeletonChart height={180} />
              <SkeletonChart height={150} />
            </LoadingResults>
          )}
          {data && <Results data={data} driftThreshold={percentToDecimal(submitted.driftThreshold)} />}
        </div>
      </div>
    </>
  );
}

function Results({ data, driftThreshold }: { data: PortfolioResponse; driftThreshold: number }) {
  return (
    <>
      <Insight insight={portfolioInsight(data, driftThreshold)} />
      <div className="kpi-row">
        <StatTile label="Total value" value={formatDollars(data.totalValue)} />
        <StatTile label="Average fee" value={formatPercent(data.weightedExpenseRatio, 2)} detail="weighted by dollars" />
        <StatTile label="Fees per year" value={formatDollars(data.annualFees)} detail="at today's balance" />
        <StatTile label="Largest drift" value={formatPoints(data.largestDrift)} detail="from target" />
      </div>

      {data.warnings.map((warning) => (
        <div className="message warning" key={warning} role="note">
          <span className="icon" aria-hidden="true"><WarningIcon size={18} /></span>
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
        <h3 className="section-title">Rebalancing plan</h3>
        <p className="section-subtitle">
          {data.trades.length === 0
            ? "You're within your threshold, so no trades are needed."
            : data.fullRebalanceNeeded
              ? "New money alone can't close the gap, so this plan sells what's overweight to buy what's underweight."
              : "New money alone brings you within your threshold. Nothing needs to be sold."}
        </p>
        {data.trades.length > 0 && (
          <ul className="trade-list">
            {data.trades.map((trade) => (
              <li className="trade" key={trade.assetClass}>
                <span className="what">
                  <span className={trade.action === "BUY" ? "badge buy" : "badge sell"}>
                    {trade.action === "BUY" ? "Buy" : "Sell"}
                  </span>
                  {assetClassName(trade.assetClass)}
                </span>
                <span className="amount">{formatCents(trade.amount)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card">
        <h3 className="section-title">Before and after the plan</h3>
        <p className="section-subtitle">Each asset class's share now, its target, and its share once the trades are made.</p>
        <div className="table-wrap">
          <AllocationTable data={data} />
        </div>
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
