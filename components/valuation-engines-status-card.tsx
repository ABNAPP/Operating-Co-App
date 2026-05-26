export function ValuationEnginesStatusCard() {
  const engineRows = [
    { name: "Beta Engine", status: "Foundation / Selected Beta Policy" },
    { name: "WACC Engine", status: "Foundation" },
    { name: "Forecast & Fade Engine", status: "Foundation" },
    { name: "Reinvestment / FCFF Engine", status: "Foundation" },
    { name: "Terminal Value Engine", status: "Foundation" },
    { name: "DCF / PV Engine", status: "Foundation" },
    { name: "Firm-to-Equity Bridge", status: "Foundation" },
    { name: "Intrinsic Value / Share", status: "Foundation" },
    { name: "MOS / Decision Layer", status: "Not started" },
  ] as const;

  return (
    <article className="card">
      <h3 className="cardTitle">Valuation Engines — Build Status</h3>
      <p className="cardMeta">
        Beta through Intrinsic Value / Share foundations provide engine outputs or
        structure/readiness — not connected to MOS, entry price, buy/sell/hold, or Dashboard
        decision logic.
      </p>
      <ul className="flowchartRulesList">
        {engineRows.map((row) => (
          <li key={row.name} className="cardMeta">
            <strong>{row.name}:</strong> {row.status}
          </li>
        ))}
      </ul>
    </article>
  );
}
