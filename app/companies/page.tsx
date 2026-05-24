import Link from "next/link";
import { mockCompanies } from "@/lib/mock-companies";

export default function CompaniesPage() {
  return (
    <section className="pageSection">
      <div>
        <h2 className="sectionHeading">Companies</h2>
        <p className="sectionSubheading">
          Company cards and quick access to the Company Workspace.
        </p>
      </div>

      <div className="cardGrid">
        <Link href="/companies/new" className="card">
          <h3 className="cardTitle">+ Create New Company</h3>
          <p className="cardMeta">
            Placeholder action for onboarding a new company in a later phase.
          </p>
        </Link>

        {mockCompanies.map((company) => (
          <Link
            key={company.cleanTicker}
            href={`/companies/${company.cleanTicker}`}
            className="card"
          >
            <h3 className="cardTitle">{company.companyName}</h3>
            <p className="cardMeta">{company.fullTicker}</p>
            <p className="cardMeta">Decision: {company.decisionStatus}</p>
            <p className="cardMeta">Review: {company.reviewFlag}</p>
            <p className="cardMeta">Last Updated: {company.lastUpdated}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
