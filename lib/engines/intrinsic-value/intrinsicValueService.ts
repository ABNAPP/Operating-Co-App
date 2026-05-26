import "server-only";

import type { CompanyDataModel } from "@/lib/types/company";
import type {
  CompanyIntrinsicValueFoundationInputs,
  IntrinsicValueInput,
  IntrinsicValueResult,
} from "@/lib/types/intrinsic-value-engine";
import { computeIntrinsicValueFromInput as computeIntrinsicValueFromInputMath } from "@/lib/engines/intrinsic-value/intrinsicValueMath";
import { computeEquityBridgeForCompany } from "@/lib/engines/equity-bridge/equityBridgeService";

function resolveShareScaffold(
  company: CompanyDataModel,
): CompanyIntrinsicValueFoundationInputs | null {
  const scaffold = company.intrinsicValueFoundationInputs;
  if (!scaffold) return null;
  if (!Number.isFinite(scaffold.selectedDilutedShares)) return null;
  if (scaffold.shareUnit !== "millions" && scaffold.shareUnit !== "absolute") return null;
  if (!scaffold.selectedSharesSource?.trim()) return null;
  return scaffold;
}

function resolveFxRateToValuationCurrency(
  company: CompanyDataModel,
  scaffold: CompanyIntrinsicValueFoundationInputs,
): number | null {
  if (Number.isFinite(scaffold.fxRateToValuationCurrency)) {
    return scaffold.fxRateToValuationCurrency!;
  }

  const valuationCurrency = company.currencies.valuationCurrency;
  const priceCurrency = scaffold.priceCurrency ?? company.currencies.tradingCurrency;
  if (priceCurrency === valuationCurrency) {
    return 1;
  }

  return null;
}

export async function buildIntrinsicValueInputForCompany(
  company: CompanyDataModel,
): Promise<IntrinsicValueInput> {
  const selectedBenchmark = company.identity.damodaranIndustrialBenchmark ?? "";
  const valuationCurrency = company.currencies.valuationCurrency ?? null;

  const intrinsicScopeNotes = [
    "Intrinsic Value / Share foundation calculates per-share value from Equity Value and selected diluted shares only.",
    "No MOS, entry price, buy/sell/hold, upside/downside, or Dashboard decision logic in this phase.",
    "Share count and share unit come from explicit intrinsic value foundation scaffold inputs — not live company data.",
    "Equity Value is sourced from Firm-to-Equity Bridge foundation output.",
    "ISM-sector is display-only and must not drive intrinsic value logic.",
  ];

  if (!selectedBenchmark.trim()) {
    return {
      companyId: company.identity.cleanTicker,
      selectedBenchmark: "",
      equityValue: null,
      equityValueCurrency: valuationCurrency,
      selectedDilutedShares: null,
      shareUnit: null,
      selectedSharesSource: null,
      currentSharePrice: null,
      priceCurrency: null,
      fxRateToValuationCurrency: null,
      sourceNotes: intrinsicScopeNotes,
    };
  }

  const equityBridgeBundle = await computeEquityBridgeForCompany(company);
  const scaffold = resolveShareScaffold(company);
  const market = company.marketInputs;

  const sourceNotes = [
    ...equityBridgeBundle.input.sourceNotes,
    ...equityBridgeBundle.result.notes,
    ...intrinsicScopeNotes,
  ];

  if (scaffold?.notes) {
    sourceNotes.push(scaffold.notes);
  }

  if (!scaffold) {
    sourceNotes.push(
      "Intrinsic value foundation scaffold (selected diluted shares + share unit) is missing — cannot compute Intrinsic Value / Share.",
    );
  } else {
    sourceNotes.push(
      `Share scaffold: ${scaffold.selectedSharesSource} (unit: ${scaffold.shareUnit}) — mock/foundation only.`,
    );
  }

  if (equityBridgeBundle.result.equityValue === null) {
    sourceNotes.push(
      "Intrinsic Value / Share cannot be calculated when Equity Value is missing from Firm-to-Equity Bridge foundation.",
    );
  }

  const currentSharePrice =
    scaffold?.currentSharePrice ?? (Number.isFinite(market.currentPrice) ? market.currentPrice : null);
  const priceCurrency = scaffold?.priceCurrency ?? company.currencies.tradingCurrency ?? null;

  return {
    companyId: company.identity.cleanTicker,
    selectedBenchmark,
    equityValue: equityBridgeBundle.result.equityValue,
    equityValueCurrency: valuationCurrency,
    selectedDilutedShares: scaffold?.selectedDilutedShares ?? null,
    shareUnit: scaffold?.shareUnit ?? null,
    selectedSharesSource: scaffold?.selectedSharesSource ?? null,
    currentSharePrice,
    priceCurrency,
    fxRateToValuationCurrency: scaffold ? resolveFxRateToValuationCurrency(company, scaffold) : null,
    sourceNotes,
  };
}

export async function computeIntrinsicValueForCompany(company: CompanyDataModel): Promise<{
  input: IntrinsicValueInput;
  result: IntrinsicValueResult;
}> {
  const input = await buildIntrinsicValueInputForCompany(company);
  const result = computeIntrinsicValueFromInputMath(input);
  return { input, result };
}

export function computeIntrinsicValueFromInput(input: IntrinsicValueInput): IntrinsicValueResult {
  return computeIntrinsicValueFromInputMath(input);
}
