import type {
  EquityBridgeInput,
  EquityBridgeReadinessStatus,
  EquityBridgeResult,
} from "@/lib/types/equity-bridge-engine";

function isFiniteNumber(value: number | null | undefined): value is number {
  return value !== null && value !== undefined && Number.isFinite(value);
}

function includesCyclicalOrHighKeyword(sourceNotes: string[]): boolean {
  return sourceNotes.some((note) =>
    /(cyclical|commodity|high asset intensity|high capital intensity)/i.test(note),
  );
}

function resolveOptionalClaim(
  value: number | null | undefined,
  label: string,
  defaultedToZeroNotes: string[],
): { value: number; wasDefaulted: boolean } {
  if (isFiniteNumber(value)) {
    return { value, wasDefaulted: false };
  }
  defaultedToZeroNotes.push(`${label} defaulting to 0 when not explicitly provided (foundation scaffold).`);
  return { value: 0, wasDefaulted: true };
}

export function computeEquityBridgeFromInput(input: EquityBridgeInput): EquityBridgeResult {
  const notes: string[] = [...input.sourceNotes];
  const warnings: string[] = [];
  const missingInputs: string[] = [];

  if (!input.selectedBenchmark.trim()) {
    return {
      valueOfOperatingAssets: input.valueOfOperatingAssets,
      totalAdditions: null,
      totalDeductions: null,
      equityValue: null,
      status: "Not Applicable",
      missingInputs: [],
      warnings: [],
      notes,
    };
  }

  if (!isFiniteNumber(input.valueOfOperatingAssets)) {
    missingInputs.push("Value of Operating Assets");
    return {
      valueOfOperatingAssets: null,
      totalAdditions: null,
      totalDeductions: null,
      equityValue: null,
      status: "Missing",
      missingInputs,
      warnings,
      notes,
    };
  }

  const majorMissing: string[] = [];
  if (!isFiniteNumber(input.cashAndCashEquivalents)) {
    majorMissing.push("Cash & Cash Equivalents");
  }
  if (!isFiniteNumber(input.totalDebt)) {
    majorMissing.push("Total Debt");
  }

  if (majorMissing.length > 0) {
    missingInputs.push(...majorMissing);
    return {
      valueOfOperatingAssets: input.valueOfOperatingAssets,
      totalAdditions: null,
      totalDeductions: null,
      equityValue: null,
      status: majorMissing.length >= 2 ? "Missing" : "Review",
      missingInputs,
      warnings,
      notes,
    };
  }

  const defaultedToZeroNotes: string[] = [];
  const nonOperating = resolveOptionalClaim(
    input.nonOperatingAssets,
    "Non-Operating Assets",
    defaultedToZeroNotes,
  );
  const preferred = resolveOptionalClaim(input.preferredEquity, "Preferred Equity", defaultedToZeroNotes);
  const minority = resolveOptionalClaim(input.minorityInterest, "Minority Interest", defaultedToZeroNotes);
  const otherClaims = resolveOptionalClaim(
    input.otherNonEquityClaims,
    "Other Non-Equity Claims",
    defaultedToZeroNotes,
  );

  notes.push(...defaultedToZeroNotes);
  if (defaultedToZeroNotes.length > 0) {
    warnings.push(
      "Optional bridge claims defaulted to zero per foundation scaffold policy — not live company data.",
    );
  }

  const cash = input.cashAndCashEquivalents!;
  const totalDebt = input.totalDebt!;

  const totalAdditions = cash + nonOperating.value;
  const totalDeductions = totalDebt + preferred.value + minority.value + otherClaims.value;

  const equityValue = input.valueOfOperatingAssets + totalAdditions - totalDeductions;

  const cyclicalReview = includesCyclicalOrHighKeyword(input.sourceNotes);
  if (cyclicalReview) {
    notes.push(
      "Cyclical / high asset-intensity review context applies — equity bridge output remains foundation-only and flagged for review.",
    );
  }

  let status: EquityBridgeReadinessStatus = cyclicalReview ? "Review" : "Ready";

  if (!Number.isFinite(equityValue)) {
    warnings.push("Equity Value calculation produced a non-finite result — returning Review.");
    status = "Review";
  }

  return {
    valueOfOperatingAssets: input.valueOfOperatingAssets,
    totalAdditions,
    totalDeductions,
    equityValue,
    status,
    missingInputs,
    warnings: [...new Set(warnings)],
    notes,
  };
}
