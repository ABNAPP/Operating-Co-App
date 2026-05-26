import Link from "next/link";
import { getDashboardRows } from "@/lib/firestore/repositories/dashboardRepository";
import { getIndustryISMDisplayMapTable } from "@/lib/firestore/repositories/sectorIndustryMappingRepository";
import type { ReviewSeverity } from "@/lib/types";
import {
  formatAmountMillions,
  formatNumber,
  formatPercent,
  formatPerShare,
} from "@/lib/utils/formatters";

export default async function Home() {
  const [{ data: rows, source }, ismDisplayTable] = await Promise.all([
    getDashboardRows(),
    getIndustryISMDisplayMapTable(),
  ]);
  const ismByBenchmark = new Map(
    ismDisplayTable.data.map((row) => [row.damodaranIndustrialBenchmark, row.ismSectorDisplay]),
  );

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
              <th>Market Cap (m)</th>
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
                <td>
                  {formatPerShare(company.currentPrice, { currency: company.valuationCurrency })}
                </td>
                <td>
                  {formatPerShare(company.intrinsicValuePerShare, {
                    currency: company.valuationCurrency,
                  })}
                </td>
                <td>
                  {formatAmountMillions(company.marketCap, {
                    valueScale: "absolute",
                    currency: company.valuationCurrency,
                  })}
                </td>
                <td>
                  {company.damodaranIndustrialBenchmark}
                  {ismByBenchmark.get(company.damodaranIndustrialBenchmark)
                    ? ` (ISM: ${ismByBenchmark.get(company.damodaranIndustrialBenchmark)})`
                    : company.ismSector
                      ? ` (ISM: ${company.ismSector})`
                      : ""}
                </td>
                <td>{formatPercent(company.finalMOS)}</td>
                <td>{company.decisionStatus}</td>
                <td>
                  <span className={flagClass(company.reviewFlag)}>{company.reviewFlag}</span>
                </td>
                <td>{formatNumber(company.beta)}</td>
                <td>{formatPercent(company.wacc)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
