/**
 * UI display helpers only — do not use in engine math, raw status persistence,
 * MOS/decision logic, or Dashboard decision wiring.
 */
export type FoundationReadinessStatus =
  | "Ready"
  | "Review"
  | "Missing"
  | "Not Applicable"
  | string;

/** Presentation-only: downstream Ready + upstream Review/Missing → Review — computed */
export function resolveFoundationDisplayStatus(
  localStatus: string,
  upstreamStatuses: Array<string | null | undefined>,
): string {
  if (localStatus !== "Ready") {
    return localStatus;
  }

  const hasUpstreamReview = upstreamStatuses.some((status) => status === "Review");
  const hasUpstreamMissing = upstreamStatuses.some((status) => status === "Missing");

  if (hasUpstreamReview || hasUpstreamMissing) {
    return "Review — computed";
  }

  return localStatus;
}

export function foundationStatusBadgeClass(displayStatus: string): string {
  if (displayStatus === "Ready") {
    return "badge badgeGreen";
  }
  if (displayStatus === "Review" || displayStatus.startsWith("Review")) {
    return "badge badgeYellow";
  }
  if (displayStatus === "Not Applicable") {
    return "badge badgeBlue";
  }
  return "badge badgeRed";
}
