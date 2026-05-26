import "server-only";
import { Timestamp } from "firebase-admin/firestore";
import { writeFxRatesCache } from "@/lib/data-hub/fxCacheStore";
import { getSelectedFxRate } from "@/lib/data-hub/rateSelectors";
import { getAdminDb, isFirebaseAdminConfigured } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/firestore/collections";
import { mockCompanies } from "@/lib/mock-companies";
import type { CompanyDataModel, CurrencyCode, FxPairRateRow } from "@/lib/types";

export interface RequiredFxPair {
  fromCurrency: CurrencyCode;
  toCurrency: CurrencyCode;
  fxPair: string;
  requiredByCompanyIds: string[];
  requiredByTickers: string[];
  purpose:
    | "Current Price Conversion"
    | "Reporting Currency Review"
    | "Reverse / Reference Conversion";
  priority: number;
  reviewReason: string;
  isReversePair?: boolean;
  reverseOf?: string;
}

export interface EnsureRequiredFxPairsSummary {
  ok: boolean;
  source: "firestore" | "mock";
  companiesEvaluated: number;
  requiredPairsDerived: number;
  created: number;
  updated: number;
  warnings: string[];
  error?: string;
}

function pairId(fromCurrency: CurrencyCode, toCurrency: CurrencyCode) {
  return `fx_${fromCurrency}_${toCurrency}`;
}

function pairCode(fromCurrency: CurrencyCode, toCurrency: CurrencyCode) {
  return `${fromCurrency}${toCurrency}`;
}

function mergeRequiredPair(
  map: Map<string, RequiredFxPair>,
  next: RequiredFxPair,
) {
  const key = `${next.fromCurrency}_${next.toCurrency}`;
  const existing = map.get(key);

  if (!existing) {
    map.set(key, next);
    return;
  }

  const purposeRank: Record<RequiredFxPair["purpose"], number> = {
    "Current Price Conversion": 1,
    "Reporting Currency Review": 2,
    "Reverse / Reference Conversion": 3,
  };

  const preferredPurpose =
    purposeRank[next.purpose] < purposeRank[existing.purpose]
      ? next.purpose
      : existing.purpose;
  const preferredReviewReason =
    purposeRank[next.purpose] < purposeRank[existing.purpose]
      ? next.reviewReason
      : existing.reviewReason;

  map.set(key, {
    ...existing,
    purpose: preferredPurpose,
    priority: Math.min(existing.priority, next.priority),
    reviewReason: preferredReviewReason,
    requiredByCompanyIds: Array.from(
      new Set([...existing.requiredByCompanyIds, ...next.requiredByCompanyIds]),
    ),
    requiredByTickers: Array.from(
      new Set([...existing.requiredByTickers, ...next.requiredByTickers]),
    ),
    isReversePair: existing.isReversePair && next.isReversePair,
    reverseOf: existing.reverseOf ?? next.reverseOf,
  });
}

export function deriveRequiredFxPairsFromCompanies(
  companies: CompanyDataModel[],
): RequiredFxPair[] {
  const requiredMap = new Map<string, RequiredFxPair>();

  for (const company of companies) {
    const companyId = company.identity.cleanTicker;
    const ticker = company.identity.cleanTicker;
    const { valuationCurrency, tradingCurrency, reportingCurrency } = company.currencies;

    if (tradingCurrency !== valuationCurrency) {
      mergeRequiredPair(requiredMap, {
        fromCurrency: tradingCurrency,
        toCurrency: valuationCurrency,
        fxPair: pairCode(tradingCurrency, valuationCurrency),
        requiredByCompanyIds: [companyId],
        requiredByTickers: [ticker],
        purpose: "Current Price Conversion",
        priority: 1,
        reviewReason:
          "Trading currency differs from valuation currency; current price conversion required.",
      });

      mergeRequiredPair(requiredMap, {
        fromCurrency: valuationCurrency,
        toCurrency: tradingCurrency,
        fxPair: pairCode(valuationCurrency, tradingCurrency),
        requiredByCompanyIds: [companyId],
        requiredByTickers: [ticker],
        purpose: "Reverse / Reference Conversion",
        priority: 2,
        reviewReason:
          "Reverse pair stored for reference and reverse conversion checks.",
        isReversePair: true,
        reverseOf: pairCode(tradingCurrency, valuationCurrency),
      });
    }

    if (reportingCurrency !== valuationCurrency) {
      mergeRequiredPair(requiredMap, {
        fromCurrency: reportingCurrency,
        toCurrency: valuationCurrency,
        fxPair: pairCode(reportingCurrency, valuationCurrency),
        requiredByCompanyIds: [companyId],
        requiredByTickers: [ticker],
        purpose: "Reporting Currency Review",
        priority: 2,
        reviewReason:
          "Reporting currency differs from valuation currency; currency review required until full conversion is built.",
      });

      mergeRequiredPair(requiredMap, {
        fromCurrency: valuationCurrency,
        toCurrency: reportingCurrency,
        fxPair: pairCode(valuationCurrency, reportingCurrency),
        requiredByCompanyIds: [companyId],
        requiredByTickers: [ticker],
        purpose: "Reverse / Reference Conversion",
        priority: 3,
        reviewReason:
          "Reverse reporting pair stored for reference and review workflows.",
        isReversePair: true,
        reverseOf: pairCode(reportingCurrency, valuationCurrency),
      });
    }
  }

  return Array.from(requiredMap.values()).sort((a, b) => {
    if (a.priority !== b.priority) {
      return a.priority - b.priority;
    }
    return a.fxPair.localeCompare(b.fxPair);
  });
}

