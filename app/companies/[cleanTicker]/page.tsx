import { notFound } from "next/navigation";
import { BackLink } from "@/components/back-link";
import { BetaPolicyCard } from "@/components/beta-policy-card";
import { BetaReferenceCard } from "@/components/beta-reference-card";
import { CompanyManualInputsWorkspace } from "@/components/company-manual-inputs-workspace";
import { CompanyWorkspaceTabNav } from "@/components/company-workspace-tab-nav";
import { loadCompanyForManualInputsWorkspace } from "@/lib/company-workspace/manualInputsPersistenceService";
import { buildManualInputsWorkspaceModel } from "@/lib/company-workspace/manualInputsWorkspaceModel";
import { DcfPvFoundationCard } from "@/components/dcf-pv-foundation-card";
import { EquityBridgeFoundationCard } from "@/components/equity-bridge-foundation-card";
import { ForecastFadeFoundationCard } from "@/components/forecast-fade-foundation-card";
import { IntrinsicValueFoundationCard } from "@/components/intrinsic-value-foundation-card";
import { MosDecisionFoundationCard } from "@/components/mos-decision-foundation-card";
import { ReinvestmentFcffFoundationCard } from "@/components/reinvestment-fcff-foundation-card";
import { TerminalValueFoundationCard } from "@/components/terminal-value-foundation-card";
import { ValuationEnginesStatusCard } from "@/components/valuation-engines-status-card";
import { WaccFoundationCard } from "@/components/wacc-foundation-card";
import {
  getForecastFadeCardState,
  getSnapshotBetaState,
  getWorkspaceFoundationCardsState,
} from "@/lib/company-workspace/foundationCardState";
import {
  parseWorkspaceTab,
  tabRequiresBetaPolicyOnly,
  tabRequiresForecastFadeOnly,
  tabRequiresFoundationBundle,
} from "@/lib/company-workspace/workspaceTabs";
import { computeBetaPolicyForCompany } from "@/lib/engines/beta/betaPolicyService";
import { getCachedCompanyFoundationBundle } from "@/lib/engines/company-foundation/companyFoundationCacheService";
import { computeForecastFadeForCompany } from "@/lib/engines/forecast-fade/forecastFadeService";
import { getCompanyByCleanTicker } from "@/lib/firestore/repositories/companiesRepository";
import {
  getBenchmarkDataPullKeysTable,
  getDamodaranIndustryUniverse,
  getIndustryBenchmarkConfigTable,
  getIndustryISMDisplayMapTable,
} from "@/lib/firestore/repositories/sectorIndustryMappingRepository";
import {
  formatAmountMillions,
  formatPercent,
  formatPerShare,
} from "@/lib/utils/formatters";

