import Link from "next/link";
import { getCompanies } from "@/lib/firestore/repositories/companiesRepository";

export default async function CompanyWorkspaceIndexPage() {
  const { data: companies, source } = await getCompanies();

  return (
    <section className="pageSection">
      <div>
        <h2 className="sectionHeading">Company Workspace</h2>
        <p className="sectionSubheading">
          Open a company to view company-specific valuation engine result placeholders.
          Data source: {source === "firestore" ? "Firestore" : "Mock"}.
        </p>
      </div>

      <div className="cardGrid">
        {companies.map((company) => (
          <Link
            key={company.identity.cleanTicker}
            href={`/companies/${company.identity.cleanTicker}`}
            className="card"
          >
            <h3 className="cardTitle">{company.identity.companyName}</h3>
            <p className="cardMeta">{company.identity.fullTicker}</p>
            <p className="cardMeta">Open Workspace</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
