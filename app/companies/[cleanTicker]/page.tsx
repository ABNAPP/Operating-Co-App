import Link from "next/link";
import { notFound } from "next/navigation";
import { getCompanyByCleanTicker } from "@/lib/firestore/repositories/companiesRepository";

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
  const { data: company, source } = await getCompanyByCleanTicker(cleanTicker);

  if (!company) {
    notFound();
  }

  return (
    <section className="pageSection">
      <div>
        <h2 className="sectionHeading">Company Workspace</h2>
        <p className="sectionSubheading">
          {company.identity.companyName} ({company.identity.fullTicker}) company-specific
          valuation engine results workspace. Data source:{" "}
          {source === "firestore" ? "Firestore" : "Mock"}.
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
        <article className="card">
          <h3 className="cardTitle">Snapshot</h3>
          <p className="cardMeta">Country of risk: {company.identity.countryOfRisk}</p>
          <p className="cardMeta">Website: {company.identity.websiteUrl}</p>
          <p className="cardMeta">
            Currency: {company.currencies.reportingCurrency} /{" "}
            {company.currencies.valuationCurrency}
          </p>
        </article>
        <article className="card">
          <h3 className="cardTitle">Inputs</h3>
          <p className="cardMeta">
            Current price: {company.marketInputs.currentPrice.toLocaleString()}
          </p>
          <p className="cardMeta">
            Market cap: {company.marketInputs.marketCap.toLocaleString()}
          </p>
          <p className="cardMeta">Riskfree rate: {company.riskWaccInputs.riskfreeRate}</p>
        </article>
        <article className="card">
          <h3 className="cardTitle">Historical Data</h3>
          <p className="cardMeta">Periods: {company.availableHistoricalPeriods.join(", ")}</p>
          <p className="cardMeta">
            LTM Revenue: {company.historicalData.incomeStatement.revenue.LTM.toLocaleString()}
          </p>
          <p className="cardMeta">
            LTM FCF: {company.historicalData.cashFlow.freeCashFlow.LTM.toLocaleString()}
          </p>
        </article>
        <article className="card">
          <h3 className="cardTitle">Forecast Data</h3>
          <p className="cardMeta">
            Y+1 growth: {company.forecastData.baseCaseRevenueGrowthByPeriod.YEAR_PLUS_1}
          </p>
          <p className="cardMeta">
            Y+3 margin: {company.forecastData.baseCaseOperatingMarginByPeriod.YEAR_PLUS_3}
          </p>
          <p className="cardMeta">{company.forecastData.narrative}</p>
        </article>
        <article className="card">
          <h3 className="cardTitle">Valuation Engines</h3>
          <p className="cardMeta">
            WACC: {company.valuationResult.riskWaccResult.wacc.toFixed(3)}
          </p>
          <p className="cardMeta">
            Intrinsic value/share:{" "}
            {company.valuationResult.perShareValuationResult.intrinsicValuePerShare}
          </p>
          <p className="cardMeta">
            Terminal method: {company.valuationResult.terminalValueResult.terminalMethod}
          </p>
        </article>
        <article className="card">
          <h3 className="cardTitle">Review & Decision</h3>
          <p className="cardMeta">Worst severity: {company.reviewSummary.worstSeverity}</p>
          <p className="cardMeta">
            Decision: {company.valuationResult.decisionResult.decisionStatus}
          </p>
          <p className="cardMeta">{company.valuationResult.decisionResult.statusNote}</p>
        </article>
        <article className="card">
          <h3 className="cardTitle">Notes / Sources</h3>
          <p className="cardMeta">Phase 2 uses mock placeholders only.</p>
          <p className="cardMeta">No API calls, Firestore, or valuation formulas yet.</p>
        </article>
      </div>

      <div className="panel">
        <p>
          <strong>Decision status:</strong>{" "}
          {company.valuationResult.decisionResult.decisionStatus}
        </p>
        <p>
          <strong>Review flag:</strong> {company.reviewSummary.worstSeverity}
        </p>
        <p>
          <strong>Status note:</strong> {company.valuationResult.decisionResult.statusNote}
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
