import "server-only";

import type { CompanyDataModel } from "@/lib/types/company";
import {
  buildMarketOverlayFingerprint,
  buildValuationFoundationFingerprint,
} from "@/lib/engines/company-foundation/companyFoundationFingerprint";
import type {
  FoundationBundleCacheStore,
  FoundationCacheEvent,
  GetCachedCompanyFoundationBundleOptions,
} from "@/lib/engines/company-foundation/companyFoundationCacheTypes";
import { InMemoryFoundationBundleCacheStore } from "@/lib/engines/company-foundation/companyFoundationCacheStore";
import {
  computeCompanyFoundationBundle,
  computeMarketDecisionOverlay,
  computeValuationFoundationBundle,
} from "@/lib/engines/company-foundation/companyFoundationService";
import type { CompanyFoundationBundleResult } from "@/lib/engines/company-foundation/companyFoundationTypes";
import { resolveFoundationBundleCompanies } from "@/lib/company-workspace/resolveFoundationBundleCompanies";
import { resolveFoundationReferenceDataStamp } from "@/lib/engines/company-foundation/foundationReferenceStamp";

const globalStore = new InMemoryFoundationBundleCacheStore();

function isFoundationCacheDisabled(): boolean {
  return process.env.COMPANY_FOUNDATION_CACHE_DISABLED === "1";
}

function shouldBypassCache(options?: GetCachedCompanyFoundationBundleOptions): boolean {
  return Boolean(options?.refresh) || isFoundationCacheDisabled();
}

function logFoundationCache(
  event: FoundationCacheEvent,
  companyId: string,
  reason: string,
  totalMs: number,
): void {
  const enabled =
    process.env.NODE_ENV === "development" ||
    process.env.COMPANY_FOUNDATION_CACHE_LOG === "1" ||
    process.env.COMPANY_FOUNDATION_TIMING === "1";

  if (!enabled) return;

  console.info("[foundation-cache]", {
    event,
    companyId,
    reason,
    totalMs,
  });
}

function getStore(): FoundationBundleCacheStore {
  return globalStore;
}

export function getFoundationBundleCacheStore(): FoundationBundleCacheStore {
  return getStore();
}

export function clearFoundationBundleCache(): void {
  getStore().clear();
}

export async function getCachedCompanyFoundationBundle(
  company: CompanyDataModel,
  options?: GetCachedCompanyFoundationBundleOptions,
): Promise<CompanyFoundationBundleResult> {
  const companyId = company.identity.cleanTicker;
  const selectedBenchmark = company.identity.damodaranIndustrialBenchmark ?? "";

  if (!selectedBenchmark.trim()) {
    return computeCompanyFoundationBundle(company);
  }

  const { baseCompany, marketOverlayCompany } = await resolveFoundationBundleCompanies(company);

  const referenceDataStamp =
    options?.referenceDataStamp ?? (await resolveFoundationReferenceDataStamp());
  const valuationFingerprint = buildValuationFoundationFingerprint(
    baseCompany,
    referenceDataStamp,
  );
  const marketFingerprint = buildMarketOverlayFingerprint(marketOverlayCompany);

  if (shouldBypassCache(options)) {
    const start = performance.now();
    const valuationBundle = await computeValuationFoundationBundle(baseCompany);
    const mosDecision = await computeMarketDecisionOverlay(marketOverlayCompany, valuationBundle);
    const bundle: CompanyFoundationBundleResult = { ...valuationBundle, mosDecision };
    const totalMs = Math.round((performance.now() - start) * 100) / 100;

    getStore().set({
      companyId,
      valuationFingerprint,
      marketFingerprint,
      valuationBundle: {
        betaPolicy: bundle.betaPolicy,
        wacc: bundle.wacc,
        forecastFade: bundle.forecastFade,
        reinvestmentFcff: bundle.reinvestmentFcff,
        terminalValue: bundle.terminalValue,
        dcfPv: bundle.dcfPv,
        equityBridge: bundle.equityBridge,
        intrinsicValue: bundle.intrinsicValue,
      },
      fullBundle: bundle,
      cachedAtMs: Date.now(),
    });

    logFoundationCache(
      "BYPASS",
      companyId,
      options?.refresh ? "refresh=1" : "cache disabled",
      totalMs,
    );
    return bundle;
  }

  const cached = getStore().get(companyId);
  const start = performance.now();

  if (!cached) {
    const valuationBundle = await computeValuationFoundationBundle(baseCompany);
    const mosDecision = await computeMarketDecisionOverlay(marketOverlayCompany, valuationBundle);
    const bundle: CompanyFoundationBundleResult = { ...valuationBundle, mosDecision };
    const totalMs = Math.round((performance.now() - start) * 100) / 100;

    getStore().set({
      companyId,
      valuationFingerprint,
      marketFingerprint,
      valuationBundle: {
        betaPolicy: bundle.betaPolicy,
        wacc: bundle.wacc,
        forecastFade: bundle.forecastFade,
        reinvestmentFcff: bundle.reinvestmentFcff,
        terminalValue: bundle.terminalValue,
        dcfPv: bundle.dcfPv,
        equityBridge: bundle.equityBridge,
        intrinsicValue: bundle.intrinsicValue,
      },
      fullBundle: bundle,
      cachedAtMs: Date.now(),
    });

    logFoundationCache("MISS", companyId, "no cache entry", totalMs);
    return bundle;
  }

  const valuationMatch = cached.valuationFingerprint === valuationFingerprint;
  const marketMatch = cached.marketFingerprint === marketFingerprint;

  if (valuationMatch && marketMatch) {
    const totalMs = Math.round((performance.now() - start) * 100) / 100;
    logFoundationCache("HIT", companyId, "valuation and market fingerprints match", totalMs);
    return cached.fullBundle;
  }

  if (valuationMatch && !marketMatch) {
    const mosDecision = await computeMarketDecisionOverlay(
      marketOverlayCompany,
      cached.valuationBundle,
    );
    const fullBundle: CompanyFoundationBundleResult = {
      ...cached.valuationBundle,
      mosDecision,
      timingMs: cached.fullBundle.timingMs,
      totalMs: cached.fullBundle.totalMs,
    };

    getStore().set({
      ...cached,
      marketFingerprint,
      fullBundle,
      cachedAtMs: Date.now(),
    });

    const totalMs = Math.round((performance.now() - start) * 100) / 100;
    logFoundationCache("STALE", companyId, "market overlay only", totalMs);
    return fullBundle;
  }

  const valuationBundle = await computeValuationFoundationBundle(baseCompany);
  const mosDecision = await computeMarketDecisionOverlay(marketOverlayCompany, valuationBundle);
  const fullBundle: CompanyFoundationBundleResult = {
    ...valuationBundle,
    mosDecision,
  };

  getStore().set({
    companyId,
    valuationFingerprint,
    marketFingerprint,
    valuationBundle,
    fullBundle,
    cachedAtMs: Date.now(),
  });

  const totalMs = Math.round((performance.now() - start) * 100) / 100;
  logFoundationCache(
    "STALE",
    companyId,
    valuationMatch ? "unexpected valuation branch" : "valuation fingerprint changed",
    totalMs,
  );
  return fullBundle;
}
