export default function CompanyWorkspaceLoading() {
  return (
    <section className="pageSection">
      <div>
        <h2 className="sectionHeading">Company Workspace</h2>
        <p className="sectionSubheading">Loading valuation foundation bundle…</p>
      </div>
      <div className="panel">
        <p className="cardMeta">
          One foundation bundle per company (Beta → MOS). WACC can take tens of seconds in
          development — please wait.
        </p>
      </div>
    </section>
  );
}
