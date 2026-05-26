import type { TerminalValueReadinessStatus } from "@/lib/types/terminal-value-engine";
import type { WaccStatus } from "@/lib/types/wacc-engine";

export type DcfPvReadinessStatus = "Ready" | "Review" | "Missing" | "Not Applicable";

export interface DcfPvForecastPeriodSeed {
  yearNumber: number;
  forecastYear: string;
  fcff: number | null;
}

export interface DcfPvForecastPeriod {
  yearNumber: number;
  forecastYear: string;
  fcff: number | null;
  wacc: number | null;
  discountFactor: number | null;
  pvFcff: number | null;
  status: DcfPvReadinessStatus;
  missingInputs: string[];
  notes: string[];
}

export interface DcfPvInput {
  companyId: string;
  selectedBenchmark: string;
  forecastPeriods: DcfPvForecastPeriodSeed[];

  terminalYearNumber: number;
  terminalValue: number | null;
  terminalValueStatus: TerminalValueReadinessStatus;

  wacc: number | null;
  waccStatus: WaccStatus;

  sourceNotes: string[];
}

export interface DcfPvResult {
  forecastPeriods: DcfPvForecastPeriod[];
  pvForecastFcff: number | null;
  pvTerminalValue: number | null;
  valueOfOperatingAssets: number | null;
  status: DcfPvReadinessStatus;

  missingInputs: string[];
  warnings: string[];
  notes: string[];
}

