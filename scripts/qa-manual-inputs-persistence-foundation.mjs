/**
 * Manual Inputs Persistence Foundation QA — run:
 * node scripts/qa-manual-inputs-persistence-foundation.mjs
 */
import { mockCompanies } from "../lib/mock-companies.ts";
import { buildManualInputsWorkspaceModel } from "../lib/company-workspace/manualInputsWorkspaceModel.ts";
import {
  pruneEmptyOverrides,
  workspaceModelToSavePayload,
} from "../lib/company-workspace/manualInputsMapping.ts";
import { mergeStoredCompanyWithManualInputs } from "../lib/company-workspace/mergeStoredCompanyWithManualInputs.ts";
import {
  parseOptionalFiniteNumber,
  sanitizeCompanyManualInputsSavePayload,
  sanitizeCurrencyCode,
} from "../lib/company-workspace/manualInputsValidation.ts";
import { buildValuationFoundationFingerprint } from "../lib/engines/company-foundation/companyFoundationFingerprint.ts";
import {
  buildManualInputsRevisionFingerprint,
  buildValuationFoundationFingerprintWithManualInputsRevision,
  shouldInvalidateFoundationCacheOnManualInputsSave,
} from "../lib/engines/company-foundation/manualInputsFingerprint.ts";
// manualInputsFingerprint uses ./stableSerialize.ts (Node ESM)
import {
  clearManualInputsMemoryStore,
  getManualInputsMemoryStore,
  writeManualInputsToMemory,
} from "../lib/company-workspace/manualInputsMemoryStore.ts";
import { COMPANY_MANUAL_INPUTS_SCHEMA_VERSION } from "../lib/types/company-manual-inputs.ts";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const REF_STAMP = "qa-manual-inputs-v1|mock";
const MSFT = mockCompanies.find((c) => c.identity.cleanTicker === "MSFT");
const DIS = mockCompanies.find((c) => c.identity.cleanTicker === "DIS");

if (!MSFT || !DIS) {
  throw new Error("Missing mock companies MSFT/DIS");
}

clearManualInputsMemoryStore();

// Payload build from workspace model
{
  const model = buildManualInputsWorkspaceModel(MSFT, {
    dataSource: "mock",
    benchmarkUniverse: ["Software (System & Application)"],
    ismSectorDisplay: "Information Technology",
    templateStatus: "Allowed",
  });
  const payload = workspaceModelToSavePayload(model);
  assert(payload.overrides.identity?.companyName === MSFT.identity.companyName, "identity name in payload");
  assert(
    payload.overrides.market?.marketCap !== undefined,
    "market cap absolute should be derived from millions field",
  );
}

// Numeric parsing
{
  const ok = parseOptionalFiniteNumber("0.0825", { fieldLabel: "MOS", allowPercentMagnitude: true });
  assert(ok.value === 0.0825 && !ok.error, "parse decimal");

  const bad = parseOptionalFiniteNumber("not-a-number", { fieldLabel: "Rate" });
  assert(bad.error, "invalid number should error");

  const empty = parseOptionalFiniteNumber("", { fieldLabel: "Rate" });
  assert(empty.value === undefined, "empty should omit");
}

// Currency validation
{
  const usd = sanitizeCurrencyCode("USD", "Valuation currency");
  assert(usd.value === "USD", "USD ok");

  const bad = sanitizeCurrencyCode("XXX", "Valuation currency");
  assert(bad.error, "unknown currency should error");
}

// Sanitize + prune
{
  const sanitized = sanitizeCompanyManualInputsSavePayload({
    overrides: {
      currencies: { valuationCurrency: "USD" },
      terminalValueInputs: { terminalGrowthRate: 0.03, terminalMethod: "Gordon Growth" },
      identity: { damodaranIndustrialBenchmark: "Software (System & Application)" },
    },
  });
  assert(sanitized.errors.length === 0, "valid payload should have no errors");
  const pruned = pruneEmptyOverrides(sanitized.payload.overrides);
  assert(pruned.currencies?.valuationCurrency === "USD", "currency preserved");
}

