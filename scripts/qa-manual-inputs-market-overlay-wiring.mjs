/**
 * Manual Inputs Market Overlay Wiring QA (Part 2B-2) — run:
 * node scripts/qa-manual-inputs-market-overlay-wiring.mjs
 */
import { mockCompanies } from "../lib/mock-companies.ts";
import { buildMarketOverlayFingerprint, buildValuationFoundationFingerprint } from "../lib/engines/company-foundation/companyFoundationFingerprint.ts";
import {
  shouldInvalidateFoundationCacheOnManualInputsSave,
  shouldRecomputeMarketOverlayOnlyOnManualInputsSave,
} from "../lib/engines/company-foundation/manualInputsFingerprint.ts";
import { mergeMarketOverlayManualInputs } from "../lib/company-workspace/mergeMarketOverlayManualInputs.ts";
import { mergeStoredCompanyWithManualInputs } from "../lib/company-workspace/mergeStoredCompanyWithManualInputs.ts";
import {
  getMarketOverlayWiredContractFields,
  isManualInputMarketOverlayWired,
} from "../lib/company-workspace/manualInputsEngineWiringContract.ts";
import { computeMosDecisionFromInput } from "../lib/engines/mos-decision/mosDecisionMath.ts";
import { COMPANY_MANUAL_INPUTS_SCHEMA_VERSION } from "../lib/types/company-manual-inputs.ts";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const REF_STAMP = "qa-market-overlay-v2|mock";
const MSFT = mockCompanies.find((c) => c.identity.cleanTicker === "MSFT");
const DIS = mockCompanies.find((c) => c.identity.cleanTicker === "DIS");
const VOLV_B = mockCompanies.find((c) => c.identity.cleanTicker === "VOLV-B");

if (!MSFT || !DIS || !VOLV_B) throw new Error("Missing mock companies");

// Contract: exactly two market_overlay_wired fields
{
  const wired = getMarketOverlayWiredContractFields();
  assert(wired.length === 2, "two market overlay wired fields");
  assert(
    isManualInputMarketOverlayWired("overrides.market.currentPrice"),
    "current price wired",
  );
  assert(
    isManualInputMarketOverlayWired("overrides.decisionLayerInputs.minimumMOSForApprove"),
    "required MOS wired",
  );
}

// Save gates
{
  assert(
    shouldInvalidateFoundationCacheOnManualInputsSave("market_overlay_wired") === false,
    "no full cache invalidation",
  );
  assert(
    shouldRecomputeMarketOverlayOnlyOnManualInputsSave("market_overlay_wired") === true,
    "market overlay recompute flag",
  );
  assert(
    shouldInvalidateFoundationCacheOnManualInputsSave("persistence_only") === false,
    "legacy persistence_only unchanged",
  );
}

// Overlay merge scopes only price + MOS
{
  const persisted = {
    schemaVersion: COMPANY_MANUAL_INPUTS_SCHEMA_VERSION,
    cleanTicker: "MSFT",
    savedAt: "2026-05-26T00:00:00.000Z",
    source: "user",
    wiringStatus: "market_overlay_wired",
    overrides: {
      market: { currentPrice: 100 },
      decisionLayerInputs: { minimumMOSForApprove: 0.12 },
      terminalValueInputs: { terminalGrowthRate: 0.99 },
    },
  };
  const overlay = mergeMarketOverlayManualInputs(MSFT, persisted);
  const fullMerge = mergeStoredCompanyWithManualInputs(MSFT, persisted);

  assert(overlay.marketInputs.currentPrice === 100, "overlay price applied");
  assert(overlay.decisionLayerInputs.minimumMOSForApprove === 0.12, "overlay MOS applied");
  assert(
    overlay.terminalValueInputs.terminalGrowthRate === MSFT.terminalValueInputs.terminalGrowthRate,
    "overlay must not merge terminal into valuation path",
  );
  assert(
    fullMerge.terminalValueInputs.terminalGrowthRate === 0.99,
    "full merge still applies terminal for Inputs tab display",
  );
}

// persistence_only does not activate overlay merge
{
  const legacy = {
    schemaVersion: COMPANY_MANUAL_INPUTS_SCHEMA_VERSION,
    cleanTicker: "MSFT",
    savedAt: "2026-05-26T00:00:00.000Z",
    source: "user",
    wiringStatus: "persistence_only",
    overrides: { market: { currentPrice: 1 } },
  };
  const overlay = mergeMarketOverlayManualInputs(MSFT, legacy);
  assert(overlay.marketInputs.currentPrice === MSFT.marketInputs.currentPrice, "legacy status skips overlay");
}

