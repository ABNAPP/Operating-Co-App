import type {
  MosDecisionInput,
  MosDecisionOutcome,
  MosDecisionReadinessStatus,
  MosDecisionResult,
} from "@/lib/types/mos-decision-engine";

function isFiniteNumber(value: number | null | undefined): value is number {
  return value !== null && value !== undefined && Number.isFinite(value);
}

function includesCyclicalOrHighKeyword(sourceNotes: string[]): boolean {
  return sourceNotes.some((note) =>
    /(cyclical|commodity|high asset intensity|high capital intensity)/i.test(note),
  );
}

function resolveCurrentSharePriceForMath(input: MosDecisionInput): {
  currentSharePriceForMath: number | null;
  warnings: string[];
} {
  const warnings: string[] = [];

  if (!isFiniteNumber(input.currentSharePrice)) {
    return { currentSharePriceForMath: null, warnings };
  }

  // Normalize current share price into the valuation currency for MOS math if needed.
  if (
    input.intrinsicValueCurrency &&
    input.priceCurrency &&
    input.priceCurrency !== input.intrinsicValueCurrency
  ) {
    if (!isFiniteNumber(input.fxRateToValuationCurrency)) {
      warnings.push(
        "Current share price currency differs from valuation currency but fxRateToValuationCurrency is missing; MOS math is blocked.",
      );
      return { currentSharePriceForMath: null, warnings };
    }
    warnings.push(
      "Current share price was converted into valuation currency for MOS math using fxRateToValuationCurrency.",
    );
    return {
      currentSharePriceForMath: input.currentSharePrice * input.fxRateToValuationCurrency,
      warnings,
    };
  }

  return { currentSharePriceForMath: input.currentSharePrice, warnings };
}

function decideOutcome(
  marginOfSafetyPercent: number,
  requiredMOS: number,
): MosDecisionOutcome {
  if (marginOfSafetyPercent >= requiredMOS) return "Above Required MOS";
  return "Below Required MOS";
}

export function computeMosDecisionFromInput(input: MosDecisionInput): MosDecisionResult {
  const notes: string[] = [...input.sourceNotes];
  const warnings: string[] = [];
  const missingInputs: string[] = [];

  if (!input.selectedBenchmark.trim()) {
    return {
      upsideDownsidePercent: null,
      marginOfSafetyPercent: null,
      entryPrice: null,
      decisionOutcome: null,
      status: "Not Applicable",
      missingInputs: [],
      warnings: [],
      notes,
    };
  }

  if (!isFiniteNumber(input.intrinsicValuePerShare)) {
    missingInputs.push("Intrinsic Value / Share");
    return {
      upsideDownsidePercent: null,
      marginOfSafetyPercent: null,
      entryPrice: null,
      decisionOutcome: null,
      status: "Missing",
      missingInputs,
      warnings,
      notes,
    };
  }

  const cyclicalReview = includesCyclicalOrHighKeyword(input.sourceNotes);

  if (!isFiniteNumber(input.currentSharePrice)) {
    missingInputs.push("Current share price");
    return {
      upsideDownsidePercent: null,
      marginOfSafetyPercent: null,
      entryPrice: null,
      decisionOutcome: null,
      status: "Missing",
      missingInputs,
      warnings,
      notes,
    };
  }

  if (input.currentSharePrice! <= 0) {
    warnings.push("Current share price must be > 0 for MOS math.");
    return {
      upsideDownsidePercent: null,
      marginOfSafetyPercent: null,
      entryPrice: null,
      decisionOutcome: null,
      status: "Review",
      missingInputs: [],
      warnings,
      notes,
    };
  }

  const { currentSharePriceForMath, warnings: conversionWarnings } =
    resolveCurrentSharePriceForMath(input);
  warnings.push(...conversionWarnings);

  if (!isFiniteNumber(currentSharePriceForMath)) {
    return {
      upsideDownsidePercent: null,
      marginOfSafetyPercent: null,
      entryPrice: null,
      decisionOutcome: null,
      status: input.intrinsicStatus === "Review" || cyclicalReview ? "Review" : "Missing",
      missingInputs: [],
      warnings,
      notes,
    };
  }

  const upsideDownsidePercent =
    (input.intrinsicValuePerShare - currentSharePriceForMath) / currentSharePriceForMath;
  const marginOfSafetyPercent = upsideDownsidePercent;

  const requiredMOSIsFinite = isFiniteNumber(input.requiredMOS);
  if (!requiredMOSIsFinite) {
    missingInputs.push("Required MOS");
  }

  const statusBase: MosDecisionReadinessStatus =
    input.intrinsicStatus === "Missing" || input.intrinsicStatus === null
      ? "Missing"
      : input.intrinsicStatus === "Review"
        ? "Review"
        : cyclicalReview
          ? "Review"
          : "Ready";

  const status: MosDecisionReadinessStatus = requiredMOSIsFinite ? statusBase : "Review";

  let entryPrice: number | null = null;
  let decisionOutcome: MosDecisionOutcome | null = null;
  if (requiredMOSIsFinite) {
    entryPrice = input.intrinsicValuePerShare * (1 - input.requiredMOS!);
    decisionOutcome = decideOutcome(marginOfSafetyPercent, input.requiredMOS!);
  }

  notes.push(
    "MOS / Decision Layer foundation uses Intrinsic Value / Share and required MOS scaffold only — no MOS-to-dashboard wiring in this phase.",
  );

  return {
    upsideDownsidePercent,
    marginOfSafetyPercent,
    entryPrice,
    decisionOutcome,
    status,
    missingInputs: [...new Set(missingInputs)],
    warnings: [...new Set(warnings)],
    notes,
  };
}

