/**
 * Foundation bundle cache QA — run: node scripts/qa-foundation-cache.mjs
 */
import { mockCompanies } from "../lib/mock-companies.ts";
import {
  buildMarketOverlayFingerprint,
  buildValuationFoundationFingerprint,
} from "../lib/engines/company-foundation/companyFoundationFingerprint.ts";
import { InMemoryFoundationBundleCacheStore } from "../lib/engines/company-foundation/companyFoundationCacheStore.ts";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const REF_STAMP = "qa-foundation-v1|mock";

const companies = {
  MSFT: mockCompanies.find((c) => c.identity.cleanTicker === "MSFT"),
  DIS: mockCompanies.find((c) => c.identity.cleanTicker === "DIS"),
  VOLV_B: mockCompanies.find((c) => c.identity.cleanTicker === "VOLV-B"),
};

if (!companies.MSFT || !companies.DIS || !companies.VOLV_B) {
  throw new Error("Missing mock companies MSFT/DIS/VOLV-B");
}

// Fingerprint stability for same company inputs.
{
  const fp1 = buildValuationFoundationFingerprint(companies.MSFT, REF_STAMP);
  const fp2 = buildValuationFoundationFingerprint(companies.MSFT, REF_STAMP);
  assert(fp1 === fp2, "MSFT valuation fingerprint should be stable");
}

// Market overlay changes when current price changes; valuation fingerprint unchanged.
{
  const valuationBefore = buildValuationFoundationFingerprint(companies.MSFT, REF_STAMP);
  const marketBefore = buildMarketOverlayFingerprint(companies.MSFT);

  const changed = {
    ...companies.MSFT,
    marketInputs: {
      ...companies.MSFT.marketInputs,
      currentPrice: companies.MSFT.marketInputs.currentPrice + 1,
    },
  };

  const valuationAfter = buildValuationFoundationFingerprint(changed, REF_STAMP);
  const marketAfter = buildMarketOverlayFingerprint(changed);

  assert(valuationBefore === valuationAfter, "Price change must not change valuation fingerprint");
  assert(marketBefore !== marketAfter, "Price change must change market overlay fingerprint");
}

// Valuation fingerprint changes when terminal inputs change.
{
  const before = buildValuationFoundationFingerprint(companies.MSFT, REF_STAMP);
  const changed = {
    ...companies.MSFT,
    terminalValueInputs: {
      ...companies.MSFT.terminalValueInputs,
      terminalGrowthRate: (companies.MSFT.terminalValueInputs.terminalGrowthRate ?? 0) + 0.001,
    },
  };
  const after = buildValuationFoundationFingerprint(changed, REF_STAMP);
  assert(before !== after, "Terminal input change must change valuation fingerprint");
}

// In-memory store HIT semantics (simulate cache layer without server-only service).
{
  const store = new InMemoryFoundationBundleCacheStore({ ttlMs: 60_000, maxEntries: 10 });
  const company = companies.MSFT;
  const companyId = company.identity.cleanTicker;
  const valuationFingerprint = buildValuationFoundationFingerprint(company, REF_STAMP);
  const marketFingerprint = buildMarketOverlayFingerprint(company);

  const fakeBundle = {
    betaPolicy: null,
    wacc: null,
    forecastFade: null,
    reinvestmentFcff: null,
    terminalValue: null,
    dcfPv: null,
    equityBridge: null,
    intrinsicValue: null,
    mosDecision: null,
    totalMs: 1,
  };

  store.set({
    companyId,
    valuationFingerprint,
    marketFingerprint,
    valuationBundle: {
      betaPolicy: null,
      wacc: null,
      forecastFade: null,
      reinvestmentFcff: null,
      terminalValue: null,
      dcfPv: null,
      equityBridge: null,
      intrinsicValue: null,
    },
    fullBundle: fakeBundle,
    cachedAtMs: Date.now(),
  });

  const hit = store.get(companyId);
  assert(hit !== undefined, "Expected cache HIT entry");
  assert(hit.valuationFingerprint === valuationFingerprint, "Cached valuation fingerprint must match");
  assert(hit.marketFingerprint === marketFingerprint, "Cached market fingerprint must match");
}

// STALE market: valuation match, market mismatch.
{
  const store = new InMemoryFoundationBundleCacheStore();
  const company = companies.VOLV_B;
  const companyId = company.identity.cleanTicker;
  const valuationFingerprint = buildValuationFoundationFingerprint(company, REF_STAMP);
  const oldMarketFingerprint = buildMarketOverlayFingerprint(company);

  store.set({
    companyId,
    valuationFingerprint,
    marketFingerprint: oldMarketFingerprint,
    valuationBundle: {
      betaPolicy: null,
      wacc: null,
      forecastFade: null,
      reinvestmentFcff: null,
      terminalValue: null,
      dcfPv: null,
      equityBridge: null,
      intrinsicValue: { input: {}, result: { status: "Review" } },
    },
    fullBundle: {
      betaPolicy: null,
      wacc: null,
      forecastFade: null,
      reinvestmentFcff: null,
      terminalValue: null,
      dcfPv: null,
      equityBridge: null,
      intrinsicValue: null,
      mosDecision: null,
    },
    cachedAtMs: Date.now(),
  });

  const changed = {
    ...company,
    marketInputs: { ...company.marketInputs, currentPrice: company.marketInputs.currentPrice + 5 },
  };
  const newMarketFingerprint = buildMarketOverlayFingerprint(changed);
  const cached = store.get(companyId);

  assert(cached !== undefined, "VOLV-B cache entry expected");
  assert(cached.valuationFingerprint === valuationFingerprint, "Valuation fingerprint should still match");
  assert(cached.marketFingerprint !== newMarketFingerprint, "Market fingerprint should be stale");
}

// DIS has benchmark — fingerprints should be buildable (Missing path is runtime, not fingerprint).
{
  const valuationFp = buildValuationFoundationFingerprint(companies.DIS, REF_STAMP);
  const marketFp = buildMarketOverlayFingerprint(companies.DIS);
  assert(typeof valuationFp === "string" && valuationFp.length > 10, "DIS valuation fingerprint expected");
  assert(typeof marketFp === "string" && marketFp.length > 10, "DIS market fingerprint expected");
}

// No Buy/Sell/Hold in fingerprint payloads.
{
  const serialized = buildValuationFoundationFingerprint(companies.MSFT, REF_STAMP).toLowerCase();
  assert(!serialized.includes("buy/sell/hold"), "Fingerprint must not include Buy/Sell/Hold");
  assert(!serialized.includes("gateway"), "Fingerprint must not include gateway");
  assert(!serialized.includes("shadow valuation"), "Fingerprint must not include shadow valuation");
}

console.log("qa-foundation-cache: all assertions passed");
