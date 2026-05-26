import { BackLink } from "@/components/back-link";

const implementedItems = [
  "Discounting / Discount Factor = 1 / (1 + WACC) ^ yearNumber",
  "PV of Forecast FCFF = Forecast FCFF × Discount Factor",
  "PV of Terminal Value = Terminal Value × Discount Factor at terminal year",
  "Value of Operating Assets = Sum PV Forecast FCFF + PV Terminal Value",
  "Missing input handling (no fake PV when inputs are incomplete)",
];

const notImplementedItems = [
  "Firm-to-Equity Bridge",
  "Equity Value",
  "Intrinsic Value / Share",
  "Dashboard decisions",
];

const importantRules = [
  "DCF/PV is foundation-only and not an official valuation output yet.",
  "DCF/PV calculates PV of forecast FCFF, PV of terminal value, and Value of Operating Assets only.",
  "If WACC is missing, PV outputs are null (no fake PV).",
  "If forecast FCFF is missing, PV forecast FCFF is Missing/Review (no fake PV).",
  "If terminal value is missing, PV terminal value is Missing/Review (no fake PV).",
  "ISM-sector is display-only and must not drive DCF/PV logic.",
];

export default function DcfPvEngineDocsPage() {
  return (
    <section className="pageSection">
      <BackLink href="/engine-docs" label="Back to Engine Docs" />
      <div>
        <h2 className="sectionHeading">DCF / PV Engine</h2>
        <p className="sectionSubheading">
          PV of forecast FCFF and terminal value — foundation-only (not discounted to present equity
          decisions yet).
        </p>
        <p className="cardMeta">
          Current status: <strong>Foundation</strong>
        </p>
      </div>

      <div className="panel">
        <h3 className="cardTitle">Foundation Flow</h3>
        <div className="flowchartSteps">
          <div className="flowchartBox">Forecast FCFF + Terminal Value + WACC</div>
          <div className="flowchartArrow">↓</div>
          <div className="flowchartBox">PV of Forecast FCFF</div>
          <div className="flowchartArrow">↓</div>
          <div className="flowchartBox">PV of Terminal Value</div>
          <div className="flowchartArrow">↓</div>
          <div className="flowchartBox">Value of Operating Assets</div>
          <div className="flowchartArrow">↓</div>
          <div className="flowchartBox">future Bridge / Intrinsic Value</div>
        </div>
      </div>

      <div className="panel">
        <h3 className="cardTitle">Formulas</h3>
        <ul className="flowchartRulesList">
          <li className="cardMeta">Discount Factor = 1 / (1 + WACC) ^ yearNumber</li>
          <li className="cardMeta">PV of Forecast FCFF = Forecast FCFF × Discount Factor</li>
          <li className="cardMeta">PV of Terminal Value = Terminal Value × Discount Factor</li>
          <li className="cardMeta">
            Value of Operating Assets = Sum PV Forecast FCFF + PV Terminal Value
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

