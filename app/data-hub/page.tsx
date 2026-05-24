const dataHubSections = [
  "Riskfree Rates",
  "FX Rates",
  "Damodaran Data",
  "Country Risk / ERP",
  "Sector / Industry Mapping",
  "Beta Reference",
  "Forecast & Fade Rules",
  "API Integrations",
  "Settings",
];

export default function DataHubPage() {
  return (
    <section className="pageSection">
      <div>
        <h2 className="sectionHeading">Data Hub</h2>
        <p className="sectionSubheading">
          Central place for shared reference data, API readiness, and configuration.
        </p>
      </div>

      <div className="cardGrid">
        {dataHubSections.map((section) => (
          <article key={section} className="card">
            <h3 className="cardTitle">{section}</h3>
            <p className="cardMeta">Placeholder section for future shared data setup.</p>
          </article>
        ))}
      </div>
    </section>
  );
}