export default async function CompanyWorkspacePage({
  params,
  searchParams,
}: {
  params: Promise<{ cleanTicker: string }>;
  searchParams: Promise<{ refresh?: string; tab?: string }>;
}) {
  const { cleanTicker } = await params;
  const { refresh, tab } = await searchParams;
  const activeTab = parseWorkspaceTab(tab);
  const refreshCache = refresh === "1";

  const { data: company, source } = await getCompanyByCleanTicker(cleanTicker);
  if (!company) {
    notFound();
  }

  const selectedBenchmark = company.identity.damodaranIndustrialBenchmark ?? "";

  const [benchmarkUniverse, benchmarkConfigTable, ismDisplayMapTable, pullKeysTable] =
    await Promise.all([
      getDamodaranIndustryUniverse(),
      getIndustryBenchmarkConfigTable(),
      getIndustryISMDisplayMapTable(),
      getBenchmarkDataPullKeysTable(),
    ]);

  const benchmarkConfig =
    benchmarkConfigTable.data.find((row) => row.damodaranIndustrialBenchmark === selectedBenchmark) ??
    null;
  const selectedIsmRow =
    ismDisplayMapTable.data.find((row) => row.damodaranIndustrialBenchmark === selectedBenchmark) ??
    null;
  const pullKeys =
    pullKeysTable.data.find((row) => row.damodaranIndustrialBenchmark === selectedBenchmark) ?? null;

  const snapshotBeta =
    selectedBenchmark && tabRequiresBetaPolicyOnly(activeTab)
      ? await computeBetaPolicyForCompany(company)
      : null;
  const snapshotBetaState = getSnapshotBetaState(company, snapshotBeta);

  const forecastFadeOnly =
    selectedBenchmark && tabRequiresForecastFadeOnly(activeTab)
      ? await computeForecastFadeForCompany(company)
      : null;
  const forecastFadeCard = getForecastFadeCardState(company, forecastFadeOnly);

  const foundationBundle =
    selectedBenchmark && tabRequiresFoundationBundle(activeTab)
      ? await getCachedCompanyFoundationBundle(company, { refresh: refreshCache })
      : null;
  const foundationCards = foundationBundle
    ? getWorkspaceFoundationCardsState(company, foundationBundle)
    : null;

  const inputsWorkspace =
    activeTab === "inputs"
      ? await loadCompanyForManualInputsWorkspace(company)
      : null;

  return (
    <section className="pageSection">
      <div>
        <BackLink href="/companies" label="Back to Companies" />
        <h2 className="sectionHeading">Company Workspace</h2>
        <p className="sectionSubheading">
          {company.identity.companyName} ({company.identity.fullTicker}) — tab:{" "}
          <strong>{activeTab}</strong>. Data source: {source === "firestore" ? "Firestore" : "Mock"}.
        </p>
      </div>

      <div className="panel">
        <p className="cardMeta">
          Company Workspace uses sub-tabs via <code>?tab=</code> (e.g. snapshot, valuation, review).
          Valuation foundation runs only on Valuation Engines and Review &amp; Decision tabs (cached).
          Append <code>?refresh=1</code> to bypass foundation cache.
        </p>
      </div>

      <CompanyWorkspaceTabNav
        cleanTicker={cleanTicker}
        activeTab={activeTab}
        refresh={refreshCache}
      />

      {activeTab === "snapshot" ? (
        <div className="cardGrid">
          <article className="card">
            <h3 className="cardTitle">Snapshot</h3>
            <p className="cardMeta">Country of risk: {company.identity.countryOfRisk}</p>
            <p className="cardMeta">Website: {company.identity.websiteUrl}</p>
            <p className="cardMeta">
              Reporting / valuation currency: {company.currencies.reportingCurrency} /{" "}
              {company.currencies.valuationCurrency}
            </p>
            <p className="cardMeta">Last updated: {company.lastUpdated}</p>
          </article>

          <article className="card">
            <h3 className="cardTitle">Inputs summary</h3>
            <p className="cardMeta">
              Current price:{" "}
              {formatPerShare(company.marketInputs.currentPrice, {
                currency: company.currencies.valuationCurrency,
              })}
            </p>
            <p className="cardMeta">
              Market cap (m):{" "}
              {formatAmountMillions(company.marketInputs.marketCap, {
                valueScale: "absolute",
                currency: company.currencies.valuationCurrency,
              })}
            </p>
            <p className="cardMeta">
              Riskfree rate (scaffold): {formatPercent(company.riskWaccInputs.riskfreeRate)}
            </p>
          </article>

          <article className="card">
            <h3 className="cardTitle">Industry Benchmark Config Scaffold</h3>
            <p className="cardMeta">
              Benchmark-first scaffold only. No valuation math is executed from this mapping alone.
            </p>
            <label className="cardMeta" htmlFor="benchmark-select">
              Selected Damodaran Industrial Benchmark (Primary)
            </label>
            <select id="benchmark-select" defaultValue={selectedBenchmark} disabled>
              <option value="">Select benchmark</option>
              {benchmarkUniverse.data.map((row) => (
                <option key={row.id} value={row.damodaranIndustrialBenchmark}>
                  {row.damodaranIndustrialBenchmark}
                </option>
              ))}
            </select>
            <p className="cardMeta" style={{ marginTop: "0.5rem" }}>
              Current selection: {selectedBenchmark || "Mapping Required"}
            </p>
            <p className="cardMeta">
              ISM-sector (Derived display-only):{" "}
              {selectedIsmRow?.ismSectorDisplay ?? "Mapping Required"}
            </p>
            <p className="cardMeta">
              ISM display use: {selectedIsmRow?.use ?? "Display only - no model-driving effect"}
            </p>
            <p className="cardMeta">
              Template Status: {benchmarkConfig?.templateStatus ?? "Review Required"}
            </p>
            <p className="cardMeta">
              Default Stage Recommendation:{" "}
              {benchmarkConfig?.defaultStageRecommendation ?? "Review Required"}
            </p>
            <p className="cardMeta">
              History Recommendation:{" "}
              {benchmarkConfig?.historyRecommendation ?? "Review Required"}
            </p>
            <p className="cardMeta">
              Cyclicality Flag: {benchmarkConfig?.cyclicalityFlag ?? "Review Required"}
            </p>
            <p className="cardMeta">
              Asset Intensity: {benchmarkConfig?.assetIntensity ?? "Review Required"}
            </p>
            <p className="cardMeta">
              Regulatory Flag: {benchmarkConfig?.regulatoryFlag ?? "Review Required"}
            </p>
            <p className="cardMeta">
              Pull Keys (tblBenchmarkDataPullKeys):{" "}
              {pullKeys
                ? `${pullKeys.betaTableKey}, ${pullKeys.marginTableKey}, ${pullKeys.reinvestmentTableKey}`
                : "Mapping Required"}
            </p>
            <p className="cardMeta">
              No valuation math is derived from this section in this phase.
            </p>
            <p className="cardMeta">
              Stage/history/cyclicality fields are support context from exact v1.5 tables.
            </p>
            <p className="cardMeta">ISM-sector is display-only and not a primary driver input.</p>
            <p className="cardMeta">
              Configured benchmark universe count: {benchmarkUniverse.data.length}
            </p>
          </article>

          <BetaReferenceCard
            selectedBenchmark={selectedBenchmark}
            lookup={snapshotBetaState.lookup}
            readiness={snapshotBetaState.readiness}
          />
        </div>
      ) : null}

      {activeTab === "inputs" && inputsWorkspace ? (
        <CompanyManualInputsWorkspace
          key={`inputs-${cleanTicker}-${inputsWorkspace.persisted?.savedAt ?? "none"}`}
          model={buildManualInputsWorkspaceModel(inputsWorkspace.companyForInputs, {
            dataSource: source === "firestore" ? "firestore" : "mock",
            benchmarkUniverse: benchmarkUniverse.data.map((row) => row.damodaranIndustrialBenchmark),
            ismSectorDisplay: selectedIsmRow?.ismSectorDisplay ?? "Mapping Required",
            templateStatus: benchmarkConfig?.templateStatus ?? "Review Required",
            persistence: {
              hasPersistedOverrides: Boolean(inputsWorkspace.persisted),
              savedAt: inputsWorkspace.persisted?.savedAt ?? null,
              loadSource: inputsWorkspace.loadSource,
              wiringStatus: inputsWorkspace.persisted?.wiringStatus ?? "persistence_only",
            },
          })}
        />
      ) : null}

      {activeTab === "historical" ? (
        <div className="cardGrid">
          <article className="card">
            <h3 className="cardTitle">Historical Data</h3>
            <p className="cardMeta">
              Historical financial scaffold only — no valuation math is calculated on this tab.
            </p>
            <p className="cardMeta">
              Periods: {company.availableHistoricalPeriods.join(", ")}
            </p>
            <p className="cardMeta">
              LTM Revenue (m):{" "}
              {formatAmountMillions(company.historicalData.incomeStatement.revenue.LTM, {
                currency: company.currencies.reportingCurrency,
              })}
            </p>
            <p className="cardMeta">
              LTM FCF (m):{" "}
              {formatAmountMillions(company.historicalData.cashFlow.freeCashFlow.LTM, {
                currency: company.currencies.reportingCurrency,
              })}
            </p>
          </article>
        </div>
      ) : null}

      {activeTab === "forecast" ? (
        <div className="cardGrid">
          <article className="card">
            <h3 className="cardTitle">Forecast Data</h3>
            <p className="cardMeta">Forecast scaffold only — no full valuation chain on this tab.</p>
            <p className="cardMeta">
              Y+1 growth:{" "}
              {formatPercent(company.forecastData.baseCaseRevenueGrowthByPeriod.YEAR_PLUS_1)}
            </p>
            <p className="cardMeta">
              Y+3 margin:{" "}
              {formatPercent(company.forecastData.baseCaseOperatingMarginByPeriod.YEAR_PLUS_3)}
            </p>
            <p className="cardMeta">{company.forecastData.narrative}</p>
          </article>

          <ForecastFadeFoundationCard
            input={forecastFadeCard.input}
            result={forecastFadeCard.result}
          />
        </div>
      ) : null}

      {activeTab === "valuation" && foundationCards ? (
        <div className="cardGrid">
          <ValuationEnginesStatusCard />
          <BetaPolicyCard
            policy={foundationCards.betaPolicy}
            showMockCapitalNote={foundationCards.hasMockBetaPolicyInputs}
          />
          <WaccFoundationCard
            input={foundationCards.wacc.input}
            readiness={foundationCards.wacc.readiness}
            result={foundationCards.wacc.result}
            displayStatus={foundationCards.displayStatus.wacc}
            showMockScaffoldNote={foundationCards.hasMockWaccScaffoldInputs}
          />
          <ForecastFadeFoundationCard
            input={foundationCards.forecastFade.input}
            result={foundationCards.forecastFade.result}
          />
          <ReinvestmentFcffFoundationCard
            input={foundationCards.reinvestmentFcff.input}
            result={foundationCards.reinvestmentFcff.result}
            displayStatus={foundationCards.displayStatus.reinvestment}
          />
          <TerminalValueFoundationCard
            input={foundationCards.terminalValue.input}
            result={foundationCards.terminalValue.result}
            displayStatus={foundationCards.displayStatus.terminal}
          />
          <DcfPvFoundationCard
            input={foundationCards.dcfPv.input}
            result={foundationCards.dcfPv.result}
            displayStatus={foundationCards.displayStatus.dcf}
          />
          <EquityBridgeFoundationCard
            input={foundationCards.equityBridge.input}
            result={foundationCards.equityBridge.result}
            displayStatus={foundationCards.displayStatus.equity}
          />
          <IntrinsicValueFoundationCard
            input={foundationCards.intrinsicValue.input}
            result={foundationCards.intrinsicValue.result}
            displayStatus={foundationCards.displayStatus.intrinsic}
          />
          <MosDecisionFoundationCard
            input={foundationCards.mosDecision.input}
            result={foundationCards.mosDecision.result}
            displayStatus={foundationCards.displayStatus.mos}
          />
        </div>
      ) : null}

      {activeTab === "valuation" && !foundationCards ? (
        <div className="panel">
          <p className="cardMeta">
            Select a Damodaran Industrial Benchmark before Valuation Engines foundation can run.
          </p>
        </div>
      ) : null}

      {activeTab === "review" && foundationCards ? (
        <div className="cardGrid">
          <MosDecisionFoundationCard
            input={foundationCards.mosDecision.input}
            result={foundationCards.mosDecision.result}
            displayStatus={foundationCards.displayStatus.mos}
          />

          <article className="card">
            <h3 className="cardTitle">Dashboard Decision Integration (not connected)</h3>
            <p className="cardMeta">
              Dashboard Decision Integration is foundation-only — presentation mapping on Dashboard.
              Not an official investment decision.
            </p>
            <p className="cardMeta">No Buy/Sell/Hold logic is implemented in this phase.</p>
            <p className="cardMeta">
              Foundation outcome above is MOS foundation only (Above / Below Required MOS / N/A).
            </p>
            <p className="cardMeta">
              See Dashboard table for multi-company foundation presentation.
            </p>
          </article>

          <article className="card">
            <h3 className="cardTitle">Legacy mock status</h3>
            <p className="cardMeta">
              Legacy mock decision — not connected to foundation valuation:{" "}
              {company.valuationResult.decisionResult.decisionStatus}
            </p>
            <p className="cardMeta">
              Legacy mock review severity: {company.reviewSummary.worstSeverity}
            </p>
            <p className="cardMeta">
              Mock status note: {company.valuationResult.decisionResult.statusNote}
            </p>
          </article>

          <article className="card">
            <h3 className="cardTitle">Review flags / status notes</h3>
            <p className="cardMeta">
              Worst severity (legacy scaffold): {company.reviewSummary.worstSeverity}
            </p>
            <p className="cardMeta">{company.reviewSummary.note}</p>
            <p className="cardMeta">
              Contributing categories: {company.reviewSummary.contributingCategories.join(", ")}
            </p>
          </article>
        </div>
      ) : null}

      {activeTab === "review" && !foundationCards ? (
        <div className="panel">
          <p className="cardMeta">
            Select a Damodaran Industrial Benchmark before Review &amp; Decision foundation can run.
          </p>
        </div>
      ) : null}

      {activeTab === "notes" ? (
        <div className="cardGrid">
          <article className="card">
            <h3 className="cardTitle">Notes / Sources</h3>
            <p className="cardMeta">Phase 2 uses mock placeholders only.</p>
            <p className="cardMeta">
              Engine source notes on foundation cards remain collapsed by default on Valuation and
              Review tabs.
            </p>
          </article>

          <article className="card">
            <h3 className="cardTitle">Engine disclaimers</h3>
            <p className="cardMeta">
              Valuation foundation engines calculate foundation outputs only — not official Dashboard
              decisions.
            </p>
            <p className="cardMeta">
              MOS / Decision Foundation is not Buy/Sell/Hold. No gateway, hard gate, or shadow
              valuation.
            </p>
            <p className="cardMeta">ISM-sector is display-only across all workspace tabs.</p>
          </article>

          <article className="card">
            <h3 className="cardTitle">Technical notes</h3>
            <p className="cardMeta">
              Full technical source notes are shown on Valuation Engines and Review tabs (collapsed).
              Engine Docs contain formula and scope documentation.
            </p>
          </article>
        </div>
      ) : null}
    </section>
  );
}
