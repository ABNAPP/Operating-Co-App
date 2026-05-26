import "server-only";

import { computeBetaPolicyForCompany } from "@/lib/engines/beta/betaPolicyService";
import {
  computeWaccFromInput,
  computeWaccReadinessFromInput,
  isPlausibleDebtToEquity,
  isPlausibleRate,
  isPlausibleTaxRate,
  isPlausibleWeight,
} from "@/lib/engines/wacc/waccMath";
import { getCountryErpByCountryName } from "@/lib/firestore/repositories/countryRiskErpRepository";
import { getRiskfreeRateByCurrency } from "@/lib/firestore/repositories/referenceDataRepository";
import { getSelectedRiskfreeRate } from "@/lib/data-hub/rateSelectors";
import type { CompanyDataModel } from "@/lib/types/company";
import type { RiskfreeRateRow } from "@/lib/types/reference-data";
import type {
  CompanyWaccFoundationInputs,
  WaccInput,
  WaccReadinessStatus,
  WaccResult,
} from "@/lib/types/wacc-engine";

export {
  calculateAfterTaxCostOfDebt,
  calculateCostOfEquity,
  calculateWacc,
  computeWaccFromInput,
  computeWaccReadinessFromInput,
  deriveWeightsFromDebtToEquity,
  COST_OF_EQUITY_FORMULA,
  AFTER_TAX_COST_OF_DEBT_FORMULA,
  WACC_FORMULA,
} from "@/lib/engines/wacc/waccMath";

const REVENUE_WEIGHTED_ERP_REVIEW_NOTE =
  "Revenue-weighted ERP not implemented yet; country-of-risk ERP used as foundation input.";

