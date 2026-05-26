import { BackLink } from "@/components/back-link";

const implementedItems = [
  "Bridge adjustments from explicit balance sheet bridge scaffold inputs",
  "Total additions (cash + non-operating assets)",
  "Total deductions (debt + preferred + minority + other non-equity claims)",
  "Equity Value = Value of Operating Assets + additions − deductions",
  "Missing input handling (no fake Equity Value when operating assets are missing)",
];

const notImplementedItems = [
  "Per-share value",
  "Intrinsic Value / Share",
  "MOS / entry price / buy-sell logic",
  "Dashboard decisions",
];

const importantRules = [
  "Firm-to-Equity Bridge is foundation-only and not an official valuation output yet.",
  "Value of Operating Assets is sourced from DCF/PV foundation output only.",
  "Cash, debt, and claims use explicit company bridge scaffold inputs — not live company data in this phase.",
  "Total Debt = Gross Debt + Lease Liabilities (explicit gross debt; not net debt).",
  "If Value of Operating Assets is missing, Equity Value remains null (no fake equity math).",
  "Optional bridge claims may default to zero only when not explicitly provided, with documented scaffold notes.",
  "ISM-sector is display-only and must not drive bridge logic.",
];

export default function EquityBridgeEngineDocsPage() {
  return (
    <section className="pageSection">
      <BackLink href="/engine-docs" label="Back to Engine Docs" />
      <div>
        <h2 className="sectionHeading">Firm-to-Equity Bridge Engine</h2>
        <p className="sectionSubheading">
          Equity Value from Value of Operating Assets and explicit bridge adjustments — foundation-only.
        </p>
        <p className="cardMeta">
          Current status: <strong>Foundation</strong>
        </p>
      </div>

      <div className="panel">
        <h3 className="cardTitle">Foundation Flow</h3>
        <div className="flowchartSteps">
          <div className="flowchartBox">Value of Operating Assets</div>
          <div className="flowchartArrow">+</div>
          <div className="flowchartBox">Cash / Non-Operating Assets</div>
          <div className="flowchartArrow">−</div>
          <div className="flowchartBox">Debt / Preferred / Minority Interest / Other Claims</div>
          <div className="flowchartArrow">↓</div>
          <div className="flowchartBox">Equity Value</div>
          <div className="flowchartArrow">↓</div>
          <div className="flowchartBox">future Intrinsic Value / Share</div>
        </div>
      </div>

      <div className="panel">
        <h3 className="cardTitle">Formula</h3>
        <ul className="flowchartRulesList">
          <li className="cardMeta">
            Equity Value = Value of Operating Assets + Cash &amp; Cash Equivalents + Non-Operating
            Assets − Total Debt − Preferred Equity − Minority Interest − Other Non-Equity Claims
          </li>
          <li className="cardMeta">Total Additions = Cash &amp; Cash Equivalents + Non-Operating Assets</li>
          <li className="cardMeta">
            Total Deductions = Total Debt + Preferred Equity + Minority Interest + Other Non-Equity
            Claims
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
