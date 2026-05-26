import Link from "next/link";
import { getCompanies } from "@/lib/firestore/repositories/companiesRepository";

export default async function CompaniesPage() {
  const { data: companies, source } = await getCompanies();

  return (
    <section className="pageSection">
      <div>
        <h2 className="sectionHeading">Companies</h2>
        <p className="sectionSubheading">
          Company cards and quick access to the Company Workspace. Data source:{" "}
          {source === "firestore" ? "Firestore" : "Mock"}.
        </p>
      </div>

      <div className="cardGrid">
        <Link href="/companies/new" className="clickableCard">
          <h3 className="cardTitle">+ Create New Company</h3>
          <p className="cardMeta">
            Placeholder action for onboarding a new company in a later phase.
          </p>
        </Link>

        {companies.map((company) => (
          <Link
            key={company.identity.cleanTicker}
            href={`/companies/${company.identity.cleanTicker}`}
            className="clickableCard"
          >
            <h3 className="cardTitle">{company.identity.companyName}</h3>
            <p className="cardMeta">{company.identity.fullTicker}</p>
            <p className="cardMeta">
              Industry: {company.identity.damodaranIndustrialBenchmark} (ISM: {company.identity.ismSector})
            </p>
            <p className="cardMeta">
              Decision: {company.valuationResult.decisionResult.decisionStatus}
            </p>
            <p className="cardMeta">Review: {company.reviewSummary.worstSeverity}</p>
            <p className="cardMeta">Last Updated: {company.lastUpdated}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