/** User-facing riskfree source label — strips stale phase placeholders from stored rows. */
export function formatRiskfreeSourceForDisplay(
  row: RiskfreeRateRow,
  valuationCurrency: string,
): string {
  const status = row.status?.trim();
  if (status === "OK" || status === "Auto Updated / OK") {
    return `FRED / Auto Updated (${valuationCurrency})`;
  }
  if (status === "Manual Override") {
    return `FRED / Manual Override (${valuationCurrency})`;
  }

  const cleanedName = (row.sourceName ?? "")
    .replace(/\(planned for Phase 4B\)/gi, "")
    .replace(/\(planned for Phase 4A\)/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  if (/fred/i.test(cleanedName) || row.fredSeriesId) {
    return `FRED (valuation-currency riskfree, ${valuationCurrency})`;
  }

  return `${cleanedName || "Riskfree reference"} (${valuationCurrency})`;
}

function resolveDebtToEquity(
  company: CompanyDataModel,
  policyDebtToEquity: number | null,
): number | null {
  const scaffold = company.waccFoundationInputs;
  const scaffoldDebtToEquity = scaffold?.selectedDebtToEquity ?? null;
  if (isPlausibleDebtToEquity(scaffoldDebtToEquity)) {
    return scaffoldDebtToEquity;
  }
  if (isPlausibleDebtToEquity(policyDebtToEquity)) {
    return policyDebtToEquity;
  }
  return null;
}

function resolveTaxRate(
  company: CompanyDataModel,
  policyTaxRate: number | null,
): { value: number | null; source: string | null } {
  const scaffold = company.waccFoundationInputs;
  const scaffoldTaxRate = scaffold?.selectedTaxRate ?? null;
  if (isPlausibleTaxRate(scaffoldTaxRate)) {
    return {
      value: scaffoldTaxRate,
      source: scaffold?.taxRateSource ?? "Mock / Foundation scaffold",
    };
  }
  if (isPlausibleTaxRate(policyTaxRate)) {
    return { value: policyTaxRate, source: "Beta Policy / company inputs" };
  }
  return { value: null, source: null };
}

function resolvePreTaxCostOfDebt(
  scaffold: CompanyWaccFoundationInputs | undefined,
): { value: number | null; source: string | null } {
  const scaffoldPreTax = scaffold?.preTaxCostOfDebt ?? null;
  if (isPlausibleRate(scaffoldPreTax)) {
    return {
      value: scaffoldPreTax,
      source: scaffold?.costOfDebtSource ?? "Mock / Foundation scaffold",
    };
  }
  return { value: null, source: null };
}

export async function buildWaccInputForCompany(company: CompanyDataModel): Promise<WaccInput> {
  const { policy } = await computeBetaPolicyForCompany(company);
  const valuationCurrency = company.currencies.valuationCurrency;
  const countryOfRisk = company.identity.countryOfRisk;

  const riskfreeRowResult = await getRiskfreeRateByCurrency(valuationCurrency);
  const riskfreeRow = riskfreeRowResult.data;
  const riskfreeRate = riskfreeRow ? getSelectedRiskfreeRate(riskfreeRow) : null;
  const riskfreeSource = riskfreeRow
    ? formatRiskfreeSourceForDisplay(riskfreeRow, valuationCurrency)
    : null;

  const countryErpResult = await getCountryErpByCountryName(countryOfRisk);
  const countryErpRow = countryErpResult.data;
  const equityRiskPremium = isPlausibleRate(countryErpRow?.totalEquityRiskPremium ?? null)
    ? countryErpRow!.totalEquityRiskPremium
    : null;
  const countryRiskPremium = isPlausibleRate(countryErpRow?.countryRiskPremium ?? null)
    ? countryErpRow!.countryRiskPremium
    : null;

  const scaffold = company.waccFoundationInputs;
  const debtToEquity = resolveDebtToEquity(company, policy.selectedDebtToEquity);
  const tax = resolveTaxRate(company, policy.selectedTaxRate);
  const costOfDebt = resolvePreTaxCostOfDebt(scaffold);

  const notes: string[] = [
    "WACC foundation only — not connected to valuation outputs or Dashboard decisions.",
  ];
  if (scaffold?.notes) {
    notes.push(scaffold.notes);
  }
  if (equityRiskPremium !== null) {
    notes.push(REVENUE_WEIGHTED_ERP_REVIEW_NOTE);
  }

  const scaffoldDebtWeight = scaffold?.selectedDebtWeight ?? null;
  const scaffoldEquityWeight = scaffold?.selectedEquityWeight ?? null;
  const debtWeight = isPlausibleWeight(scaffoldDebtWeight) ? scaffoldDebtWeight : null;
  const equityWeight = isPlausibleWeight(scaffoldEquityWeight) ? scaffoldEquityWeight : null;

  return {
    companyId: company.identity.cleanTicker,
    selectedBenchmark: company.identity.damodaranIndustrialBenchmark ?? "",
    valuationCurrency,
    countryOfRisk,
    selectedBeta: policy.selectedBeta,
    selectedBetaSource: policy.selectedBetaSource,
    riskfreeRate,
    riskfreeSource,
    equityRiskPremium,
    equityRiskPremiumSource: countryErpRow
      ? `${countryErpRow.sourceName} — ${countryOfRisk} (country-of-risk)`
      : null,
    countryRiskPremium,
    countryRiskPremiumSource: countryErpRow
      ? `Country Risk Premium — ${countryOfRisk}`
      : null,
    selectedDebtToEquity: debtToEquity,
    selectedDebtWeight: debtWeight,
    selectedEquityWeight: equityWeight,
    preTaxCostOfDebt: costOfDebt.value,
    costOfDebtSource: costOfDebt.source,
    selectedTaxRate: tax.value,
    taxRateSource: tax.source,
    manualOverrides: {},
    notes,
  };
}

export async function computeWaccReadinessForCompany(
  company: CompanyDataModel,
): Promise<WaccReadinessStatus> {
  const input = await buildWaccInputForCompany(company);
  return computeWaccReadinessFromInput(input);
}

export async function computeWaccForCompany(company: CompanyDataModel): Promise<{
  input: WaccInput;
  readiness: WaccReadinessStatus;
  result: WaccResult;
}> {
  const input = await buildWaccInputForCompany(company);
  const readiness = computeWaccReadinessFromInput(input);
  const result = computeWaccFromInput(input);

  if (readiness.status === "Missing" && result.status !== "Missing") {
    result.status = "Missing";
  }

  return { input, readiness, result };
}
