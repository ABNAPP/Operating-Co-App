import { BackLink } from "@/components/back-link";
import { RELEVERING_FORMULA } from "@/lib/engines/beta/betaPolicyMath";

const referenceImplemented = [
  "Benchmark-first beta lookup from selected Damodaran Industrial Benchmark",
  "betaTableKey resolution (explicit or v1.5 industry-label default)",
  "damodaran_beta_global raw row extraction (read-only)",
  "Beta Reference / Beta Readiness card on Company Workspace",
];

const policyImplemented = [
  "Relevering formula: Unlevered Beta × (1 + (1 − taxRate) × DebtToEquity)",
  "Selected Beta and Selected Beta Source",
  "Manual override path (Review status)",
  "Missing capital-structure inputs → Review (no fake final beta)",
  "Beta Policy / Selected Beta card on Company Workspace",
];

const notImplementedItems = [
  "Cost of Equity calculation",
  "WACC Engine",
  "FCFF, Terminal Value, Firm-to-Equity Bridge, Intrinsic Value",
  "Dashboard decision logic",
  "Valuation math of any kind",
];

const importantRules = [
  "Damodaran Industrial Benchmark is the primary industry anchor — not ISM-sector.",
  "ISM-sector is display-only and must not drive beta selection or calculation.",
  "This does not calculate Cost of Equity or WACC.",
  "Selected beta is beta-engine output only — not official WACC until a future WACC phase.",
  "Debt/Equity and tax rate are not invented; missing inputs stay in Review.",
];

export default function BetaEngineDocsPage() {
  return (
    <section className="pageSection">
      <BackLink href="/engine-docs" label="Back to Engine Docs" />
      <div>
        <h2 className="sectionHeading">Beta Engine</h2>
        <p className="sectionSubheading">
          Foundation reference lookup plus relevering and selected beta policy (beta-only).
        </p>
        <p className="cardMeta">
          Current status: <strong>Foundation / Selected Beta Policy</strong>
        </p>
      </div>

      <div className="panel">
        <h3 className="cardTitle">Reference Flow</h3>
        <div className="flowchartSteps">
          <div className="flowchartBox">Selected Damodaran Industrial Benchmark</div>
          <div className="flowchartArrow">↓</div>
          <div className="flowchartBox">Damodaran beta reference (damodaran_beta_global)</div>
          <div className="flowchartArrow">↓</div>
          <div className="flowchartBox">Unlevered Beta reference</div>
          <div className="flowchartArrow">↓</div>
          <div className="flowchartBox">Company D/E and tax (when provided)</div>
          <div className="flowchartArrow">↓</div>
          <div className="flowchartBox">Relevered Beta / Selected Beta</div>
          <div className="flowchartArrow">↓</div>
          <div className="flowchartBox">Beta readiness for future WACC</div>
        </div>
      </div>

      <div className="panel">
        <h3 className="cardTitle">Relevering &amp; Selected Beta Policy</h3>
        <p className="cardMeta">
          <strong>Formula:</strong> {RELEVERING_FORMULA}
        </p>
        <p className="cardMeta">
          <strong>Required inputs:</strong> Damodaran unlevered beta reference; company Debt/Equity
          (market, book, or selected); company tax rate (selected). Optional manual override
          (Review).
        </p>
        <p className="cardMeta">
          <strong>This does not calculate Cost of Equity or WACC.</strong>
        </p>
        <p className="cardMeta">
          If Debt/Equity or tax is missing, selected beta is not final — industry levered reference
          may display with Review only.
        </p>
      </div>

      <div className="cardGrid">
        <article className="card">
          <h3 className="cardTitle">Implemented — reference</h3>
          <ul className="flowchartRulesList">
            {referenceImplemented.map((item) => (
              <li key={item} className="cardMeta">
                {item}
              </li>
            ))}
          </ul>
        </article>
        <article className="card">
          <h3 className="cardTitle">Implemented — policy</h3>
          <ul className="flowchartRulesList">
            {policyImplemented.map((item) => (
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
        <h3 className="cardTitle">Important Rules</h3>
        <ul className="flowchartRulesList">
          {importantRules.map((rule) => (
            <li key={rule} className="cardMeta">
              {rule}
            </li>
          ))}
        </ul>
      </div>

      <div className="panel">
        <h3 className="cardTitle">Code locations</h3>
        <p className="cardMeta">Types: lib/types/beta-engine.ts</p>
        <p className="cardMeta">Reference: lib/engines/beta/betaReferenceService.ts</p>
        <p className="cardMeta">Policy: lib/engines/beta/betaPolicyService.ts, betaPolicyMath.ts</p>
        <p className="cardMeta">
          UI: components/beta-reference-card.tsx, components/beta-policy-card.tsx
        </p>
      </div>
    </section>
  );
}
