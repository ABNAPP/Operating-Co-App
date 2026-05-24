import Link from "next/link";
import { mockCompanies } from "@/lib/mock-companies";

export default function CompanyWorkspaceIndexPage() {
  return (
    <section className="pageSection">
      <div>
        <h2 className="sectionHeading">Company Workspace</h2>
        <p className="sectionSubheading">
          Open a company to view company-specific valuation engine result placeholders.
        </p>
      </div>

      <div className="cardGrid">
        {mockCompanies.map((company) => (
          <Link
            key={company.cleanTicker}
            href={`/companies/${company.cleanTicker}`}
            className="card"
          >
            <h3 className="cardTitle">{company.companyName}</h3>
            <p className="cardMeta">{company.fullTicker}</p>
            <p className="cardMeta">Open Workspace</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
