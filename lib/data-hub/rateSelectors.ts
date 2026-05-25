import type { CurrencyCode, CurrencyMapRow, FxPairRateRow, RiskfreeRateRow } from "@/lib/types";

export function getSelectedRiskfreeRate(row: RiskfreeRateRow): number | null {
  if (row.manualOverrideRate !== null) {
    return row.manualOverrideRate;
  }

  if (row.liveRiskfreeRate !== null) {
    return row.liveRiskfreeRate;
  }

  return null;
}

export function getRiskfreeStatus(row: RiskfreeRateRow): string {
  if (row.manualOverrideRate !== null) {
    return "Manual Override";
  }

  if (row.liveRiskfreeRate !== null) {
    return "OK";
  }

  return "Manual Required / Not Updated";
}

export function getRiskfreeRateForValuationCurrency(
  currencyCode: CurrencyCode,
  rows: RiskfreeRateRow[],
): RiskfreeRateRow | null {
  return rows.find((row) => row.currencyCode === currencyCode) ?? null;
}

export function getSelectedFxRate(row: FxPairRateRow): number | null {
  if (row.fromCurrency === row.toCurrency) {
    return 1;
  }

  if (row.manualOverride !== null) {
    return row.manualOverride;
  }

  if (row.liveFxRate !== null) {
    return row.liveFxRate;
  }

  return null;
}

export function getFxStatus(row: FxPairRateRow): string {
  if (row.fromCurrency === row.toCurrency) {
    return "OK";
  }

  if (row.manualOverride !== null) {
    return "Manual Override";
  }

  if (row.liveFxRate !== null) {
    return "OK";
  }

  return "Currency Review / Missing FX or Not Updated";
}

export function buildFxPairRowsFromCurrencyMap(
  mapRows: CurrencyMapRow[],
  sourceLabel = "Configured / Pending Phase 4B",
): FxPairRateRow[] {
  const activeCurrencies = mapRows
    .filter((row) => row.active)
    .map((row) => row.currencyCode);

  const now = new Date().toISOString();
  const rows: FxPairRateRow[] = [];

  for (const fromCurrency of activeCurrencies) {
    for (const toCurrency of activeCurrencies) {
      const sameCurrency = fromCurrency === toCurrency;

      rows.push({
        id: `fx_${fromCurrency}_${toCurrency}`,
        fromCurrency,
        toCurrency,
        fxPair: `${fromCurrency}${toCurrency}`,
        liveFxRate: sameCurrency ? 1 : null,
        manualOverride: null,
        selectedFxRate: sameCurrency ? 1 : null,
        source: sourceLabel,
        lastUpdated: now,
        status: sameCurrency ? "OK" : "Currency Review / Missing FX or Not Updated",
        notes: sameCurrency
          ? "Same-currency pair fixed at 1."
          : "Awaiting Phase 4B provider refresh or manual override.",
      });
    }
  }

  return rows;
}
