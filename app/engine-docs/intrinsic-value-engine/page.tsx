import { BackLink } from "@/components/back-link";

const implementedItems = [
  "Intrinsic Value / Share = Equity Value ÷ Selected Diluted Shares (unit-aware)",
  "Share unit guardrails (millions | absolute — no silent guessing)",
  "Missing Equity Value / shares / share unit handling (no fake per-share math)",
  "Explicit selected shares source documentation",
];

const notImplementedItems = [
  "MOS (margin of safety)",
  "Entry price",
  "Buy / sell / hold decision logic",
  "Dashboard decision wiring",
  "Upside / downside vs current price",
];

const importantRules = [
  "Intrinsic Value / Share is foundation-only and not a Dashboard decision output.",
  "Equity Value is sourced from Firm-to-Equity Bridge foundation output.",
  "Share count and share unit come from explicit intrinsic value foundation scaffold inputs.",
  "If Equity Value is missing, Intrinsic Value / Share remains null.",
  "If share unit is missing or unknown, calculation is blocked (Review/Missing).",
  "Current share price may be shown for context only — it does not drive decisions in this phase.",
  "ISM-sector is display-only and must not drive intrinsic value logic.",
];

export default function IntrinsicValueEngineDocsPage() {
  return (
    <section className="pageSection">
      <BackLink href="/engine-docs" label="Back to Engine Docs" />
      <div>
        <h2 className="sectionHeading">Intrinsic Value / Share Engine</h2>
        <p className="sectionSubheading">
          Per-share intrinsic value from Equity Value and selected diluted shares — foundation-only.
        </p>
        <p className="cardMeta">
          Current status: <strong>Foundation</strong>
        </p>
      </div>

      <div className="panel">
        <h3 className="cardTitle">Foundation Flow</h3>
        <div className="flowchartSteps">
          <div className="flowchartBox">Equity Value</div>
          <div className="flowchartArrow">÷</div>
          <div className="flowchartBox">Selected Diluted Shares</div>
          <div className="flowchartArrow">↓</div>
          <div className="flowchartBox">Intrinsic Value / Share</div>
          <div className="flowchartArrow">↓</div>
          <div className="flowchartBox">future MOS / Decision Support</div>
        </div>
      </div>

      <div className="panel">
        <h3 className="cardTitle">Formula &amp; unit rule</h3>
        <ul className="flowchartRulesList">
          <li className="cardMeta">Intrinsic Value / Share = Equity Value ÷ Selected Diluted Shares</li>
          <li className="cardMeta">
            Share unit <strong>millions</strong>: Equity Value (m) ÷ Shares (m) → per-share value in valuation
            currency
          </li>
          <li className="cardMeta">
            Share unit <strong>absolute</strong>: (Equity Value (m) × 1,000,000) ÷ Shares (absolute) →
            per-share value in valuation currency
          </li>
        </ul>
      </div>

      <div className="cardGrid">
        <article className="card">
          <h3 className="cardTitle">Implemented</h3>
          <ul className="flowchartRulesList">
            {implementedItems.map((item) => (
              <li key={item} className="cardMeta">
                {item}
              </li>
            ))}
          </ul>
        </article>
        <article className="card">
          <h3 className="cardTitle">Not implemented</h3>
          <ul className="flowchartRulesList">
            {notImplementedItems.map((item) => (
              <li key={item} className="cardMeta">
                {item}
              </li>
            ))}
          </ul>
        </article>
      </div>

      <div className="panel">
        <h3 className="cardTitle">Important rule</h3>
        <ul className="flowchartRulesList">
          {importantRules.map((rule) => (
            <li key={rule} className="cardMeta">
              {rule}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