// Missing / invalid save payload
{
  const empty = sanitizeCompanyManualInputsSavePayload({ overrides: {} });
  assert(Object.keys(pruneEmptyOverrides(empty.payload.overrides)).length === 0, "empty overrides prune to {}");

  const invalid = sanitizeCompanyManualInputsSavePayload({
    overrides: { currencies: { valuationCurrency: "NOPE" } },
  });
  assert(invalid.errors.length > 0, "invalid currency should produce errors");
}

// Merge behavior
{
  const persisted = {
    schemaVersion: COMPANY_MANUAL_INPUTS_SCHEMA_VERSION,
    cleanTicker: "MSFT",
    savedAt: "2026-05-26T12:00:00.000Z",
    source: "user",
    wiringStatus: "market_overlay_wired",
    overrides: {
      terminalValueInputs: { terminalGrowthRate: 0.05 },
      market: { currentPrice: 999 },
    },
  };

  const merged = mergeStoredCompanyWithManualInputs(MSFT, persisted);
  assert(merged.terminalValueInputs.terminalGrowthRate === 0.05, "terminal override applied");
  assert(merged.marketInputs.currentPrice === 999, "price override applied");
  assert(MSFT.terminalValueInputs.terminalGrowthRate !== 0.05, "base mock must remain unchanged");
}

// Valuation fingerprint: base company used for engines (Part 1 boundary)
{
  const baseFp = buildValuationFoundationFingerprint(MSFT, REF_STAMP);
  const persisted = {
    schemaVersion: COMPANY_MANUAL_INPUTS_SCHEMA_VERSION,
    cleanTicker: "MSFT",
    savedAt: "2026-05-26T12:00:00.000Z",
    source: "user",
    wiringStatus: "market_overlay_wired",
    overrides: { terminalValueInputs: { terminalGrowthRate: 0.99 } },
  };
  const merged = mergeStoredCompanyWithManualInputs(MSFT, persisted);
  const mergedFp = buildValuationFoundationFingerprint(merged, REF_STAMP);

  assert(baseFp !== mergedFp, "merged company fingerprint differs when overrides change inputs");
  assert(
    baseFp === buildValuationFoundationFingerprint(MSFT, REF_STAMP),
    "base MSFT fingerprint stable — engines should keep using base company in Part 1",
  );
}

// Manual inputs revision fingerprint prep (future cache invalidation)
{
  const docA = {
    schemaVersion: COMPANY_MANUAL_INPUTS_SCHEMA_VERSION,
    cleanTicker: "MSFT",
    savedAt: "2026-05-26T12:00:00.000Z",
    source: "user",
    wiringStatus: "market_overlay_wired",
    overrides: { market: { currentPrice: 100 } },
  };
  const docB = { ...docA, overrides: { market: { currentPrice: 101 } } };
  const revA = buildManualInputsRevisionFingerprint(docA);
  const revB = buildManualInputsRevisionFingerprint(docB);
  assert(revA && revB && revA !== revB, "manual inputs revision should change when overrides change");

  const baseFp = buildValuationFoundationFingerprint(MSFT, REF_STAMP);
  const combined = buildValuationFoundationFingerprintWithManualInputsRevision(baseFp, revB);
  assert(combined !== baseFp, "combined fingerprint hook differs when revision included");
}

// Cache invalidation gate (Part 1 off)
{
  assert(
    shouldInvalidateFoundationCacheOnManualInputsSave("persistence_only") === false,
    "persistence_only must not invalidate cache",
  );
  assert(
    shouldInvalidateFoundationCacheOnManualInputsSave("engine_wired") === true,
    "engine_wired reserved for future invalidation",
  );
}

