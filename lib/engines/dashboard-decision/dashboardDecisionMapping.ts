import type { CompanyFoundationBundle } from "@/lib/engines/company-foundation/companyFoundationTypes";
import type { CompanyDataModel } from "@/lib/types/company";
import type {
  DashboardDecisionIntegrationLayerStatus,
  DashboardDecisionIntegrationReadinessStatus,
  DashboardDecisionIntegrationResult,
  FoundationDecisionOutcomeDisplay,
} from "@/lib/types/dashboard-decision-engine";
import type { ReviewSeverity } from "@/lib/types/review-flags";

const READINESS_RANK: Record<DashboardDecisionIntegrationReadinessStatus, number> = {
  "Not Applicable": 0,
  Ready: 1,
  Review: 2,
  Missing: 3,
};

const REVIEW_SEVERITY_RANK: Record<ReviewSeverity, number> = {
  Info: 0,
  Watch: 1,
  "Review Required": 2,
  "Not Ready": 3,
  "Excluded / Special Review": 4,
};

function worstReadinessStatus(
  ...statuses: Array<string | null | undefined>
): DashboardDecisionIntegrationReadinessStatus {
  let worst: DashboardDecisionIntegrationReadinessStatus = "Not Applicable";

  for (const status of statuses) {
    if (!status) continue;
    const candidate = status as DashboardDecisionIntegrationReadinessStatus;
    if (!(candidate in READINESS_RANK)) continue;
    if (READINESS_RANK[candidate] >= READINESS_RANK[worst]) {
      worst = candidate;
    }
  }

  return worst;
}

function worseReviewSeverity(a: ReviewSeverity, b: ReviewSeverity): ReviewSeverity {
  return REVIEW_SEVERITY_RANK[a] >= REVIEW_SEVERITY_RANK[b] ? a : b;
}

function readinessToReviewSeverity(
  status: DashboardDecisionIntegrationReadinessStatus,
): ReviewSeverity {
  if (status === "Missing") return "Not Ready";
  if (status === "Review") return "Review Required";
  return "Info";
}

function resolveFoundationDecisionOutcome(
  outcome: FoundationDecisionOutcomeDisplay | null | undefined,
): FoundationDecisionOutcomeDisplay {
  if (outcome === "Above Required MOS" || outcome === "Below Required MOS") {
    return outcome;
  }
  return "N/A";
}

function dedupeStrings(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    const trimmed = value.trim();
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    out.push(trimmed);
  }
  return out;
}

/**
 * Maps a pre-computed company foundation bundle to Dashboard decision integration output.
 * Presentation/mapping only — no valuation math and no Buy/Sell/Hold.
 */
export function mapDashboardDecisionIntegrationFromFoundationBundle(
  company: CompanyDataModel,
  foundationBundle: CompanyFoundationBundle,
): DashboardDecisionIntegrationResult {
  const selectedBenchmark = company.identity.damodaranIndustrialBenchmark ?? "";
  const cleanTicker = company.identity.cleanTicker;
  const companyName = company.identity.companyName;
  const valuationCurrency = company.currencies.valuationCurrency ?? null;
  const legacyReviewSeverity = company.reviewSummary?.worstSeverity ?? "Info";

  const baseNotes = [
    "Dashboard decision integration maps foundation outputs only — not an official Buy/Sell/Hold decision.",
    "No gateway, hard gate, or shadow valuation in this phase.",
  ];

  if (!selectedBenchmark.trim()) {
    return {
      status: "Not Applicable",
      companyId: cleanTicker,
      cleanTicker,
      companyName,
      selectedBenchmark: "",
      valuationCurrency,
      intrinsicValuePerShare: null,
      currentPrice: null,
      priceCurrency: company.currencies.tradingCurrency ?? null,
      upsideDownsidePercent: null,
      marginOfSafetyPercent: null,
      requiredMosPercent: null,
      entryPrice: null,
      foundationDecisionOutcome: "N/A",
      reviewSeverity: legacyReviewSeverity,
      missingInputs: ["Damodaran Industrial Benchmark"],
      warnings: [],
      sourceNotes: [
        ...baseNotes,
        "Select a Damodaran Industrial Benchmark before dashboard decision integration mapping can run.",
      ],
      dashboardDecisionIntegrationStatus: "Not started",
      intrinsicFoundationStatus: null,
      mosFoundationStatus: null,
    };
  }

  const intrinsicBundle = foundationBundle.intrinsicValue;
  const mosBundle = foundationBundle.mosDecision;

  const intrinsicStatus = intrinsicBundle?.result.status ?? "Missing";
  const mosStatus = mosBundle?.result.status ?? "Missing";

  const status = worstReadinessStatus(intrinsicStatus, mosStatus);

  const mosInput = mosBundle?.input;
  const mosResult = mosBundle?.result;
  const intrinsicResult = intrinsicBundle?.result;

  const intrinsicValuePerShare =
    mosInput?.intrinsicValuePerShare ?? intrinsicResult?.intrinsicValuePerShare ?? null;
  const currentPrice = mosInput?.currentSharePrice ?? null;
  const priceCurrency = mosInput?.priceCurrency ?? company.currencies.tradingCurrency ?? null;

  const upsideDownsidePercent = mosResult?.upsideDownsidePercent ?? null;
  const marginOfSafetyPercent = mosResult?.marginOfSafetyPercent ?? null;
  const requiredMosPercent = mosInput?.requiredMOS ?? null;
  const entryPrice = mosResult?.entryPrice ?? null;
  const foundationDecisionOutcome = resolveFoundationDecisionOutcome(
    mosResult?.decisionOutcome ?? null,
  );

  const missingInputs = dedupeStrings([
    ...(intrinsicBundle?.result.missingInputs ?? []),
    ...(mosResult?.missingInputs ?? []),
  ]);

  const warnings = dedupeStrings([
    ...(intrinsicBundle?.result.warnings ?? []),
    ...(mosResult?.warnings ?? []),
  ]);

  const sourceNotes = dedupeStrings([
    ...baseNotes,
    ...(intrinsicBundle?.input.sourceNotes ?? []),
    ...(intrinsicBundle?.result.notes ?? []),
    ...(mosInput?.sourceNotes ?? []),
    ...(mosResult?.notes ?? []),
  ]);

  const foundationSeverity = readinessToReviewSeverity(status);
  const reviewSeverity = worseReviewSeverity(legacyReviewSeverity, foundationSeverity);

  const dashboardDecisionIntegrationStatus: DashboardDecisionIntegrationLayerStatus =
    status === "Not Applicable" ? "Not started" : "Foundation";

  return {
    status,
    companyId: cleanTicker,
    cleanTicker,
    companyName,
    selectedBenchmark,
    valuationCurrency:
      mosInput?.intrinsicValueCurrency ??
      intrinsicResult?.valuationCurrency ??
      valuationCurrency,
    intrinsicValuePerShare,
    currentPrice,
    priceCurrency,
    upsideDownsidePercent,
    marginOfSafetyPercent,
    requiredMosPercent,
    entryPrice,
    foundationDecisionOutcome,
    reviewSeverity,
    missingInputs,
    warnings,
    sourceNotes,
    dashboardDecisionIntegrationStatus,
    intrinsicFoundationStatus: intrinsicStatus,
    mosFoundationStatus: mosStatus,
  };
}
