import "server-only";

import type { CompanyDataModel } from "@/lib/types/company";
import type { EquityBridgeInput, EquityBridgeResult } from "@/lib/types/equity-bridge-engine";
import { computeEquityBridgeFromInput as computeEquityBridgeFromInputMath } from "@/lib/engines/equity-bridge/equityBridgeMath";
import type { FoundationComputeOptions } from "@/lib/engines/company-foundation/companyFoundationTypes";
import { computeDcfPvForCompany } from "@/lib/engines/dcf-pv/dcfPvService";

function resolveTotalDebt(bridge: CompanyDataModel["balanceSheetBridgeInputs"]): {
  totalDebt: number | null;
  notes: string[];
} {
  const notes: string[] = [];
  const grossDebt = bridge.grossDebt;
  const leaseLiabilities = bridge.leaseLiabilities;

  if (!Number.isFinite(grossDebt)) {
    return { totalDebt: null, notes: ["Gross debt is missing from balance sheet bridge scaffold."] };
  }

  const lease = Number.isFinite(leaseLiabilities) ? leaseLiabilities : 0;
  if (!Number.isFinite(leaseLiabilities)) {
    notes.push(
      "Lease liabilities defaulting to 0 when not explicitly provided — total debt uses gross debt plus lease (not net debt).",
    );
  }

  notes.push(
    "Total Debt = Gross Debt + Lease Liabilities (debt-like claims) — explicit gross debt only, not net debt.",
  );

  return { totalDebt: grossDebt + lease, notes };
}

export async function buildEquityBridgeInputForCompany(
  company: CompanyDataModel,
  options?: FoundationComputeOptions,
): Promise<EquityBridgeInput> {
  const selectedBenchmark = company.identity.damodaranIndustrialBenchmark ?? "";

  const bridgeScopeNotes = [
    "Firm-to-Equity Bridge foundation calculates Equity Value from Value of Operating Assets and bridge adjustments only.",
    "No intrinsic value per share, no MOS/entry/exit, and no Dashboard decision logic in this phase.",
    "Bridge cash, debt, and claims come from explicit company balance sheet bridge scaffold inputs — not live company data.",
    "Value of Operating Assets is sourced from DCF/PV foundation output.",
    "ISM-sector is display-only and must not drive bridge logic.",
  ];

  if (!selectedBenchmark.trim()) {
    return {
      companyId: company.identity.cleanTicker,
      selectedBenchmark: "",
      valueOfOperatingAssets: null,
      cashAndCashEquivalents: null,
      nonOperatingAssets: null,
      totalDebt: null,
      preferredEquity: null,
      minorityInterest: null,
      otherNonEquityClaims: null,
      sourceNotes: bridgeScopeNotes,
    };
  }

  const dcfPvBundle =
    options?.upstream?.dcfPvBundle ??
    (await computeDcfPvForCompany(company, { upstream: options?.upstream }));
  const bridge = company.balanceSheetBridgeInputs;
  const totalDebtResolved = resolveTotalDebt(bridge);

  const otherNonEquityClaims =
    Number.isFinite(bridge.pensionDeficit) && Number.isFinite(bridge.otherClaims)
      ? bridge.pensionDeficit + bridge.otherClaims
      : Number.isFinite(bridge.pensionDeficit)
        ? bridge.pensionDeficit
        : Number.isFinite(bridge.otherClaims)
          ? bridge.otherClaims
          : null;

  const input: EquityBridgeInput = {
    companyId: company.identity.cleanTicker,
    selectedBenchmark,
    valueOfOperatingAssets: dcfPvBundle.result.valueOfOperatingAssets,
    cashAndCashEquivalents: Number.isFinite(bridge.cashAndCashEquivalents)
      ? bridge.cashAndCashEquivalents
      : null,
    nonOperatingAssets: Number.isFinite(bridge.marketableSecurities)
      ? bridge.marketableSecurities
      : null,
    totalDebt: totalDebtResolved.totalDebt,
    preferredEquity: Number.isFinite(bridge.preferredEquity) ? bridge.preferredEquity : null,
    minorityInterest: Number.isFinite(bridge.minorityInterest) ? bridge.minorityInterest : null,
    otherNonEquityClaims,
    sourceNotes: [
      ...dcfPvBundle.input.sourceNotes,
      ...dcfPvBundle.result.notes,
      ...totalDebtResolved.notes,
      ...bridgeScopeNotes,
    ],
  };

  if (dcfPvBundle.result.valueOfOperatingAssets === null) {
    input.sourceNotes.push(
      "Equity bridge cannot compute Equity Value when Value of Operating Assets is missing from DCF/PV foundation.",
    );
  }

  return input;
}

export async function computeEquityBridgeForCompany(
  company: CompanyDataModel,
  options?: FoundationComputeOptions,
): Promise<{
  input: EquityBridgeInput;
  result: EquityBridgeResult;
}> {
  const input = await buildEquityBridgeInputForCompany(company, options);
  const result = computeEquityBridgeFromInputMath(input);
  return { input, result };
}

export function computeEquityBridgeFromInput(input: EquityBridgeInput): EquityBridgeResult {
  return computeEquityBridgeFromInputMath(input);
}
