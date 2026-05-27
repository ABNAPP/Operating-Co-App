import "server-only";

import type { CompanyDataModel } from "@/lib/types/company";
import type { DcfPvInput, DcfPvResult, DcfPvForecastPeriodSeed } from "@/lib/types/dcf-pv-engine";
import { computeDcfPvFromInput as computeDcfPvFromInputMath } from "@/lib/engines/dcf-pv/dcfPvMath";
import type { FoundationComputeOptions } from "@/lib/engines/company-foundation/companyFoundationTypes";
import { computeReinvestmentFcffForCompany } from "@/lib/engines/reinvestment-fcff/reinvestmentFcffService";
import { computeTerminalValueForCompany } from "@/lib/engines/terminal-value/terminalValueService";
import { computeWaccForCompany } from "@/lib/engines/wacc/waccService";

function forecastYearToYearNumber(forecastYear: string): number | null {
  const match = /YEAR_PLUS_(\d+)/.exec(forecastYear);
  if (!match) return null;
  const n = Number(match[1]);
  if (!Number.isFinite(n)) return null;
  return n;
}

export async function buildDcfPvInputForCompany(
  company: CompanyDataModel,
  options?: FoundationComputeOptions,
): Promise<DcfPvInput> {
  const selectedBenchmark = company.identity.damodaranIndustrialBenchmark ?? "";
  const forecastScaffoldNotes = [
    "DCF/PV foundation calculates discounting only (PV of forecast FCFF + PV of terminal value).",
    "No equity bridge, equity value, intrinsic value, or Dashboard decision logic in this phase.",
    "Foundation inputs are derived from Reinvestment / FCFF, Terminal Value, and WACC foundations.",
    "ISM-sector is display-only and must not drive DCF/PV logic.",
    "Scaffold values are not live company data (foundation-only).",
  ];

  if (!selectedBenchmark.trim()) {
    return {
      companyId: company.identity.cleanTicker,
      selectedBenchmark: "",
      forecastPeriods: [{ yearNumber: 1, forecastYear: "", fcff: null }],
      terminalYearNumber: 1,
      terminalValue: null,
      terminalValueStatus: "Not Applicable",
      wacc: null,
      waccStatus: "Not Applicable",
      sourceNotes: forecastScaffoldNotes,
    };
  }

  const upstream = options?.upstream;
  const reinvestmentFcffBundle =
    upstream?.reinvestmentFcffBundle ?? (await computeReinvestmentFcffForCompany(company));
  const waccBundle =
    upstream?.waccBundle ??
    (await computeWaccForCompany(company, { upstream: { betaPolicyBundle: upstream?.betaPolicyBundle } }));
  const terminalValueBundle =
    upstream?.terminalValueBundle ??
    (await computeTerminalValueForCompany(company, {
      upstream: {
        forecastFadeBundle: upstream?.forecastFadeBundle,
        waccBundle,
        reinvestmentFcffBundle,
        betaPolicyBundle: upstream?.betaPolicyBundle,
      },
    }));

  const reinvestmentInput = reinvestmentFcffBundle.input;
  const reinvestmentResult = reinvestmentFcffBundle.result;
  const terminalInput = terminalValueBundle.input;
  const terminalResult = terminalValueBundle.result;
  const waccResult = waccBundle.result;

  // Rules: if only one forecast FCFF exists, use it as Year 1 foundation period.
  const forecastPeriods: DcfPvForecastPeriodSeed[] = [
    {
      yearNumber: 1,
      forecastYear: reinvestmentInput.forecastYear,
      fcff: reinvestmentResult.fcff,
    },
  ];

  const parsedTerminalYear = forecastYearToYearNumber(terminalInput.finalForecastYear);
  const terminalYearNumber = parsedTerminalYear ?? forecastPeriods[0].yearNumber;

  return {
    companyId: company.identity.cleanTicker,
    selectedBenchmark,
    forecastPeriods,
    terminalYearNumber,
    terminalValue: terminalResult.terminalValue,
    terminalValueStatus: terminalResult.status,
    wacc: waccResult.wacc,
    waccStatus: waccResult.status,
    sourceNotes: [
      ...reinvestmentInput.sourceNotes,
      ...terminalInput.sourceNotes,
      ...waccBundle.input.notes,
      ...forecastScaffoldNotes,
    ],
  };
}

export async function computeDcfPvForCompany(
  company: CompanyDataModel,
  options?: FoundationComputeOptions,
): Promise<{
  input: DcfPvInput;
  result: DcfPvResult;
}> {
  const input = await buildDcfPvInputForCompany(company, options);
  const result = computeDcfPvFromInputMath(input);
  return { input, result };
}

export function computeDcfPvFromInput(input: DcfPvInput): DcfPvResult {
  return computeDcfPvFromInputMath(input);
}