// In-memory repository round-trip (no valuation engine calls)
{
  const document = {
    schemaVersion: COMPANY_MANUAL_INPUTS_SCHEMA_VERSION,
    cleanTicker: "DIS",
    savedAt: new Date().toISOString(),
    source: "user",
    wiringStatus: "market_overlay_wired",
    overrides: {
      identity: { companyName: "Disney (manual inputs QA)" },
    },
  };
  writeManualInputsToMemory(document);
  const stored = getManualInputsMemoryStore().get("DIS");
  assert(stored?.overrides.identity?.companyName?.includes("QA"), "round-trip read from memory store");

  const mergedDis = mergeStoredCompanyWithManualInputs(DIS, stored);
  assert(
    mergedDis.identity.companyName.includes("QA"),
    "DIS merge picks persisted identity override",
  );
}

// Part 2A: workspace save path → memory → reload model (simulates API + page refresh)
{
  clearManualInputsMemoryStore();
  const model = buildManualInputsWorkspaceModel(MSFT, {
    dataSource: "mock",
    benchmarkUniverse: ["Software (System & Application)"],
    ismSectorDisplay: "Information Technology",
    templateStatus: "Allowed",
  });
  model.identity.companyName = "MSFT Saved Via Workspace QA";
  model.market.currentPrice = "555.55";

  const payload = workspaceModelToSavePayload(model);
  const sanitized = sanitizeCompanyManualInputsSavePayload(payload, {
    allowedBenchmarks: ["Software (System & Application)"],
  });
  assert(sanitized.errors.length === 0, "workspace save payload should sanitize");

  const document = {
    schemaVersion: COMPANY_MANUAL_INPUTS_SCHEMA_VERSION,
    cleanTicker: "MSFT",
    savedAt: new Date().toISOString(),
    source: "user",
    wiringStatus: "market_overlay_wired",
    overrides: pruneEmptyOverrides(sanitized.payload.overrides),
    validationWarnings: sanitized.warnings.length > 0 ? sanitized.warnings : undefined,
  };
  assert(
    shouldInvalidateFoundationCacheOnManualInputsSave(document.wiringStatus) === false,
    "save must not invalidate full valuation cache",
  );

  writeManualInputsToMemory(document);
  const stored = getManualInputsMemoryStore().get("MSFT");
  assert(stored?.overrides.identity?.companyName?.includes("QA"), "stored identity override");

  const merged = mergeStoredCompanyWithManualInputs(MSFT, stored);
  const reloadedModel = buildManualInputsWorkspaceModel(merged, {
    dataSource: "mock",
    benchmarkUniverse: ["Software (System & Application)"],
    ismSectorDisplay: "Information Technology",
    templateStatus: "Allowed",
    persistence: {
      hasPersistedOverrides: true,
      savedAt: stored.savedAt,
      loadSource: "memory",
      wiringStatus: "market_overlay_wired",
    },
  });
  assert(
    reloadedModel.identity.companyName === "MSFT Saved Via Workspace QA",
    "reloaded workspace model shows saved company name",
  );
  assert(reloadedModel.market.currentPrice === "555.55", "reloaded workspace model shows saved price string");

  // Valuation boundary: base mock unchanged; merged differs
  assert(
    MSFT.identity.companyName !== "MSFT Saved Via Workspace QA",
    "base MSFT mock must not mutate (valuation tab uses base company)",
  );
  assert(
    buildValuationFoundationFingerprint(MSFT, REF_STAMP) ===
      buildValuationFoundationFingerprint(MSFT, REF_STAMP),
    "valuation fingerprint stable on base company after manual inputs save",
  );
  assert(
    buildValuationFoundationFingerprint(merged, REF_STAMP) !==
      buildValuationFoundationFingerprint(MSFT, REF_STAMP),
    "merged company fingerprint differs (inputs tab only until engine_wired)",
  );
}

// Part 2A: invalid save blocked
{
  const invalid = sanitizeCompanyManualInputsSavePayload({
    overrides: {
      currencies: { valuationCurrency: "NOT_A_CURRENCY" },
      terminalValueInputs: { terminalMethod: "Invalid Method" },
    },
  });
  assert(invalid.errors.length >= 2, "invalid currency and terminal method should error");
}

console.log("qa-manual-inputs-persistence-foundation: all assertions passed (Part 1 + Part 2A)");

