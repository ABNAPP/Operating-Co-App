import Link from "next/link";
import { getDashboardRows } from "@/lib/firestore/repositories/dashboardRepository";
import type { ReviewSeverity } from "@/lib/types";

export default async function Home() {
  const { data: rows, source } = await getDashboardRows();

  const formatCurrency = (value: number, currency = "USD") =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(value);

  const formatMarketCap = (value: number, currency = "USD") =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      notation: "compact",
      maximumFractionDigits: 2,
    }).format(value);

  const flagClass = (flag: ReviewSeverity) => {
    if (flag === "Info") return "badge badgeGreen";
    if (flag === "Watch") return "badge badgeYellow";
    return "badge badgeRed";
  };

  return (
    <section className="pageSection">
      <div>
        <h2 className="sectionHeading">Dashboard</h2>
        <p className="sectionSubheading">
          Official outputs and support outputs only. No valuation calculations are
          performed here. Data source: {source === "firestore" ? "Firestore" : "Mock"}.
        </p>
      </div>

      <div className="tableWrap">
        <table>
          <thead>
            <tr>
              <th>Company</th>
              <th>Ticker</th>
              <th>Price</th>
              <th>Intrinsic Value / Share</th>
              <th>Market Cap</th>
              <th>Sector</th>
              <th>Final MOS</th>
              <th>Decision</th>
              <th>Review Flag</th>
              <th>Beta</th>
              <th>WACC</th>
              <th>Workspace</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((company) => (
              <tr key={company.ticker}>
                <td>{company.companyName}</td>
                <td>
                  {company.ticker}:{company.exchange}
                </td>
                <td>{formatCurrency(company.currentPrice, company.valuationCurrency)}</td>
                <td>
                  {formatCurrency(company.intrinsicValuePerShare, company.valuationCurrency)}
                </td>
                <td>{formatMarketCap(company.marketCap, company.valuationCurrency)}</td>
                <td>{company.ismSector}</td>
                <td>{(company.finalMOS * 100).toFixed(2)}%</td>
                <td>{company.decisionStatus}</td>
                <td>
                  <span className={flagClass(company.reviewFlag)}>{company.reviewFlag}</span>
                </td>
                <td>{company.beta.toFixed(2)}</td>
                <td>{(company.wacc * 100).toFixed(2)}%</td>
                <td>
                  <Link href={company.openCompanyUrl}>Open Workspace</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
