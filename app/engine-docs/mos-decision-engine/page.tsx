import { BackLink } from "@/components/back-link";

const implementedItems = [
  "Upside / Downside % = (Intrinsic Value / Share − Current Share Price) ÷ Current Share Price",
  "Margin of Safety % uses the same formula as upside/downside in this foundation phase",
  "Entry Price = Intrinsic Value / Share × (1 − Required MOS)",
  "Foundation decision outcome: Above Required MOS | Below Required MOS (no Buy/Sell/Hold)",
  "Required MOS from DecisionLayerInputs.minimumMOSForApprove scaffold only",
  "Missing intrinsic, price, or required MOS guardrails (Review / Missing — no invented values)",
];

const notImplementedItems = [
  "Official Dashboard decision output",
  "Buy / Sell / Hold logic",
  "Dashboard decision wiring",
  "ISM-sector as a decision driver",
];

const importantRules = [
  "MOS / Decision Foundation is not an official Dashboard decision.",
  "No Buy/Sell/Hold logic is implemented in this phase.",
  "Decision outcome is foundation-only: Above Required MOS / Below Required MOS / N/A.",
  "Dashboard integration remains not started.",
  "Intrinsic Value / Share is sourced from Intrinsic Value foundation output.",
  "Required MOS is read from explicit decision-layer scaffold only — no invented thresholds.",
  "If intrinsic value or current price is missing, MOS metrics and decision outcome remain null.",
  "If required MOS is missing, entry price and decision outcome are withheld (Review).",
  "ISM-sector is display-only and must not drive MOS / decision logic.",
];

export default function MosDecisionEngineDocsPage() {
  return (
    <section className="pageSection">
      <BackLink href="/engine-docs" label="Back to Engine Docs" />
      <div>
        <h2 className="sectionHeading">MOS / Decision Engine</h2>
        <p className="sectionSubheading">
          Margin of safety, entry price, and foundation-only decision outcome from intrinsic value
          and market price — not connected to Dashboard buy/sell/hold.
        </p>
        <p className="cardMeta">
          Current status: <strong>Foundation</strong>
        </p>
      </div>

      <div className="panel">
        <h3 className="cardTitle">Foundation Flow</h3>
        <div className="flowchartSteps">
          <div className="flowchartBox">Intrinsic Value / Share</div>
          <div className="flowchartArrow">+</div>
          <div className="flowchartBox">Current Share Price</div>
          <div className="flowchartArrow">↓</div>
          <div className="flowchartBox">Upside / Downside % &amp; MOS %</div>
          <div className="flowchartArrow">↓</div>
          <div className="flowchartBox">Entry Price (with Required MOS)</div>
          <div className="flowchartArrow">↓</div>
          <div className="flowchartBox">Foundation Decision Outcome</div>
          <div className="flowchartArrow">↓</div>
          <div className="flowchartBox">future Dashboard Decision Integration</div>
        </div>
      </div>

      <div className="panel">
        <h3 className="cardTitle">Formulas</h3>
        <ul className="flowchartRulesList">
          <li className="cardMeta">
            Upside / Downside % = Margin of Safety % = (Intrinsic − Current Price) ÷ Current Price
          </li>
          <li className="cardMeta">Entry Price = Intrinsic Value / Share × (1 − Required MOS)</li>
          <li className="cardMeta">
            Foundation outcome: Above Required MOS when MOS % ≥ Required MOS; otherwise Below
            Required MOS
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
