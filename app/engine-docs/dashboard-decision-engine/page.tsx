import { BackLink } from "@/components/back-link";

const implementedItems = [
  "Dashboard Decision Integration mapping from Company Foundation Bundle (Intrinsic + MOS)",
  "Dashboard UI foundation table on `/` (presentation only)",
  "Foundation outcome: Above Required MOS / Below Required MOS / N/A",
  "Foundation status: Ready / Review / Missing / Not Applicable",
  "One foundation bundle per company on Dashboard — no duplicate valuation chains per row",
];

const notImplementedItems = [
  "Official Buy / Sell / Hold decision logic",
  "Gateway, hard gate, or shadow valuation",
  "Dashboard calculating valuation math directly",
  "Replacing legacy mock scaffold with foundation as official decision",
];

const importantRules = [
  "Dashboard Decision Integration is foundation-only — not an official investment decision.",
  "The Dashboard maps pre-computed foundation outputs; it does not run valuation formulas.",
  "MOS foundation outcome must not be interpreted as Buy/Sell/Hold.",
  "Legacy mock decision (Approve/Watchlist) remains separate scaffold data when displayed.",
  "No gateway, hard gate, or shadow valuation in this phase.",
];

export default function DashboardDecisionEngineDocsPage() {
  return (
    <section className="pageSection">
      <BackLink href="/engine-docs" label="Back to Engine Docs" />
      <div>
        <h2 className="sectionHeading">Dashboard Decision Integration</h2>
        <p className="sectionSubheading">
          Presentation mapping from valuation foundation bundle to Dashboard table — not an official
          decision engine.
        </p>
        <p className="cardMeta">
          Current status: <strong>Foundation</strong> (UI wiring + mapping)
        </p>
      </div>

      <div className="panel">
        <h3 className="cardTitle">Flow</h3>
        <div className="flowchartSteps">
          <div className="flowchartBox">Company Foundation Bundle</div>
          <div className="flowchartArrow">↓</div>
          <div className="flowchartBox">Dashboard Decision Integration mapping</div>
          <div className="flowchartArrow">↓</div>
          <div className="flowchartBox">Dashboard foundation table (presentation)</div>
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
