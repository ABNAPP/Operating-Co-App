import { BackLink } from "@/components/back-link";

const implementedItems = [
  "NOPAT = EBIT × (1 − Tax Rate)",
  "Direct Reinvestment = CapEx − D&A + Change in Non-Cash Working Capital",
  "Sales-to-Capital Reinvestment = Change in Revenue / Sales-to-Capital (fallback when direct inputs incomplete)",
  "FCFF = NOPAT − Reinvestment",
  "Reinvestment method selection (prefer Direct; Sales-to-Capital fallback; Stable placeholder only)",
  "Readiness / missing-input handling (Ready, Review, Missing, Not Applicable)",
  "Benchmark cyclical/high review notes from Industry Benchmark Config (not ISM-sector)",
  "Reinvestment / FCFF Foundation card on Company Workspace",
];

const notImplementedItems = [
  "Stable Method reinvestment",
  "Terminal Value",
  "DCF / PV of FCFF",
  "Firm-to-Equity Bridge",
  "Intrinsic Value / Share",
  "Dashboard decision logic driven by FCFF",
  "Official valuation outputs using FCFF paths",
];

const importantRules = [
  "Damodaran Industrial Benchmark is the primary industry anchor — ISM-sector is display-only.",
  "Benchmark context may create review notes, but ISM-sector does not drive FCFF logic.",
  "This phase calculates NOPAT, reinvestment and FCFF only — not terminal value, DCF/PV, bridge, or intrinsic value.",
  "Missing or incomplete operating inputs return Review or Missing — no fake FCFF.",
  "Reinvestment / FCFF output is not connected to Dashboard decisions.",
];

export default function ReinvestmentFcffEngineDocsPage() {
  return (
    <section className="pageSection">
      <BackLink href="/engine-docs" label="Back to Engine Docs" />
      <div>
        <h2 className="sectionHeading">Reinvestment / FCFF Engine</h2>
        <p className="sectionSubheading">
          NOPAT, reinvestment and FCFF foundation — not connected to terminal value, DCF/PV, bridge,
          intrinsic value, or Dashboard decisions.
        </p>
        <p className="cardMeta">
          Current status: <strong>Foundation</strong>
        </p>
      </div>

      <div className="panel">
        <h3 className="cardTitle">Foundation Flow</h3>
        <div className="flowchartSteps">
          <div className="flowchartBox">Company operating inputs</div>
          <div className="flowchartArrow">↓</div>
          <div className="flowchartBox">NOPAT</div>
          <div className="flowchartArrow">↓</div>
          <div className="flowchartBox">Reinvestment method selection</div>
          <div className="flowchartArrow">↓</div>
          <div className="flowchartBox">Reinvestment</div>
          <div className="flowchartArrow">↓</div>
          <div className="flowchartBox">FCFF</div>
          <div className="flowchartArrow">↓</div>
          <div className="flowchartBox">Future Terminal / DCF / Bridge</div>
        </div>
      </div>

      <div className="panel">
        <h3 className="cardTitle">Formulas</h3>
        <ul className="flowchartRulesList">
          <li className="cardMeta">NOPAT = EBIT × (1 − Tax Rate)</li>
          <li className="cardMeta">
            Direct Reinvestment = CapEx − D&amp;A + Change in Non-Cash Working Capital
          </li>
          <li className="cardMeta">
            Sales-to-Capital Reinvestment = Change in Revenue / Sales-to-Capital
          </li>
          <li className="cardMeta">FCFF = NOPAT − Reinvestment</li>
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
