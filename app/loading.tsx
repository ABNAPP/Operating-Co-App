export default function RootLoading() {
  return (
    <section className="pageSection">
      <div>
        <h2 className="sectionHeading">Dashboard</h2>
        <p className="sectionSubheading">Loading foundation decision integration…</p>
      </div>
      <div className="panel">
        <p className="cardMeta">
          The Dashboard maps pre-computed valuation foundation outputs (one bundle per company).
          WACC foundation can take tens of seconds per company in development when Firestore is
          used — please wait.
        </p>
        <p className="cardMeta">The page does not calculate valuation in the browser.</p>
      </div>
    </section>
  );
}