async function loadCompaniesForRequiredPairs(): Promise<{
  companies: CompanyDataModel[];
  source: "firestore" | "mock";
}> {
  const db = getAdminDb();

  if (isFirebaseAdminConfigured() && db) {
    const snapshot = await db.collection(COLLECTIONS.companies).get();
    const companies = snapshot.docs.map((doc) => doc.data() as CompanyDataModel);
    if (companies.length > 0) {
      return { companies, source: "firestore" };
    }
  }

  return { companies: mockCompanies, source: "mock" };
}

export async function ensureRequiredFxPairsForCompanies(): Promise<EnsureRequiredFxPairsSummary> {
  const db = getAdminDb();

  if (!isFirebaseAdminConfigured() || !db) {
    return {
      ok: false,
      source: "mock",
      companiesEvaluated: 0,
      requiredPairsDerived: 0,
      created: 0,
      updated: 0,
      warnings: ["Firebase Admin not configured. Required FX pair ensure skipped."],
      error: "Firebase Admin unavailable.",
    };
  }

  try {
    const { companies, source } = await loadCompaniesForRequiredPairs();
    const requiredPairs = deriveRequiredFxPairsFromCompanies(companies);
    const existingSnapshot = await db.collection(COLLECTIONS.fxRates).get();
    const existingRows = new Map<string, FxPairRateRow>(
      existingSnapshot.docs.map((doc) => [doc.id, doc.data() as FxPairRateRow]),
    );

    let created = 0;
    let updated = 0;
    const now = new Date().toISOString();

    for (const required of requiredPairs) {
      const id = pairId(required.fromCurrency, required.toCurrency);
      const existing = existingRows.get(id);

      const mergedTickers = Array.from(
        new Set([...(existing?.requiredByTickers ?? []), ...required.requiredByTickers]),
      );

      const base: FxPairRateRow = existing ?? {
        id,
        fromCurrency: required.fromCurrency,
        toCurrency: required.toCurrency,
        fxPair: required.fxPair,
        liveFxRate: null,
        manualOverride: null,
        selectedFxRate: null,
        source: "Company Required Pair",
        lastUpdated: now,
        status: "Currency Review / Not Updated",
        notes: required.reviewReason,
      };

      const next: FxPairRateRow = {
        ...base,
        id,
        fromCurrency: required.fromCurrency,
        toCurrency: required.toCurrency,
        fxPair: required.fxPair,
        requiredByCompany: true,
        requiredByTickers: mergedTickers,
        purpose: required.purpose,
        priority: required.priority,
        status:
          base.manualOverride !== null
            ? "Manual Override"
            : base.liveFxRate !== null
              ? "OK"
              : "Currency Review / Not Updated",
        notes:
          base.manualOverride !== null
            ? "Manual override is authoritative."
            : required.reviewReason,
        selectedFxRate: getSelectedFxRate(base),
      };

      await db.collection(COLLECTIONS.fxRates).doc(id).set(
        { ...next, refreshedAt: Timestamp.fromDate(new Date()) },
        { merge: true },
      );

      if (existing) {
        updated += 1;
      } else {
        created += 1;
      }
    }

    const finalSnapshot = await db.collection(COLLECTIONS.fxRates).get();
    await writeFxRatesCache(finalSnapshot.docs.map((item) => item.data() as FxPairRateRow));

    return {
      ok: true,
      source,
      companiesEvaluated: companies.length,
      requiredPairsDerived: requiredPairs.length,
      created,
      updated,
      warnings: [],
    };
  } catch (error) {
    return {
      ok: false,
      source: "mock",
      companiesEvaluated: 0,
      requiredPairsDerived: 0,
      created: 0,
      updated: 0,
      warnings: [],
      error: error instanceof Error ? error.message : "Unknown required FX pair ensure error.",
    };
  }
}

export function runRequiredFxPairQaCheck() {
  const qaCompanies = [
    {
      identity: { cleanTicker: "QA-CHF" },
      currencies: {
        valuationCurrency: "USD",
        tradingCurrency: "CHF",
        reportingCurrency: "USD",
      },
    },
    {
      identity: { cleanTicker: "QA-SEK" },
      currencies: {
        valuationCurrency: "USD",
        tradingCurrency: "USD",
        reportingCurrency: "SEK",
      },
    },
    {
      identity: { cleanTicker: "QA-SAME" },
      currencies: {
        valuationCurrency: "USD",
        tradingCurrency: "USD",
        reportingCurrency: "USD",
      },
    },
  ] as unknown as CompanyDataModel[];

  const required = deriveRequiredFxPairsFromCompanies(qaCompanies);
  const pairs = new Set(required.map((item) => item.fxPair));

  return {
    totalRequiredPairs: required.length,
    hasChfUsd: pairs.has("CHFUSD"),
    hasUsdChf: pairs.has("USDCHF"),
    hasSekUsd: pairs.has("SEKUSD"),
    hasUsdSek: pairs.has("USDSEK"),
    hasNoSameCurrencyExternalPair:
      !pairs.has("USDUSD") && !pairs.has("CHFCHF") && !pairs.has("SEKSEK"),
  };
}
