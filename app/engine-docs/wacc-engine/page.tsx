import { BackLink } from "@/components/back-link";
import {
  AFTER_TAX_COST_OF_DEBT_FORMULA,
  COST_OF_EQUITY_FORMULA,
  WACC_FORMULA,
} from "@/lib/engines/wacc/waccMath";

const implementedItems = [
  "WACC input readiness checks (beta, riskfree, ERP, D/E or weights, pre-tax cost of debt, tax)",
  "Cost of Equity = Riskfree Rate + Selected Beta × ERP",
  "After-tax Cost of Debt = Pre-tax Cost of Debt × (1 − Tax Rate)",
  "Capital structure weights from D/E (or explicit weights when provided)",
  "WACC = Equity Weight × Cost of Equity + Debt Weight × After-tax Cost of Debt",
  "WACC Foundation card on Company Workspace",
  "Country-of-risk ERP as foundation input (Review when revenue-weighted ERP is pending)",
];

const notImplementedItems = [
  "FCFF / Reinvestment engine",
  "Terminal Value",
  "Firm-to-Equity Bridge",
  "Intrinsic Value / Share",
  "Dashboard decision logic driven by WACC",
  "Synthetic rating / ICR cost of debt (ratings.xls calculator — reference only today)",
  "Revenue-weighted ERP (country-of-risk ERP used with Review note)",
  "Official valuation outputs using WACC",
];

const importantRules = [
  "WACC is an engine output only — it does not drive FCFF, terminal value, intrinsic value, or Dashboard decisions in this phase.",
  "Selected beta comes from Beta Policy — ISM-sector is not used.",
  "Pre-tax cost of debt must be explicit (mock scaffold or future company input) — no synthetic rating yet.",
  "Missing inputs return Review or Missing — no fake WACC.",
  "Rates are stored as decimals internally; percent display is UI-only.",
];

export default function WaccEngineDocsPage() {
  return (
    <section className="pageSection">
      <BackLink href="/engine-docs" label="Back to Engine Docs" />
      <div>
        <h2 className="sectionHeading">WACC Engine</h2>
        <p className="sectionSubheading">
          Foundation Cost of Equity and WACC — not connected to valuation outputs.
        </p>
        <p className="cardMeta">
          Current status: <strong>Foundation</strong>
        </p>
      </div>

      <div className="panel">
        <h3 className="cardTitle">Foundation Flow</h3>
        <div className="flowchartSteps">
          <div className="flowchartBox">Valuation Currency</div>
          <div className="flowchartArrow">↓</div>
          <div className="flowchartBox">Riskfree Rate</div>
          <div className="flowchartArrow">↓</div>
          <div className="flowchartBox">Country Risk / ERP (country-of-risk)</div>
          <div className="flowchartArrow">↓</div>
          <div className="flowchartBox">Selected Beta (Beta Policy)</div>
          <div className="flowchartArrow">↓</div>
          <div className="flowchartBox">Cost of Equity</div>
          <div className="flowchartArrow">↓</div>
          <div className="flowchartBox">D/E, Pre-tax Cost of Debt, Tax Rate</div>
          <div className="flowchartArrow">↓</div>
          <div className="flowchartBox">After-tax Cost of Debt + Weights</div>
          <div className="flowchartArrow">↓</div>
          <div className="flowchartBox">WACC Foundation Output</div>
          <div className="flowchartArrow">↓</div>
          <div className="flowchartBox">Review / Readiness only (no valuation chain)</div>
        </div>
      </div>

      <div className="panel">
        <h3 className="cardTitle">Formulas</h3>
        <p className="cardMeta">
          <strong>Cost of Equity:</strong> {COST_OF_EQUITY_FORMULA}
        </p>
        <p className="cardMeta">
          <strong>After-tax Cost of Debt:</strong> {AFTER_TAX_COST_OF_DEBT_FORMULA}
        </p>
        <p className="cardMeta">
          <strong>Weights from D/E:</strong> Debt Weight = D/E / (1 + D/E); Equity Weight = 1 / (1 +
          D/E)
        </p>
        <p className="cardMeta">
          <strong>WACC:</strong> {WACC_FORMULA}
        </p>
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
        <h3 className="cardTitle">Important rules</h3>
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
