import type { ValuationDashboardSnapshotDocument } from "@/lib/types/dashboard-snapshot-firestore";
import { DASHBOARD_SNAPSHOT_SCHEMA_VERSION } from "@/lib/types/dashboard-snapshot-firestore";

export type DashboardTableRow = {
  cleanTicker: string;
  companyName: string;
  openCompanyUrl: string;
  damodaranIndustrialBenchmark: string;
  valuationCurrency: ValuationDashboardSnapshotDocument["valuationCurrency"];
  officialIntrinsicValuePerShare: number | null;
  currentSharePrice: number | null;
  priceCurrency: ValuationDashboardSnapshotDocument["valuationCurrency"];
  upsideDownsidePercent: number | null;
  marginOfSafetyPercent: number | null;
  requiredMosPercent: number | null;
  entryPrice: number | null;
  foundationDecisionOutcome: ValuationDashboardSnapshotDocument["foundationDecisionOutcome"];
  foundationReadinessStatus: ValuationDashboardSnapshotDocument["foundationReadinessStatus"];
  dashboardDecisionIntegrationStatus: ValuationDashboardSnapshotDocument["dashboardDecisionIntegrationStatus"];
  legacyMockDecisionStatus: string | null;
  calculatedAt: string | null;
  computeStatus: ValuationDashboardSnapshotDocument["computeStatus"] | null;
};

export function isPersistedValuationDashboardSnapshot(
  row: unknown,
): row is ValuationDashboardSnapshotDocument {
  if (!row || typeof row !== "object") return false;
  const candidate = row as ValuationDashboardSnapshotDocument;
  return (
    candidate.schemaVersion === DASHBOARD_SNAPSHOT_SCHEMA_VERSION &&
    typeof candidate.cleanTicker === "string" &&
    typeof candidate.companyName === "string"
  );
}

export function mapSnapshotToDashboardTableRow(
  snapshot: ValuationDashboardSnapshotDocument,
): DashboardTableRow {
  return {
    cleanTicker: snapshot.cleanTicker,
    companyName: snapshot.companyName,
    openCompanyUrl: snapshot.openCompanyUrl,
    damodaranIndustrialBenchmark: snapshot.damodaranIndustrialBenchmark,
    valuationCurrency: snapshot.valuationCurrency,
    officialIntrinsicValuePerShare: snapshot.officialIntrinsicValuePerShare,
    currentSharePrice: snapshot.currentSharePrice,
    priceCurrency: snapshot.priceCurrency,
    upsideDownsidePercent: snapshot.upsideDownsidePercent,
    marginOfSafetyPercent: snapshot.marginOfSafetyPercent,
    requiredMosPercent: snapshot.requiredMosPercent,
    entryPrice: snapshot.entryPrice,
    foundationDecisionOutcome: snapshot.foundationDecisionOutcome,
    foundationReadinessStatus: snapshot.foundationReadinessStatus,
    dashboardDecisionIntegrationStatus: snapshot.dashboardDecisionIntegrationStatus,
    legacyMockDecisionStatus: snapshot.legacyMockDecisionStatus,
    calculatedAt: snapshot.calculatedAt,
    computeStatus: snapshot.computeStatus,
  };
}

export function prepareDashboardTableRows(
  snapshots: ValuationDashboardSnapshotDocument[],
): DashboardTableRow[] {
  return snapshots
    .filter(isPersistedValuationDashboardSnapshot)
    .sort((a, b) => a.sortKey.localeCompare(b.sortKey))
    .map(mapSnapshotToDashboardTableRow);
}
