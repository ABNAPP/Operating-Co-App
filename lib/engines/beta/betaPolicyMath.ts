import type {
  BetaLookupResult,
  BetaPolicyInput,
  BetaPolicyResult,
  BetaSelectionPolicy,
  CompanyBetaPolicyInputs,
} from "@/lib/types/beta-engine";

export function buildBetaPolicyInputFromReference(
  lookup: BetaLookupResult,
  capitalInputs: CompanyBetaPolicyInputs = {},
): BetaPolicyInput {
  const ref = lookup.betaReference;
  const tax = capitalInputs.selectedTaxRate ?? null;
  return {
    selectedBenchmark: lookup.selectedBenchmark,
    unleveredBeta: ref?.unleveredBeta ?? null,
    leveredBetaReference: ref?.leveredBeta ?? null,
    cashAdjustedBetaReference: ref?.cashAdjustedBeta ?? null,
    selectedBetaOverride: capitalInputs.selectedBetaOverride ?? null,
    useOverride: capitalInputs.useOverride ?? false,
    marketDebtToEquity: capitalInputs.marketDebtToEquity ?? null,
    bookDebtToEquity: capitalInputs.bookDebtToEquity ?? null,
    selectedDebtToEquity: capitalInputs.selectedDebtToEquity ?? null,
    taxRate: tax,
    selectedTaxRate: tax,
    cashAdjustmentPolicy: capitalInputs.cashAdjustmentPolicy ?? null,
    betaSelectionPolicy: capitalInputs.betaSelectionPolicy ?? "Use Damodaran Unlevered Beta + Relever",
  };
}

export const RELEVERING_FORMULA =
  "Relevered Beta = Unlevered Beta × (1 + (1 − taxRate) × DebtToEquity)";

export function isPlausibleBeta(value: number | null): value is number {
  return value !== null && Number.isFinite(value) && value >= 0.05 && value <= 5;
}

export function isPlausibleTaxRate(value: number | null): value is number {
  return value !== null && Number.isFinite(value) && value >= 0 && value <= 0.6;
}

export function isPlausibleDebtToEquity(value: number | null): value is number {
  return value !== null && Number.isFinite(value) && value >= 0 && value <= 20;
}

export function computeReleveredBeta(
  unleveredBeta: number,
  debtToEquity: number,
  taxRate: number,
): number {
  return unleveredBeta * (1 + (1 - taxRate) * debtToEquity);
}

function resolveDebtToEquity(input: BetaPolicyInput): number | null {
  if (isPlausibleDebtToEquity(input.selectedDebtToEquity)) {
    return input.selectedDebtToEquity;
  }
  if (isPlausibleDebtToEquity(input.marketDebtToEquity)) {
    return input.marketDebtToEquity;
  }
  if (isPlausibleDebtToEquity(input.bookDebtToEquity)) {
    return input.bookDebtToEquity;
  }
  return null;
}

function resolveTaxRate(input: BetaPolicyInput): number | null {
  if (isPlausibleTaxRate(input.selectedTaxRate)) {
    return input.selectedTaxRate;
  }
  if (isPlausibleTaxRate(input.taxRate)) {
    return input.taxRate;
  }
  return null;
}

function missingInputsResult(params: {
  selectedUnleveredBeta: number | null;
  leveredBetaReference: number | null;
  debtToEquity: number | null;
  taxRate: number | null;
  errors: string[];
  notes: string[];
}): BetaPolicyResult {
  return {
    selectedUnleveredBeta: params.selectedUnleveredBeta,
    selectedLeveredBeta: params.leveredBetaReference,
    selectedBeta: null,
    selectedBetaSource: "Review Required",
    selectedDebtToEquity: params.debtToEquity,
    selectedTaxRate: params.taxRate,
    releveringFormulaUsed: null,
    status: "Missing",
    warnings: ["Selected beta not final — company capital structure and tax inputs required."],
    errors: params.errors,
    notes: params.notes,
  };
}

