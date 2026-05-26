import Link from "next/link";
import { getDashboardRows } from "@/lib/firestore/repositories/dashboardRepository";
import { getIndustryISMDisplayMapTable } from "@/lib/firestore/repositories/sectorIndustryMappingRepository";
import type { ReviewSeverity } from "@/lib/types";

export default async function Home() {
  const [{ data: rows, source }, ismDisplayTable] = await Promise.all([
    getDashboardRows(),
    getIndustryISMDisplayMapTable(),
  ]);
  const ismByBenchmark = new Map(
    ismDisplayTable.data.map((row) => [row.damodaranIndustrialBenchmark, row.ismSectorDisplay]),
  );

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
              <th>Industry Benchmark</th>
              <th>Final MOS</th>
              <th>Decision</th>
              <th>Review Flag</th>
              <th>Beta</th>
              <th>WACC</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((company) => (
              <tr key={company.ticker}>
                <td>
                  <Link href={company.openCompanyUrl}>{company.companyName}</Link>
                </td>
                <td>
                  {company.ticker}:{company.exchange}
                </td>
                <td>{formatCurrency(company.currentPrice, company.valuationCurrency)}</td>
                <td>
                  {formatCurrency(company.intrinsicValuePerShare, company.valuationCurrency)}
                </td>
                <td>{formatMarketCap(company.marketCap, company.valuationCurrency)}</td>
                <td>
                  {company.damodaranIndustrialBenchmark}
                  {ismByBenchmark.get(company.damodaranIndustrialBenchmark)
                    ? ` (ISM: ${ismByBenchmark.get(company.damodaranIndustrialBenchmark)})`
                    : company.ismSector
                      ? ` (ISM: ${company.ismSector})`
                      : ""}
                </td>
                <td>{(company.finalMOS * 100).toFixed(2)}%</td>
                <td>{company.decisionStatus}</td>
                <td>
                  <span className={flagClass(company.reviewFlag)}>{company.reviewFlag}</span>
                </td>
                <td>{company.beta.toFixed(2)}</td>
                <td>{(company.wacc * 100).toFixed(2)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
