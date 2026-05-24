import Link from "next/link";
import { notFound } from "next/navigation";
import { getMockCompanyByTicker } from "@/lib/mock-companies";

const workspaceSections = [
  "Snapshot",
  "Inputs",
  "Historical Data",
  "Forecast Data",
  "Valuation Engines",
  "Review & Decision",
  "Notes / Sources",
];

export default async function CompanyWorkspacePage({
  params,
}: {
  params: Promise<{ cleanTicker: string }>;
}) {
  const { cleanTicker } = await params;
  const company = getMockCompanyByTicker(cleanTicker);

  if (!company) {
    notFound();
  }

  return (
    <section className="pageSection">
      <div>
        <h2 className="sectionHeading">Company Workspace</h2>
        <p className="sectionSubheading">
          {company.companyName} ({company.fullTicker}) company-specific valuation engine
          results workspace.
        </p>
      </div>

      <div className="panel">
        <p>
          Global Valuation Engine logic will remain shared, while this workspace stores
          company-specific output paths and review status.
        </p>
      </div>

      <div className="tabsRow" aria-label="Workspace sections">
        {workspaceSections.map((section) => (
          <span key={section} className="tabPill">
            {section}
          </span>
        ))}
      </div>

      <div className="cardGrid">
        {workspaceSections.map((section) => (
          <article key={section} className="card">
            <h3 className="cardTitle">{section}</h3>
            <p className="cardMeta">
              Placeholder content for {section.toLowerCase()} in Phase 1.
            </p>
          </article>
        ))}
      </div>

      <div className="panel">
        <p>
          <strong>Decision status:</strong> {company.decisionStatus}
        </p>
        <p>
          <strong>Review flag:</strong> {company.reviewFlag}
        </p>
        <p>
          <strong>Status note:</strong> {company.statusNote}
        </p>
        <p>
          <strong>Last updated:</strong> {company.lastUpdated}
        </p>
        <p style={{ marginTop: "0.75rem" }}>
          <Link href="/companies">Back to Companies</Link>
        </p>
      </div>
    </section>
  );
}
