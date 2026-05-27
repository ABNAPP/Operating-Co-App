export const WORKSPACE_TABS = [
  { id: "snapshot", label: "Snapshot" },
  { id: "inputs", label: "Inputs" },
  { id: "historical", label: "Historical Data" },
  { id: "forecast", label: "Forecast Data" },
  { id: "valuation", label: "Valuation Engines" },
  { id: "review", label: "Review & Decision" },
  { id: "notes", label: "Notes / Sources" },
] as const;

export type WorkspaceTabId = (typeof WORKSPACE_TABS)[number]["id"];

const TAB_IDS = WORKSPACE_TABS.map((tab) => tab.id);

export function parseWorkspaceTab(tab: string | undefined): WorkspaceTabId {
  if (tab && TAB_IDS.includes(tab as WorkspaceTabId)) {
    return tab as WorkspaceTabId;
  }
  return "snapshot";
}

/** Full foundation bundle (WACC chain + MOS) — only Valuation and Review tabs. */
export function tabRequiresFoundationBundle(tab: WorkspaceTabId): boolean {
  return tab === "valuation" || tab === "review";
}

export function tabRequiresBetaPolicyOnly(tab: WorkspaceTabId): boolean {
  return tab === "snapshot";
}

export function tabRequiresForecastFadeOnly(tab: WorkspaceTabId): boolean {
  return tab === "forecast";
}

export function buildCompanyWorkspaceTabHref(
  cleanTicker: string,
  tabId: WorkspaceTabId,
  options?: { refresh?: boolean },
): string {
  const params = new URLSearchParams({ tab: tabId });
  if (options?.refresh) {
    params.set("refresh", "1");
  }
  return `/companies/${cleanTicker}?${params.toString()}`;
}
