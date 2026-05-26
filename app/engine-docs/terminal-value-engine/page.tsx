import { BackLink } from "@/components/back-link";

const implementedItems = [
  "Terminal FCFF = Final Forecast FCFF × (1 + Stable Growth Rate)",
  "Gordon Terminal Value = Terminal FCFF / (Stable WACC - Stable Growth Rate)",
  "Stable growth vs WACC guardrail (stable growth >= stable WACC => null terminal value)",
  "Missing input handling (final forecast FCFF / stable inputs => null terminal outputs)",
  "Foundation scope only: no DCF/PV discounting, no bridge, no intrinsic value, no Dashboard decisions",
];

const notImplementedItems = [
  "Exit Multiple terminal value",
  "Hybrid terminal value",
  "DCF / PV of forecast FCFF",
  "Firm-to-Equity Bridge",
  "Intrinsic Value / Share",
  "Dashboard decision logic driven by terminal outputs",
];

const importantRules = [
  "Gordon Growth is the only implemented foundation method for this phase.",
  "ISM-sector is display-only and must not drive terminal value logic.",
  "Terminal Value foundation calculates terminal FCFF and Gordon terminal value only; it does not calculate DCF/PV, bridge, intrinsic value, or Dashboard decisions.",
  "If stable growth >= stable WACC, terminal value is returned as null and status is Review/Missing (no fake terminal math).",
];

export default function TerminalValueEngineDocsPage() {
  return (
    <section className="pageSection">
      <BackLink href="/engine-docs" label="Back to Engine Docs" />
      <div>
        <h2 className="sectionHeading">Terminal Value Engine</h2>
        <p className="sectionSubheading">
          Terminal FCFF and Gordon terminal value foundation outputs — not discounted and not connected to
          bridge/intrinsic valuation outputs.
        </p>
        <p className="cardMeta">
          Current status: <strong>Foundation</strong>
        </p>
      </div>

      <div className="panel">
        <h3 className="cardTitle">Foundation Flow</h3>
        <div className="flowchartSteps">
          <div className="flowchartBox">Final forecast FCFF</div>
          <div className="flowchartArrow">↓</div>
          <div className="flowchartBox">Stable growth</div>
          <div className="flowchartArrow">↓</div>
          <div className="flowchartBox">Stable WACC</div>
          <div className="flowchartArrow">↓</div>
          <div className="flowchartBox">Terminal FCFF</div>
          <div className="flowchartArrow">↓</div>
          <div className="flowchartBox">Gordon Terminal Value</div>
          <div className="flowchartArrow">↓</div>
          <div className="flowchartBox">future DCF/PV / Bridge / Intrinsic Value</div>
        </div>
      </div>

      <div className="panel">
        <h3 className="cardTitle">Formulas</h3>
        <ul className="flowchartRulesList">
          <li className="cardMeta">Terminal FCFF = Final Forecast FCFF × (1 + Stable Growth Rate)</li>
          <li className="cardMeta">
            Gordon Terminal Value = Terminal FCFF / (Stable WACC - Stable Growth Rate)
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

