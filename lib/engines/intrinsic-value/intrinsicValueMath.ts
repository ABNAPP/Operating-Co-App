import type {
  IntrinsicValueInput,
  IntrinsicValueReadinessStatus,
  IntrinsicValueResult,
  ShareCountUnit,
} from "@/lib/types/intrinsic-value-engine";

function isFiniteNumber(value: number | null | undefined): value is number {
  return value !== null && value !== undefined && Number.isFinite(value);
}

function isValidShareUnit(unit: string | null | undefined): unit is ShareCountUnit {
  return unit === "millions" || unit === "absolute";
}

function includesCyclicalOrHighKeyword(sourceNotes: string[]): boolean {
  return sourceNotes.some((note) =>
    /(cyclical|commodity|high asset intensity|high capital intensity)/i.test(note),
  );
}

export function computeIntrinsicValuePerShare(
  equityValue: number,
  selectedDilutedShares: number,
  shareUnit: ShareCountUnit,
): number {
  if (shareUnit === "millions") {
    return equityValue / selectedDilutedShares;
  }
  return (equityValue * 1_000_000) / selectedDilutedShares;
}

export function computeIntrinsicValueFromInput(input: IntrinsicValueInput): IntrinsicValueResult {
  const notes: string[] = [...input.sourceNotes];
  const warnings: string[] = [];
  const missingInputs: string[] = [];

  const baseResult = {
    intrinsicValuePerShare: null as number | null,
    valuationCurrency: input.equityValueCurrency,
    selectedDilutedShares: input.selectedDilutedShares,
    shareUnit: isValidShareUnit(input.shareUnit) ? input.shareUnit : null,
    selectedSharesSource: input.selectedSharesSource,
    missingInputs,
    warnings,
    notes,
  };

  if (!input.selectedBenchmark.trim()) {
    return { ...baseResult, status: "Not Applicable" };
  }

  if (!isFiniteNumber(input.equityValue)) {
    missingInputs.push("Equity Value");
    return { ...baseResult, status: "Missing" };
  }

  if (!isValidShareUnit(input.shareUnit)) {
    missingInputs.push("Share unit (millions | absolute)");
    warnings.push(
      "Share unit must be explicitly set to millions or absolute — silent unit guessing is not allowed.",
    );
    return { ...baseResult, status: "Missing" };
  }

  if (!isFiniteNumber(input.selectedDilutedShares)) {
    missingInputs.push("Selected diluted shares");
    return { ...baseResult, status: "Missing" };
  }

  if (input.selectedDilutedShares <= 0) {
    missingInputs.push("Selected diluted shares (> 0)");
    warnings.push("Selected diluted shares must be greater than zero.");
    return { ...baseResult, status: "Review" };
  }

  if (!input.selectedSharesSource?.trim()) {
    missingInputs.push("Selected shares source");
    warnings.push("Selected diluted shares source must be documented.");
    return { ...baseResult, status: "Review" };
  }

  const intrinsicValuePerShare = computeIntrinsicValuePerShare(
    input.equityValue,
    input.selectedDilutedShares,
    input.shareUnit,
  );

  const cyclicalReview = includesCyclicalOrHighKeyword(input.sourceNotes);
  if (cyclicalReview) {
    notes.push(
      "Cyclical / high asset-intensity review context applies — intrinsic value per share remains foundation-only and flagged for review.",
    );
  }

  const status: IntrinsicValueReadinessStatus = cyclicalReview ? "Review" : "Ready";

  if (!Number.isFinite(intrinsicValuePerShare)) {
    warnings.push("Intrinsic Value / Share calculation produced a non-finite result — returning Review.");
    return {
      ...baseResult,
      intrinsicValuePerShare: null,
      status: "Review",
    };
  }

  notes.push(
    input.shareUnit === "millions"
      ? "Intrinsic Value / Share = Equity Value (m) ÷ Selected Diluted Shares (m)."
      : "Intrinsic Value / Share = Equity Value (m) × 1,000,000 ÷ Selected Diluted Shares (absolute).",
  );

  return {
    intrinsicValuePerShare,
    valuationCurrency: input.equityValueCurrency,
    selectedDilutedShares: input.selectedDilutedShares,
    shareUnit: input.shareUnit,
    selectedSharesSource: input.selectedSharesSource,
    status,
    missingInputs,
    warnings: [...new Set(warnings)],
    notes,
  };
}
