import type {
  ReinvestmentFcffInput,
  ReinvestmentFcffResult,
  ReinvestmentMethodLabel,
  ReinvestmentFcffReadinessStatus,
  ReinvestmentMethodComparison,
} from "@/lib/types/reinvestment-fcff-engine";

const METHOD_DIRECT: ReinvestmentMethodLabel = "Direct Method";
const METHOD_SALES_TO_CAPITAL: ReinvestmentMethodLabel = "Sales-to-Capital Method";
const METHOD_STABLE: ReinvestmentMethodLabel = "Stable Method";
const METHOD_MISSING_REVIEW: ReinvestmentMethodLabel = "Missing / Review";

function isFiniteNumber(value: number | null | undefined): value is number {
  return value !== null && value !== undefined && Number.isFinite(value);
}

function buildMethodComparison(params: {
  directAvailable: boolean;
  directReinvestment: number | null;
  salesToCapitalAvailable: boolean;
  salesToCapitalReinvestment: number | null;
  chosenMethod: ReinvestmentMethodLabel | null;
  comparisonNote: string | null;
}): ReinvestmentMethodComparison {
  return {
    directAvailable: params.directAvailable,
    directReinvestment: params.directReinvestment,
    salesToCapitalAvailable: params.salesToCapitalAvailable,
    salesToCapitalReinvestment: params.salesToCapitalReinvestment,
    chosenMethod: params.chosenMethod,
    comparisonNote: params.comparisonNote,
  };
}

function includesCyclicalOrHighKeyword(sourceNotes: string[]): boolean {
  return sourceNotes.some((note) =>
    /(cyclical|commodity|high asset intensity|high capital intensity)/i.test(note),
  );
}

function computeNopat(input: ReinvestmentFcffInput): {
  nopat: number | null;
  missingInputs: string[];
} {
  const missingInputs: string[] = [];
  if (!isFiniteNumber(input.ebit)) missingInputs.push("EBIT");
  if (!isFiniteNumber(input.taxRate)) missingInputs.push("tax rate");

  if (missingInputs.length > 0) {
    return { nopat: null, missingInputs };
  }

  return { nopat: input.ebit! * (1 - input.taxRate!), missingInputs: [] };
}

function computeDirectReinvestment(input: ReinvestmentFcffInput): {
  reinvestment: number | null;
  available: boolean;
  missingInputs: string[];
} {
  const missingInputs: string[] = [];
  if (!isFiniteNumber(input.capex)) missingInputs.push("CapEx");
  if (!isFiniteNumber(input.depreciationAmortization))
    missingInputs.push("depreciation & amortization");
  if (!isFiniteNumber(input.changeInNonCashWorkingCapital))
    missingInputs.push("change in non-cash working capital");

  const available = missingInputs.length === 0;
  return {
    reinvestment: available
      ? input.capex! - input.depreciationAmortization! + input.changeInNonCashWorkingCapital!
      : null,
    available,
    missingInputs,
  };
}

function computeSalesToCapitalReinvestment(input: ReinvestmentFcffInput): {
  reinvestment: number | null;
  available: boolean;
  missingInputs: string[];
} {
  const missingInputs: string[] = [];
  if (!isFiniteNumber(input.revenue)) missingInputs.push("revenue");
  if (!isFiniteNumber(input.priorRevenue)) missingInputs.push("prior revenue");
  if (!isFiniteNumber(input.salesToCapital)) missingInputs.push("sales-to-capital");

  if (missingInputs.length > 0) {
    return { reinvestment: null, available: false, missingInputs };
  }

  if (input.salesToCapital === 0) {
    return {
      reinvestment: null,
      available: false,
      missingInputs: ["sales-to-capital cannot be 0"],
    };
  }

  return {
    reinvestment: (input.revenue! - input.priorRevenue!) / input.salesToCapital!,
    available: true,
    missingInputs: [],
  };
}

function chooseMethod(params: {
  methodOverride: ReinvestmentMethodLabel | null;
  directAvailable: boolean;
  salesToCapitalAvailable: boolean;
}): { chosenMethod: ReinvestmentMethodLabel | null; chosenWarning: string | null } {
  const { methodOverride, directAvailable, salesToCapitalAvailable } = params;

  if (methodOverride) {
    if (methodOverride === METHOD_DIRECT) {
      return {
        chosenMethod: directAvailable ? METHOD_DIRECT : METHOD_MISSING_REVIEW,
        chosenWarning: directAvailable
          ? null
          : "Method override requested Direct Method but Direct inputs are incomplete.",
      };
    }
    if (methodOverride === METHOD_SALES_TO_CAPITAL) {
      return {
        chosenMethod: salesToCapitalAvailable ? METHOD_SALES_TO_CAPITAL : METHOD_MISSING_REVIEW,
        chosenWarning: salesToCapitalAvailable
          ? null
          : "Method override requested Sales-to-Capital Method but Sales-to-Capital inputs are incomplete.",
      };
    }
    if (methodOverride === METHOD_STABLE) {
      return {
        chosenMethod: METHOD_STABLE,
        chosenWarning:
          "Stable Method is a placeholder in this phase; it must not be used to invent terminal-state logic.",
      };
    }
    if (methodOverride === METHOD_MISSING_REVIEW) {
      return { chosenMethod: METHOD_MISSING_REVIEW, chosenWarning: null };
    }
  }

  // Selection rules (foundation): prefer Direct when possible.
  if (directAvailable) {
    return { chosenMethod: METHOD_DIRECT, chosenWarning: null };
  }
  if (salesToCapitalAvailable) {
    return { chosenMethod: METHOD_SALES_TO_CAPITAL, chosenWarning: null };
  }

  return { chosenMethod: METHOD_MISSING_REVIEW, chosenWarning: null };
}