// Fingerprints: valuation stable, market changes on price-only edit
{
  const baseFp = buildValuationFoundationFingerprint(MSFT, REF_STAMP);
  const doc = {
    schemaVersion: COMPANY_MANUAL_INPUTS_SCHEMA_VERSION,
    cleanTicker: "MSFT",
    savedAt: "2026-05-26T00:00:00.000Z",
    source: "user",
    wiringStatus: "market_overlay_wired",
    overrides: { market: { currentPrice: MSFT.marketInputs.currentPrice + 50 } },
  };
  const overlay = mergeMarketOverlayManualInputs(MSFT, doc);
  assert(
    buildValuationFoundationFingerprint(MSFT, REF_STAMP) === baseFp,
    "valuation fingerprint unchanged on base company",
  );
  assert(
    buildMarketOverlayFingerprint(overlay) !== buildMarketOverlayFingerprint(MSFT),
    "market fingerprint changes when saved price changes",
  );
}

// MOS math: price changes MOS; intrinsic fixed
{
  const intrinsic = 200;
  const priceA = 100;
  const priceB = 150;
  const requiredMos = 0.08;

  const baseInput = {
    companyId: "MSFT",
    selectedBenchmark: "Software (System & Application)",
    intrinsicValuePerShare: intrinsic,
    intrinsicValueCurrency: "USD",
    intrinsicStatus: "Ready",
    currentSharePrice: priceA,
    priceCurrency: "USD",
    fxRateToValuationCurrency: 1,
    requiredMOS: requiredMos,
    requiredMOSSource: "test",
    sourceNotes: [],
  };

  const mosA = computeMosDecisionFromInput(baseInput);
  const mosB = computeMosDecisionFromInput({ ...baseInput, currentSharePrice: priceB });

  assert(mosA.marginOfSafetyPercent !== mosB.marginOfSafetyPercent, "MOS changes when price changes");
  assert(mosA.entryPrice === mosB.entryPrice, "entry price unchanged when only current price changes");
  assert(mosA.entryPrice === intrinsic * (1 - requiredMos), "entry price from intrinsic only");
  assert(mosA.decisionOutcome !== null, "MSFT MOS outcome computed");
}

// DIS: missing intrinsic => Missing (simulate)
{
  const disMos = computeMosDecisionFromInput({
    companyId: "DIS",
    selectedBenchmark: "Entertainment",
    intrinsicValuePerShare: null,
    intrinsicValueCurrency: "USD",
    intrinsicStatus: "Missing",
    currentSharePrice: 50,
    priceCurrency: "USD",
    fxRateToValuationCurrency: 1,
    requiredMOS: 0.08,
    requiredMOSSource: "test",
    sourceNotes: [],
  });
  assert(disMos.status === "Missing", "DIS missing intrinsic => Missing MOS status");
  assert(disMos.decisionOutcome === null, "DIS no decision outcome");
}

// Saved terminal on market_overlay_wired doc must not affect overlay (valuation path uses base)
{
  const persisted = {
    schemaVersion: COMPANY_MANUAL_INPUTS_SCHEMA_VERSION,
    cleanTicker: "MSFT",
    savedAt: "2026-05-26T00:00:00.000Z",
    source: "user",
    wiringStatus: "market_overlay_wired",
    overrides: {
      terminalValueInputs: { terminalGrowthRate: (MSFT.terminalValueInputs.terminalGrowthRate ?? 0) + 0.05 },
    },
  };
  const overlay = mergeMarketOverlayManualInputs(MSFT, persisted);
  const full = mergeStoredCompanyWithManualInputs(MSFT, persisted);
  assert(
    buildValuationFoundationFingerprint(MSFT, REF_STAMP) ===
      buildValuationFoundationFingerprint(overlay, REF_STAMP),
    "overlay merge must not change valuation fingerprint",
  );
  assert(
    buildValuationFoundationFingerprint(MSFT, REF_STAMP) !==
      buildValuationFoundationFingerprint(full, REF_STAMP),
    "full merge still changes FP — foundation cache must use baseCompany not full merge",
  );
}

console.log("qa-manual-inputs-market-overlay-wiring: all assertions passed");
