const docsPlaceholders = [
  "Main Flowchart placeholder",
  "Engine Contracts placeholder",
  "Spec Coverage Tracker placeholder",
  "Build Status placeholder",
  "Phase 2 Type System implemented",
  "Phase 3 Firestore foundation implemented",
];

export default function EngineDocsPage() {
  return (
    <section className="pageSection">
      <div>
        <h2 className="sectionHeading">Engine Docs</h2>
        <p className="sectionSubheading">
          Documentation hub for source-spec traceability and build progress.
        </p>
      </div>

      <div className="cardGrid">
        {docsPlaceholders.map((item) => (
          <article key={item} className="card">
            <h3 className="cardTitle">{item}</h3>
            <p className="cardMeta">
              Detailed content is tracked in the `docs/` markdown files.
            </p>
          </article>
        ))}
      </div>

      <div className="panel">
        <p>Review markdown sources in the `docs/` folder:</p>
        <p className="cardMeta">- app-architecture.md</p>
        <p className="cardMeta">- main-valuation-flow.md</p>
        <p className="cardMeta">- engine-contracts.md</p>
        <p className="cardMeta">- spec-coverage-tracker.md</p>
        <p className="cardMeta">- build-phases.md</p>
        <p className="cardMeta">- Type modules in `lib/types/*`</p>
      </div>
    </section>
  );
}
