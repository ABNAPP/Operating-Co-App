import "server-only";

import type { CompanyDataModel } from "@/lib/types/company";
import type {
  TerminalValueInput,
  TerminalValueResult,
  TerminalValueMethod,
} from "@/lib/types/terminal-value-engine";
import { computeTerminalValueFromInput as computeTerminalValueFromInputMath } from "@/lib/engines/terminal-value/terminalValueMath";
import type { FoundationComputeOptions } from "@/lib/engines/company-foundation/companyFoundationTypes";
import { computeForecastFadeForCompany } from "@/lib/engines/forecast-fade/forecastFadeService";
import { computeReinvestmentFcffForCompany } from "@/lib/engines/reinvestment-fcff/reinvestmentFcffService";
import { computeWaccForCompany } from "@/lib/engines/wacc/waccService";

function resolveStableGrowthRate(company: CompanyDataModel): number | null {
  const val = company.terminalValueInputs?.terminalGrowthRate ?? null;
  return Number.isFinite(val) ? val : null;
}

function resolveTerminalMethod(company: CompanyDataModel): TerminalValueMethod | null {
  return company.terminalValueInputs?.terminalMethod ?? null;
}

export async function buildTerminalValueInputForCompany(
  company: CompanyDataModel,
  options?: FoundationComputeOptions,
): Promise<TerminalValueInput> {
  const selectedBenchmark = company.identity.damodaranIndustrialBenchmark ?? "";

  const terminalScopeNotes = [
    "Terminal Value foundation calculates terminal FCFF and Gordon terminal value only. It does not calculate DCF/PV, firm-to-equity bridge, or intrinsic value or Dashboard decision logic.",
    "Scaffold stable growth and terminal method come from company template inputs (terminalValueInputs) — not live company data.",
    "ISM-sector is display-only and must not drive terminal value logic.",
  ];

  if (!selectedBenchmark.trim()) {
    return {
      companyId: company.identity.cleanTicker,
      selectedBenchmark: "",
      finalForecastYear: "",
      finalForecastFcff: null,
      stableGrowthRate: resolveStableGrowthRate(company),
      stableWacc: null,
      terminalMethod: resolveTerminalMethod(company),
      forecastFadeStatus: "Not Applicable",
      waccStatus: "Not Applicable",
      fcffStatus: "Not Applicable",
      sourceNotes: terminalScopeNotes,
    };
  }

  const upstream = options?.upstream;
  const [forecastFadeBundle, waccBundle, reinvestmentFcffBundle] = await Promise.all([
    upstream?.forecastFadeBundle ?? computeForecastFadeForCompany(company),
    upstream?.waccBundle ??
      computeWaccForCompany(company, { upstream: { betaPolicyBundle: upstream?.betaPolicyBundle } }),
    upstream?.reinvestmentFcffBundle ?? computeReinvestmentFcffForCompany(company),
  ]);

  const reinvestmentInput = reinvestmentFcffBundle.input;
  const reinvestmentResult = reinvestmentFcffBundle.result;

  const waccResult = waccBundle.result;

  const terminalInput: TerminalValueInput = {
    companyId: company.identity.cleanTicker,
    selectedBenchmark,
    finalForecastYear: reinvestmentInput.forecastYear,
    finalForecastFcff: reinvestmentResult.fcff,
    stableGrowthRate: resolveStableGrowthRate(company),
    stableWacc: waccResult.wacc,
    terminalMethod: resolveTerminalMethod(company),
    forecastFadeStatus: forecastFadeBundle.result.readinessStatus,
    waccStatus: waccResult.status,
    fcffStatus: reinvestmentResult.status,
    sourceNotes: [...reinvestmentInput.sourceNotes, ...terminalScopeNotes],
  };

  if (reinvestmentResult.fcff === null) {
    terminalInput.sourceNotes.push(
      "Terminal Value foundation cannot compute terminal FCFF when final forecast FCFF is missing from Reinvestment / FCFF foundation.",
    );
  }
  if (waccResult.wacc === null) {
    terminalInput.sourceNotes.push(
      "Terminal Value foundation cannot compute Gordon terminal value when stable WACC is missing from WACC foundation.",
    );
  }

  return terminalInput;
}

export async function computeTerminalValueForCompany(
  company: CompanyDataModel,
  options?: FoundationComputeOptions,
): Promise<{
  input: TerminalValueInput;
  result: TerminalValueResult;
}> {
  const input = await buildTerminalValueInputForCompany(company, options);
  const result = computeTerminalValueFromInputMath(input);
  return { input, result };
}

export function computeTerminalValueFromInput(input: TerminalValueInput): TerminalValueResult {
  return computeTerminalValueFromInputMath(input);
}

