import type {
  DcfPvInput,
  DcfPvForecastPeriod,
  DcfPvReadinessStatus,
  DcfPvResult,
} from "@/lib/types/dcf-pv-engine";

function isFiniteNumber(value: number | null | undefined): value is number {
  return value !== null && value !== undefined && Number.isFinite(value);
}

function includesCyclicalOrHighKeyword(sourceNotes: string[]): boolean {
  return sourceNotes.some((note) =>
    /(cyclical|commodity|high asset intensity|high capital intensity)/i.test(note),
  );
}

function severity(status: DcfPvReadinessStatus | string): number {
  if (status === "Missing") return 2;
  if (status === "Review") return 1;
  if (status === "Ready") return 0;
  return -1; // Not Applicable or unknown
}

function worstStatus(statuses: Array<DcfPvReadinessStatus | string>): DcfPvReadinessStatus {
  const worst = Math.max(...statuses.map(severity));
  if (worst === 2) return "Missing";
  if (worst === 1) return "Review";
  if (worst === 0) return "Ready";
  return "Not Applicable";
}

export function computeDcfPvFromInput(input: DcfPvInput): DcfPvResult {
  if (!input.selectedBenchmark.trim()) {
    return {
      forecastPeriods: input.forecastPeriods.map((p) => ({
        yearNumber: p.yearNumber,
        forecastYear: p.forecastYear,
        fcff: p.fcff,
        wacc: input.wacc,
        discountFactor: null,
        pvFcff: null,
        status: "Not Applicable",
        missingInputs: [],
        notes: [...input.sourceNotes],
      })),
      pvForecastFcff: null,
      pvTerminalValue: null,
      valueOfOperatingAssets: null,
      status: "Not Applicable",
      missingInputs: [],
      warnings: [],
      notes: [...input.sourceNotes],
    };
  }

  const notes: string[] = [...input.sourceNotes];
  const warnings: string[] = [];
  const missingInputs: string[] = [];

  const cyclicalReview = includesCyclicalOrHighKeyword(input.sourceNotes);

  if (!isFiniteNumber(input.wacc)) {
    missingInputs.push("WACC");
    // Rule: if WACC missing, PV outputs must be null.
    return {
      forecastPeriods: input.forecastPeriods.map(
        (p): DcfPvForecastPeriod => ({
          yearNumber: p.yearNumber,
          forecastYear: p.forecastYear,
          fcff: p.fcff,
          wacc: input.wacc,
          discountFactor: null,
          pvFcff: null,
          status: "Missing",
          missingInputs: ["WACC"],
          notes: [...input.sourceNotes],
        }),
      ),
      pvForecastFcff: null,
      pvTerminalValue: null,
      valueOfOperatingAssets: null,
      status: input.waccStatus === "Review" ? "Review" : "Missing",
      missingInputs,
      warnings,
      notes,
    };
  }

  if (input.wacc! <= 0) {
    warnings.push("Stable WACC must be > 0 for discounting; returning Review/Missing guardrail.");
    return {
      forecastPeriods: input.forecastPeriods.map(
        (p): DcfPvForecastPeriod => ({
          yearNumber: p.yearNumber,
          forecastYear: p.forecastYear,
          fcff: p.fcff,
          wacc: input.wacc,
          discountFactor: null,
          pvFcff: null,
          status: "Review",
          missingInputs: ["Invalid WACC (<= 0)"],
          notes: [...input.sourceNotes],
        }),
      ),
      pvForecastFcff: null,
      pvTerminalValue: null,
      valueOfOperatingAssets: null,
      status: "Review",
      missingInputs: ["Invalid WACC (<= 0)"],
      warnings,
      notes,
    };
  }

  const invalidYearNumbers =
    input.forecastPeriods.some((p) => !Number.isFinite(p.yearNumber) || p.yearNumber <= 0) ||
    !Number.isFinite(input.terminalYearNumber) ||
    input.terminalYearNumber <= 0;

  if (invalidYearNumbers) {
    warnings.push("Year number must be > 0 for discount factor exponent; returning Review/Missing guardrail.");
    return {
      forecastPeriods: input.forecastPeriods.map(
        (p): DcfPvForecastPeriod => ({
          yearNumber: p.yearNumber,
          forecastYear: p.forecastYear,
          fcff: p.fcff,
          wacc: input.wacc,
          discountFactor: null,
          pvFcff: null,
          status: "Review",
          missingInputs: ["Invalid yearNumber (<= 0)"],
          notes: [...input.sourceNotes],
        }),
      ),
      pvForecastFcff: null,
      pvTerminalValue: null,
      valueOfOperatingAssets: null,
      status: "Review",
      missingInputs: ["Invalid yearNumber (<= 0)"],
      warnings,
      notes,
    };
  }

  const forecastPeriods: DcfPvForecastPeriod[] = input.forecastPeriods.map((p) => {
    const discountFactor = 1 / Math.pow(1 + input.wacc!, p.yearNumber);
    if (!isFiniteNumber(p.fcff)) {
      return {
        yearNumber: p.yearNumber,
        forecastYear: p.forecastYear,
        fcff: p.fcff,
        wacc: input.wacc,
        discountFactor,
        pvFcff: null,
        status: cyclicalReview ? "Review" : "Missing",
        missingInputs: ["Forecast FCFF"],
        notes: [
          ...input.sourceNotes,
          "Forecast PV is unavailable because forecast FCFF is missing (no fake PV).",
        ],
      };
    }

    const pvFcff = p.fcff * discountFactor;
    const status: DcfPvReadinessStatus = cyclicalReview ? "Review" : "Ready";
    return {
      yearNumber: p.yearNumber,
      forecastYear: p.forecastYear,
      fcff: p.fcff,
      wacc: input.wacc,
      discountFactor,
      pvFcff,
      status,
      missingInputs: [],
      notes: [...input.sourceNotes],
    };
  });

  const pvForecastFcffFinal = forecastPeriods.every((p) => p.pvFcff !== null)
    ? forecastPeriods.reduce((sum, p) => (sum ?? 0) + (p.pvFcff ?? 0), 0)
    : null;

  const terminalDiscountFactor = 1 / Math.pow(1 + input.wacc!, input.terminalYearNumber);
  let pvTerminalValue: number | null = null;
  if (isFiniteNumber(input.terminalValue)) {
    pvTerminalValue = input.terminalValue! * terminalDiscountFactor;
  } else {
    pvTerminalValue = null;
    warnings.push("PV Terminal Value is unavailable because terminal value is missing.");
  }

  const valueOfOperatingAssets =
    pvForecastFcffFinal !== null && pvTerminalValue !== null
      ? pvForecastFcffFinal + pvTerminalValue
      : null;

  const forecastStatuses = forecastPeriods.map((p) => p.status);
  const overallWorst = worstStatus([
    input.waccStatus,
    input.terminalValueStatus,
    ...forecastStatuses,
    cyclicalReview ? "Review" : "Ready",
  ]);

  const status: DcfPvReadinessStatus = valueOfOperatingAssets === null ? overallWorst : overallWorst;

  if (cyclicalReview) {
    notes.push("Cyclical / high asset-intensity review context applies — PV outputs remain foundation-only and flagged for review.");
  }

  // missing inputs summary:
  if (pvForecastFcffFinal === null) missingInputs.push("Forecast PV (forecast FCFF)");
  if (pvTerminalValue === null) missingInputs.push("PV of terminal value");

  const cleanedMissingInputs = [...new Set(missingInputs)];

  return {
    forecastPeriods,
    pvForecastFcff: pvForecastFcffFinal,
    pvTerminalValue,
    valueOfOperatingAssets,
    status,
    missingInputs: cleanedMissingInputs,
    warnings: [...new Set(warnings)],
    notes,
  };
}

