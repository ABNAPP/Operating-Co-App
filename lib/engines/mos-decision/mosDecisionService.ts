import "server-only";

import type { CompanyDataModel } from "@/lib/types/company";
import type { MosDecisionInput, MosDecisionResult } from "@/lib/types/mos-decision-engine";
import { computeMosDecisionFromInput as computeMosDecisionFromInputMath } from "@/lib/engines/mos-decision/mosDecisionMath";
import type { FoundationComputeOptions } from "@/lib/engines/company-foundation/companyFoundationTypes";
import { computeIntrinsicValueForCompany } from "@/lib/engines/intrinsic-value/intrinsicValueService";

export async function buildMosDecisionInputForCompany(
  company: CompanyDataModel,
  options?: FoundationComputeOptions,
): Promise<MosDecisionInput> {
  const intrinsicBundle =
    options?.upstream?.intrinsicValueBundle ??
    (await computeIntrinsicValueForCompany(company, options));

  const currentSharePrice = Number.isFinite(company.marketInputs.currentPrice)
    ? company.marketInputs.currentPrice
    : null;

  const valuationCurrency = company.currencies.valuationCurrency ?? null;
  const priceCurrency = company.currencies.tradingCurrency ?? null;

  // Explicit scaffold from DecisionLayerInputs — do not invent required MOS.
  const requiredMOS = Number.isFinite(company.decisionLayerInputs?.minimumMOSForApprove)
    ? company.decisionLayerInputs.minimumMOSForApprove
    : null;
  const requiredMOSSource = requiredMOS !== null ? "DecisionLayerInputs.minimumMOSForApprove (scaffold)" : null;

  const intrinsicValueCurrency =
    intrinsicBundle.result.valuationCurrency ?? intrinsicBundle.input.equityValueCurrency ?? valuationCurrency;

  return {
    companyId: company.identity.cleanTicker,
    selectedBenchmark: company.identity.damodaranIndustrialBenchmark ?? "",

    intrinsicValuePerShare: intrinsicBundle.result.intrinsicValuePerShare,
    intrinsicValueCurrency,
    intrinsicStatus: intrinsicBundle.result.status,

    currentSharePrice,
    priceCurrency,
    fxRateToValuationCurrency: intrinsicBundle.input.fxRateToValuationCurrency ?? null,

    requiredMOS,
    requiredMOSSource,

    sourceNotes: [
      ...intrinsicBundle.input.sourceNotes,
      ...intrinsicBundle.result.notes,
      "MOS / Decision Layer foundation is foundation-only — no Dashboard decision logic in this phase.",
    ],
  };
}

export async function computeMosDecisionForCompany(
  company: CompanyDataModel,
  options?: FoundationComputeOptions,
): Promise<{
  input: MosDecisionInput;
  result: MosDecisionResult;
}> {
  const input = await buildMosDecisionInputForCompany(company, options);
  const result = computeMosDecisionFromInputMath(input);
  return { input, result };
}

export function computeMosDecisionFromInput(input: MosDecisionInput): MosDecisionResult {
  return computeMosDecisionFromInputMath(input);
}

