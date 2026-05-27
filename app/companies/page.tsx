import Link from "next/link";
import { getCompanies } from "@/lib/firestore/repositories/companiesRepository";
import { getIndustryISMDisplayMapTable } from "@/lib/firestore/repositories/sectorIndustryMappingRepository";

export default async function CompaniesPage() {
  const { data: companies, source } = await getCompanies();
  const ismDisplayMapResult = await getIndustryISMDisplayMapTable();
  const ismDisplayByBenchmark = new Map(
    ismDisplayMapResult.data.map((row) => [row.damodaranIndustrialBenchmark, row]),
  );

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
              Industry Benchmark: {company.identity.damodaranIndustrialBenchmark}
            </p>
            <p className="cardMeta">
              ISM-sector:{" "}
              {ismDisplayByBenchmark.get(company.identity.damodaranIndustrialBenchmark)
                ?.ismSectorDisplay ?? company.identity.ismSector}{" "}
              (display-only)
            </p>
            <p className="cardMeta">Dashboard decision integration: Foundation (see Dashboard)</p>
            <p className="cardMeta">
              Mock review severity: {company.reviewSummary.worstSeverity} (legacy scaffold)
            </p>
            <p className="cardMeta">Last Updated: {company.lastUpdated}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