export function computeBetaPolicy(input: BetaPolicyInput): BetaPolicyResult {
  const warnings: string[] = [];
  const errors: string[] = [];
  const notes: string[] = [];

  if (!input.selectedBenchmark.trim()) {
    return {
      selectedUnleveredBeta: null,
      selectedLeveredBeta: null,
      selectedBeta: null,
      selectedBetaSource: "Review Required",
      selectedDebtToEquity: null,
      selectedTaxRate: null,
      releveringFormulaUsed: null,
      status: "Not Applicable",
      warnings,
      errors: ["No Damodaran Industrial Benchmark selected."],
      notes: ["Select a benchmark before beta policy can run."],
    };
  }

  const selectedUnleveredBeta = isPlausibleBeta(input.unleveredBeta) ? input.unleveredBeta : null;
  const leveredBetaReference = isPlausibleBeta(input.leveredBetaReference)
    ? input.leveredBetaReference
    : null;
  const cashAdjustedBetaReference = isPlausibleBeta(input.cashAdjustedBetaReference)
    ? input.cashAdjustedBetaReference
    : null;

  if (!selectedUnleveredBeta && input.betaSelectionPolicy === "Use Damodaran Unlevered Beta + Relever") {
    errors.push("Damodaran unlevered beta reference is missing.");
  }

  const debtToEquity = resolveDebtToEquity(input);
  const taxRate = resolveTaxRate(input);

  if (input.useOverride && isPlausibleBeta(input.selectedBetaOverride)) {
    return {
      selectedUnleveredBeta,
      selectedLeveredBeta: null,
      selectedBeta: input.selectedBetaOverride,
      selectedBetaSource: "Manual Override",
      selectedDebtToEquity: debtToEquity,
      selectedTaxRate: taxRate,
      releveringFormulaUsed: null,
      status: "Review",
      warnings: ["Manual beta override is active — not an official WACC beta until reviewed."],
      errors,
      notes: ["Override bypasses relevering formula."],
    };
  }

  if (input.betaSelectionPolicy === "Use Damodaran Levered Beta Reference") {
    if (!leveredBetaReference) {
      return missingInputsResult({
        selectedUnleveredBeta,
        leveredBetaReference,
        debtToEquity,
        taxRate,
        errors: [...errors, "Damodaran levered beta reference is missing."],
        notes,
      });
    }
    return {
      selectedUnleveredBeta,
      selectedLeveredBeta: leveredBetaReference,
      selectedBeta: leveredBetaReference,
      selectedBetaSource: "Use Damodaran Levered Beta Reference",
      selectedDebtToEquity: debtToEquity,
      selectedTaxRate: taxRate,
      releveringFormulaUsed: null,
      status: "Review",
      warnings: [
        "Using industry levered beta reference only — not company-relevered beta.",
        "Selected beta not final — company capital structure and tax inputs required for relevering.",
      ],
      errors,
      notes,
    };
  }

  if (input.betaSelectionPolicy === "Use Cash-adjusted Beta Reference") {
    if (!cashAdjustedBetaReference) {
      return missingInputsResult({
        selectedUnleveredBeta,
        leveredBetaReference,
        debtToEquity,
        taxRate,
        errors: [...errors, "Cash-adjusted beta reference is missing."],
        notes,
      });
    }
    return {
      selectedUnleveredBeta,
      selectedLeveredBeta: null,
      selectedBeta: cashAdjustedBetaReference,
      selectedBetaSource: "Use Cash-adjusted Beta Reference",
      selectedDebtToEquity: debtToEquity,
      selectedTaxRate: taxRate,
      releveringFormulaUsed: null,
      status: "Review",
      warnings: ["Using cash-adjusted industry beta reference — not company-relevered beta."],
      errors,
      notes,
    };
  }

  if (input.betaSelectionPolicy === "Review Required") {
    return {
      selectedUnleveredBeta,
      selectedLeveredBeta: null,
      selectedBeta: null,
      selectedBetaSource: "Review Required",
      selectedDebtToEquity: debtToEquity,
      selectedTaxRate: taxRate,
      releveringFormulaUsed: null,
      status: "Review",
      warnings: ["Beta selection policy requires manual review."],
      errors,
      notes,
    };
  }

  const hasReleveringInputs =
    isPlausibleBeta(selectedUnleveredBeta) &&
    isPlausibleDebtToEquity(debtToEquity) &&
    isPlausibleTaxRate(taxRate);

  if (!hasReleveringInputs) {
    const missingParts: string[] = [];
    if (!selectedUnleveredBeta) {
      missingParts.push("unlevered beta reference");
    }
    if (!isPlausibleDebtToEquity(debtToEquity)) {
      missingParts.push("Debt/Equity");
    }
    if (!isPlausibleTaxRate(taxRate)) {
      missingParts.push("tax rate");
    }

    let selectedBeta: number | null = null;
    let selectedBetaSource: BetaSelectionPolicy | string = "Review Required";
    const policyWarnings = [
      "Selected beta not final — company capital structure and tax inputs required.",
    ];

    if (leveredBetaReference) {
      selectedBeta = leveredBetaReference;
      selectedBetaSource = "Use Damodaran Levered Beta Reference";
      notes.push("Showing industry levered beta reference until relevering inputs are provided.");
    }

    const status =
      !selectedUnleveredBeta && !leveredBetaReference ? "Missing" : "Review";

    return {
      selectedUnleveredBeta,
      selectedLeveredBeta: leveredBetaReference,
      selectedBeta,
      selectedBetaSource,
      selectedDebtToEquity: debtToEquity,
      selectedTaxRate: taxRate,
      releveringFormulaUsed: null,
      status,
      warnings: [...policyWarnings, `Missing: ${missingParts.join(", ")}.`],
      errors,
      notes,
    };
  }

  const selectedLeveredBeta = computeReleveredBeta(
    selectedUnleveredBeta,
    debtToEquity,
    taxRate,
  );

  return {
    selectedUnleveredBeta,
    selectedLeveredBeta,
    selectedBeta: selectedLeveredBeta,
    selectedBetaSource: "Use Damodaran Unlevered Beta + Relever",
    selectedDebtToEquity: debtToEquity,
    selectedTaxRate: taxRate,
    releveringFormulaUsed: RELEVERING_FORMULA,
    status: "Ready",
    warnings,
    errors,
    notes: ["Company relevered beta from Damodaran unlevered reference and stated D/E and tax."],
  };
}
