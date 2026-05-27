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
    { name: "MOS / Decision Layer", status: "Foundation" },
    { name: "Dashboard decision integration", status: "Foundation" },
  ] as const;

  return (
    <article className="card">
      <h3 className="cardTitle">Valuation Engines — Build Status</h3>
      <p className="cardMeta">
        Beta through Dashboard Decision Integration foundations provide engine outputs or mapped
        presentation — not connected to official Buy/Sell/Hold decision logic.
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
