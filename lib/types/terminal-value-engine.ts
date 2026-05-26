import type { ForecastFadeReadinessStatus } from "@/lib/types/forecast-fade-engine";
import type { ReinvestmentFcffReadinessStatus } from "@/lib/types/reinvestment-fcff-engine";
import type { WaccStatus } from "@/lib/types/wacc-engine";

export type TerminalValueMethod = "Gordon Growth" | "Exit Multiple" | "Hybrid";

export type TerminalValueReadinessStatus = "Ready" | "Review" | "Missing" | "Not Applicable";

export interface TerminalValueInput {
  companyId: string;
  selectedBenchmark: string;
  finalForecastYear: string;
  finalForecastFcff: number | null;

  stableGrowthRate: number | null;
  stableWacc: number | null;
  terminalMethod: TerminalValueMethod | null;

  forecastFadeStatus: ForecastFadeReadinessStatus;
  waccStatus: WaccStatus;
  fcffStatus: ReinvestmentFcffReadinessStatus;

  sourceNotes: string[];
}

export interface TerminalValueResult {
  terminalFcff: number | null;
  terminalValue: number | null;
  terminalMethodUsed: TerminalValueMethod | null;
  terminalSpread: number | null;

  status: TerminalValueReadinessStatus;
  missingInputs: string[];
  warnings: string[];
  notes: string[];
}

