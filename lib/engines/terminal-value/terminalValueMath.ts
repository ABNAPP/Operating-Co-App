import type {
  TerminalValueInput,
  TerminalValueMethod,
  TerminalValueReadinessStatus,
  TerminalValueResult,
} from "@/lib/types/terminal-value-engine";

const METHOD_GORDON: TerminalValueMethod = "Gordon Growth";

function isFiniteNumber(value: number | null | undefined): value is number {
  return value !== null && value !== undefined && Number.isFinite(value);
}

function includesCyclicalOrHighKeyword(sourceNotes: string[]): boolean {
  return sourceNotes.some((note) =>
    /(cyclical|commodity|high asset intensity|high capital intensity)/i.test(note),
  );
}

function severity(status: TerminalValueReadinessStatus | string): number {
  // Bigger number => worse
  if (status === "Missing") return 2;
  if (status === "Review") return 1;
  if (status === "Ready") return 0;
  return -1; // Not Applicable or unknown
}

function worstOf(...statuses: Array<TerminalValueReadinessStatus | string>): number {
  return Math.max(...statuses.map(severity));
}

function buildStatusFromInputs(params: {
  missingInputs: string[];
  warnings: string[];
  notes: string[];
  methodNotImplemented: boolean;
  cyclicalReview: boolean;
  spreadInvalid: boolean;
  finalFcffNegative: boolean;
  foundationWorstSeverity: number;
}): TerminalValueReadinessStatus {
  const {
    missingInputs,
    methodNotImplemented,
    cyclicalReview,
    spreadInvalid,
    finalFcffNegative,
    foundationWorstSeverity,
  } = params;

  if (missingInputs.length > 0) return "Missing";
  if (spreadInvalid) return foundationWorstSeverity === 2 ? "Missing" : "Review";
  if (finalFcffNegative) return "Review";
  if (methodNotImplemented || cyclicalReview) return "Review";
  if (foundationWorstSeverity === 2) return "Missing";
  if (foundationWorstSeverity === 1) return "Review";
  return "Ready";
}

export function computeTerminalValueFromInput(input: TerminalValueInput): TerminalValueResult {
  const notes = [...input.sourceNotes];
  const warnings: string[] = [];
  const missingInputs: string[] = [];

  if (!input.selectedBenchmark.trim()) {
    return {
      terminalFcff: null,
      terminalValue: null,
      terminalMethodUsed: null,
      terminalSpread: null,
      status: "Not Applicable",
      missingInputs: [],
      warnings: [],
      notes: [...input.sourceNotes],
    };
  }

  if (!isFiniteNumber(input.finalForecastFcff)) missingInputs.push("Final forecast FCFF");
  if (!isFiniteNumber(input.stableWacc)) missingInputs.push("Stable WACC");
  if (!isFiniteNumber(input.stableGrowthRate)) missingInputs.push("Stable growth rate");

  const cyclicalReview = includesCyclicalOrHighKeyword(input.sourceNotes);
  const foundationWorstSeverity = worstOf(input.forecastFadeStatus, input.waccStatus, input.fcffStatus);

  // No invented terminal chain math when required inputs are missing.
  if (missingInputs.length > 0) {
    return {
      terminalFcff: null,
      terminalValue: null,
      terminalMethodUsed: null,
      terminalSpread: null,
      status: "Missing",
      missingInputs,
      warnings,
      notes,
    };
  }

  const terminalMethodRequested = input.terminalMethod ?? null;

  const methodNotImplemented =
    terminalMethodRequested !== null && terminalMethodRequested !== METHOD_GORDON;

  if (methodNotImplemented) {
    warnings.push(
      `Requested terminal method (${terminalMethodRequested}) is not implemented in this phase; computing Gordon Growth terminal value foundation outputs only.`,
    );
    notes.push(
      `Not implemented: ${terminalMethodRequested}. Foundation uses Gordon Growth only.`,
    );
  }

  // This phase computes terminal outputs using Gordon Growth only.
  const terminalFcff = input.finalForecastFcff! * (1 + input.stableGrowthRate!);
  const terminalSpread = input.stableWacc! - input.stableGrowthRate!;

  const spreadInvalid = input.stableGrowthRate! >= input.stableWacc!;
  if (spreadInvalid) {
    warnings.push(
      "Stable growth rate must be lower than stable WACC for Gordon growth (stable WACC - stable growth must be positive).",
    );
    return {
      terminalFcff,
      terminalValue: null,
      terminalMethodUsed: METHOD_GORDON,
      terminalSpread,
      status: buildStatusFromInputs({
        missingInputs,
        warnings,
        notes,
        methodNotImplemented,
        cyclicalReview,
        spreadInvalid: true,
        finalFcffNegative: false,
        foundationWorstSeverity,
      }),
      missingInputs,
      warnings,
      notes,
    };
  }

  const terminalValue = terminalFcff / terminalSpread;

  const finalFcffNegative = terminalFcff < 0;
  if (finalFcffNegative) {
    warnings.push(
      "Final forecast FCFF (and resulting terminal FCFF) is negative — terminal value is shown for review only.",
    );
    notes.push("Review: negative terminal FCFF indicates method-sensitivity and model-quality issues.");
  }

  const status = buildStatusFromInputs({
    missingInputs,
    warnings,
    notes,
    methodNotImplemented,
    cyclicalReview,
    spreadInvalid: false,
    finalFcffNegative,
    foundationWorstSeverity,
  });

  return {
    terminalFcff,
    terminalValue,
    terminalMethodUsed: METHOD_GORDON,
    terminalSpread,
    status,
    missingInputs,
    warnings,
    notes,
  };
}