function buildStatus(params: {
  nopatMissingInputs: string[];
  reinvestmentAvailable: boolean;
  anyReinvestmentInputsPresent: boolean;
  sourceNotes: string[];
}): ReinvestmentFcffReadinessStatus {
  const { nopatMissingInputs, reinvestmentAvailable, anyReinvestmentInputsPresent, sourceNotes } =
    params;

  if (nopatMissingInputs.length > 0) return "Missing";
  if (!reinvestmentAvailable) {
    // If we have some partial reinvestment inputs but cannot compute FCFF, use Review.
    return anyReinvestmentInputsPresent ? "Review" : "Missing";
  }

  const cyclicalReview = includesCyclicalOrHighKeyword(sourceNotes);
  return cyclicalReview ? "Review" : "Ready";
}

export function computeReinvestmentFcffFromInput(input: ReinvestmentFcffInput): ReinvestmentFcffResult {
  if (!input.selectedBenchmark.trim()) {
    return {
      nopat: null,
      selectedReinvestmentMethod: null,
      reinvestment: null,
      fcff: null,
      status: "Not Applicable",
      missingInputs: [],
      warnings: [],
      notes: [...input.sourceNotes],
      methodComparison: buildMethodComparison({
        directAvailable: false,
        directReinvestment: null,
        salesToCapitalAvailable: false,
        salesToCapitalReinvestment: null,
        chosenMethod: null,
        comparisonNote: null,
      }),
    };
  }

  const notes = [...input.sourceNotes];
  const warnings: string[] = [];
  const missingInputs: string[] = [];

  const nopatCalc = computeNopat(input);
  missingInputs.push(...nopatCalc.missingInputs);

  const directCalc = computeDirectReinvestment(input);
  const salesCalc = computeSalesToCapitalReinvestment(input);

  const anyReinvestmentInputsPresent =
    isFiniteNumber(input.capex) ||
    isFiniteNumber(input.depreciationAmortization) ||
    isFiniteNumber(input.changeInNonCashWorkingCapital) ||
    isFiniteNumber(input.salesToCapital) ||
    isFiniteNumber(input.revenue) ||
    isFiniteNumber(input.priorRevenue);

  const chosen = chooseMethod({
    methodOverride: input.methodOverride,
    directAvailable: directCalc.available,
    salesToCapitalAvailable: salesCalc.available,
  });

  if (chosen.chosenWarning) warnings.push(chosen.chosenWarning);

  let selectedReinvestmentMethod: ReinvestmentMethodLabel | null = chosen.chosenMethod;
  let reinvestment: number | null = null;

  if (chosen.chosenMethod === METHOD_DIRECT) {
    reinvestment = directCalc.reinvestment;
  } else if (chosen.chosenMethod === METHOD_SALES_TO_CAPITAL) {
    reinvestment = salesCalc.reinvestment;
  } else if (chosen.chosenMethod === METHOD_STABLE) {
    reinvestment = null;
    warnings.push("Stable Method is not implemented for foundation FCFF outputs yet.");
    selectedReinvestmentMethod = METHOD_STABLE;
  } else {
    reinvestment = null;
    selectedReinvestmentMethod = METHOD_MISSING_REVIEW;
  }

  // If both methods are available but we chose Direct (foundation preference),
  // include a comparison note.
  let comparisonNote: string | null = null;
  if (directCalc.available && salesCalc.available && chosen.chosenMethod === METHOD_DIRECT) {
    comparisonNote = "Sales-to-Capital Method was also available; Direct Method was chosen for this foundation output.";
    warnings.push(comparisonNote);
  }

  const methodComparison = buildMethodComparison({
    directAvailable: directCalc.available,
    directReinvestment: directCalc.reinvestment,
    salesToCapitalAvailable: salesCalc.available,
    salesToCapitalReinvestment: salesCalc.reinvestment,
    chosenMethod: selectedReinvestmentMethod,
    comparisonNote,
  });

  // Missing reinvestment inputs should not invent FCFF.
  if (isFiniteNumber(nopatCalc.nopat) && reinvestment === null) {
    // When NOPAT is present but reinvestment is not computable.
    if (directCalc.missingInputs.length > 0) {
      missingInputs.push(
        ...directCalc.missingInputs.map((x) => `reinvestment: ${x}`),
      );
    }
    if (salesCalc.missingInputs.length > 0) {
      missingInputs.push(
        ...salesCalc.missingInputs.map((x) => `reinvestment (sales-to-capital): ${x}`),
      );
    }
  }

  const nopat = nopatCalc.nopat;
  const fcff = nopat !== null && reinvestment !== null ? nopat - reinvestment : null;

  const status = buildStatus({
    nopatMissingInputs: nopatCalc.missingInputs,
    reinvestmentAvailable: reinvestment !== null,
    anyReinvestmentInputsPresent,
    sourceNotes: input.sourceNotes,
  });

  const cyclicalReview = includesCyclicalOrHighKeyword(input.sourceNotes);
  if (cyclicalReview) {
    warnings.push("Cyclical / high-asset benchmark context suggests Review for reinvestment/FCFF structure.");
  }

  return {
    nopat,
    selectedReinvestmentMethod,
    reinvestment,
    fcff,
    status,
    missingInputs: [...new Set(missingInputs)],
    warnings,
    notes,
    methodComparison,
  };
}

