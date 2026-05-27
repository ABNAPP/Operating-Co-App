import { foundationStatusBadgeClass } from "@/lib/utils/foundation-status-display";

interface FoundationStatusBadgeProps {
  displayStatus: string;
}

export function FoundationStatusBadge({ displayStatus }: FoundationStatusBadgeProps) {
  return <span className={foundationStatusBadgeClass(displayStatus)}>{displayStatus}</span>;
}
