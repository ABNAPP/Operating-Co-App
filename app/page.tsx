import Link from "next/link";
import { mockCompanies } from "@/lib/mock-companies";

export default function Home() {
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

  const flagClass = (flag: string) => {
    if (flag === "Green") return "badge badgeGreen";
    if (flag === "Yellow") return "badge badgeYellow";
    return "badge badgeRed";
  };

  return (
    <section className="pageSection">
      <div>
        <h2 className="sectionHeading">Dashboard</h2>
        <p className="sectionSubheading">
          Official outputs and support outputs only. No valuation calculations are
          performed here.
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
              <th>Final MOS</th>
              <th>Decision</th>
              <th>Review Flag</th>
              <th>Workspace</th>
            </tr>
          </thead>
          <tbody>
            {mockCompanies.map((company) => (
              <tr key={company.cleanTicker}>
                <td>{company.companyName}</td>
                <td>{company.fullTicker}</td>
                <td>{formatCurrency(company.currentPrice, company.tradingCurrency)}</td>
                <td>
                  {formatCurrency(
                    company.intrinsicValuePerShare,
                    company.valuationCurrency,
                  )}
                </td>
                <td>{formatMarketCap(company.marketCap, company.valuationCurrency)}</td>
                <td>{company.finalMOS.toFixed(2)}%</td>
                <td>{company.decisionStatus}</td>
                <td>
                  <span className={flagClass(company.reviewFlag)}>{company.reviewFlag}</span>
                </td>
                <td>
                  <Link href={`/companies/${company.cleanTicker}`}>Open Workspace</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
