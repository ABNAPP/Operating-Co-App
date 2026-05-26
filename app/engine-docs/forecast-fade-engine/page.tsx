import { BackLink } from "@/components/back-link";

const implementedItems = [
  "Stage recommendation from Industry Benchmark Config (default stage recommendation)",
  "History recommendation (years) from Industry Benchmark Config",
  "Cyclicality and asset-intensity review flags",
  "Benchmark template status review (excluded / review / mapping)",
  "Forecast scaffold readiness (revenue/margin flags — no forecast math)",
  "Fade structure hints (fade required, fade start / fade-to-stable years)",
  "Forecast & Fade Foundation card on Company Workspace",
];

const notImplementedItems = [
  "Revenue forecast calculation",
  "Margin / EBIT forecast calculation",
  "Reinvestment engine",
  "FCFF",
  "Terminal Value",
  "Firm-to-Equity Bridge",
  "Intrinsic Value / Share",
  "Dashboard decision logic driven by forecast/fade",
  "Official valuation outputs using forecast paths",
];

const importantRules = [
  "Damodaran Industrial Benchmark is the primary industry anchor — ISM-sector is display-only.",
  "Industry Benchmark Config provides default stage, history, cyclicality, and review context only.",
  "This phase recommends structure and readiness — it does not invent company forecasts.",
  "Missing or incomplete forecast scaffold inputs return Review or Missing — no fake forecast math.",
  "Forecast & Fade output is not connected to FCFF, terminal value, intrinsic value, or Dashboard decisions.",
];

export default function ForecastFadeEngineDocsPage() {
  return (
    <section className="pageSection">
      <BackLink href="/engine-docs" label="Back to Engine Docs" />
      <div>
        <h2 className="sectionHeading">Forecast &amp; Fade Engine</h2>
        <p className="sectionSubheading">
          Foundation stage/history/cyclicality and fade readiness — not connected to valuation
          outputs.
        </p>
        <p className="cardMeta">
          Current status: <strong>Foundation</strong>
        </p>
      </div>

      <div className="panel">
        <h3 className="cardTitle">Foundation Flow</h3>
        <div className="flowchartSteps">
          <div className="flowchartBox">Selected Damodaran Industrial Benchmark</div>
          <div className="flowchartArrow">↓</div>
          <div className="flowchartBox">Industry Benchmark Config</div>
          <div className="flowchartArrow">↓</div>
          <div className="flowchartBox">Stage / history / cyclicality / fade readiness</div>
          <div className="flowchartArrow">↓</div>
          <div className="flowchartBox">Future Forecast Engine</div>
          <div className="flowchartArrow">↓</div>
          <div className="flowchartBox">Review / Readiness only (no valuation chain)</div>
        </div>
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
