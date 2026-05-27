import type { CompanyDataModel } from "@/lib/types/company";
import type { CompanyIntrinsicValueFoundationInputs } from "@/lib/types/intrinsic-value-engine";
import type {
  CompanyManualInputOverrides,
  PersistedCompanyManualInputs,
} from "@/lib/types/company-manual-inputs";

/**
 * Apply persisted manual-input overrides onto a base company record.
 * Does not run valuation math — shape merge only.
 *
 * Part 1: used for Inputs tab display and tests; valuation engines should continue
 * to receive the base company until engine wiring is explicitly enabled.
 */
export function mergeStoredCompanyWithManualInputs(
  company: CompanyDataModel,
  manualInputs: PersistedCompanyManualInputs | null | undefined,
): CompanyDataModel {
  if (!manualInputs?.overrides) {
    return company;
  }

  const o = manualInputs.overrides;

  return {
    ...company,
    identity: {
      ...company.identity,
      ...stripUndefined(o.identity),
      damodaranIndustrialBenchmark:
        o.identity?.damodaranIndustrialBenchmark ??
        company.identity.damodaranIndustrialBenchmark,
    },
    currencies: {
      ...company.currencies,
      ...stripUndefined(o.currencies),
    },
    companySetupInputs: {
      ...company.companySetupInputs,
      ...stripUndefined(o.companySetup),
    },
    marketInputs: {
      ...company.marketInputs,
      ...stripUndefined(o.market),
    },
    forecastInputs: {
      ...company.forecastInputs,
      ...stripUndefined(o.forecastInputs),
    },
    riskWaccInputs: {
      ...company.riskWaccInputs,
      ...stripUndefined(o.riskWaccInputs),
    },
    betaPolicyInputs: o.betaPolicyInputs
      ? { ...company.betaPolicyInputs, ...o.betaPolicyInputs }
      : company.betaPolicyInputs,
    waccFoundationInputs: o.waccFoundationInputs
      ? { ...company.waccFoundationInputs, ...o.waccFoundationInputs }
      : company.waccFoundationInputs,
    terminalValueInputs: {
      ...company.terminalValueInputs,
      ...stripUndefined(o.terminalValueInputs),
    },
    balanceSheetBridgeInputs: {
      ...company.balanceSheetBridgeInputs,
      ...stripUndefined(o.balanceSheetBridgeInputs),
    },
    intrinsicValueFoundationInputs: mergeIntrinsicFoundationInputs(
      company.intrinsicValueFoundationInputs,
      o.intrinsicValueFoundationInputs,
    ),
    decisionLayerInputs: {
      ...company.decisionLayerInputs,
      ...stripUndefined(o.decisionLayerInputs),
    },
    historicalData: o.historicalLtm
      ? {
          ...company.historicalData,
          incomeStatement: {
            ...company.historicalData.incomeStatement,
            revenue: {
              ...company.historicalData.incomeStatement.revenue,
              ...(o.historicalLtm.revenue !== undefined
                ? { LTM: o.historicalLtm.revenue }
                : {}),
            },
          },
          cashFlow: {
            ...company.historicalData.cashFlow,
            freeCashFlow: {
              ...company.historicalData.cashFlow.freeCashFlow,
              ...(o.historicalLtm.freeCashFlow !== undefined
                ? { LTM: o.historicalLtm.freeCashFlow }
                : {}),
            },
          },
        }
      : company.historicalData,
    lastUpdated: manualInputs.savedAt ?? company.lastUpdated,
  };
}

function mergeIntrinsicFoundationInputs(
  base: CompanyIntrinsicValueFoundationInputs | undefined,
  override: CompanyManualInputOverrides["intrinsicValueFoundationInputs"],
): CompanyIntrinsicValueFoundationInputs | undefined {
  if (!override) return base;
  if (!base) return undefined;

  return {
    ...base,
    ...(override.selectedDilutedShares !== undefined
      ? { selectedDilutedShares: override.selectedDilutedShares }
      : {}),
    ...(override.shareUnit !== undefined ? { shareUnit: override.shareUnit } : {}),
    ...(override.selectedSharesSource !== undefined
      ? { selectedSharesSource: override.selectedSharesSource }
      : {}),
    ...(override.currentSharePrice !== undefined
      ? { currentSharePrice: override.currentSharePrice }
      : {}),
    ...(override.priceCurrency !== undefined ? { priceCurrency: override.priceCurrency } : {}),
    ...(override.fxRateToValuationCurrency !== undefined
      ? { fxRateToValuationCurrency: override.fxRateToValuationCurrency }
      : {}),
    ...(override.notes !== undefined ? { notes: override.notes } : {}),
  };
}

function stripUndefined<T extends Record<string, unknown>>(record: T | undefined): Partial<T> {
  if (!record) return {};
  const out: Partial<T> = {};
  for (const [key, value] of Object.entries(record)) {
    if (value !== undefined && value !== null) {
      (out as Record<string, unknown>)[key] = value;
    }
  }
  return out;
}
