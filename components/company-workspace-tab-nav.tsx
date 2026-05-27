import Link from "next/link";
import {
  WORKSPACE_TABS,
  buildCompanyWorkspaceTabHref,
  type WorkspaceTabId,
} from "@/lib/company-workspace/workspaceTabs";

interface CompanyWorkspaceTabNavProps {
  cleanTicker: string;
  activeTab: WorkspaceTabId;
  refresh?: boolean;
}

export function CompanyWorkspaceTabNav({
  cleanTicker,
  activeTab,
  refresh,
}: CompanyWorkspaceTabNavProps) {
  return (
    <nav className="tabsRow" aria-label="Workspace sections">
      {WORKSPACE_TABS.map((tab) => {
        const isActive = tab.id === activeTab;
        return (
          <Link
            key={tab.id}
            href={buildCompanyWorkspaceTabHref(cleanTicker, tab.id, { refresh })}
            className={isActive ? "tabPill tabPillActive" : "tabPill"}
            aria-current={isActive ? "page" : undefined}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
