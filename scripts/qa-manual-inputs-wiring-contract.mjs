/**
 * Manual Inputs Engine Wiring Contract QA — run:
 * node scripts/qa-manual-inputs-wiring-contract.mjs
 */
import { mockCompanies } from "../lib/mock-companies.ts";
import { buildValuationFoundationFingerprint } from "../lib/engines/company-foundation/companyFoundationFingerprint.ts";
import { shouldInvalidateFoundationCacheOnManualInputsSave } from "../lib/engines/company-foundation/manualInputsFingerprint.ts";
import { mergeStoredCompanyWithManualInputs } from "../lib/company-workspace/mergeStoredCompanyWithManualInputs.ts";
import {
  getManualInputWiringContract,
  isManualInputAllowedForFutureEngineWiring,
  MANUAL_INPUTS_PERSISTED_OVERRIDE_KEYS,
  MANUAL_INPUTS_WORKSPACE_LEAF_PATHS,
  resolveWorkspacePathToContractFieldKey,
} from "../lib/company-workspace/manualInputsEngineWiringContract.ts";
import { COMPANY_MANUAL_INPUTS_SCHEMA_VERSION } from "../lib/types/company-manual-inputs.ts";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const REF_STAMP = "qa-wiring-contract-v1|mock";
const MSFT = mockCompanies.find((c) => c.identity.cleanTicker === "MSFT");
if (!MSFT) throw new Error("Missing MSFT mock");

const contract = getManualInputWiringContract();

// Contract field status: only market overlay wired; others not_wired_yet
{
  const marketWired = contract.filter((f) => f.status === "market_overlay_wired");
  const notWired = contract.filter((f) => f.status === "not_wired_yet");
  assert(marketWired.length === 2, "exactly two market_overlay_wired fields");
  assert(notWired.length === contract.length - 2, "remaining fields not_wired_yet");
  for (const field of contract) {
    assert(
      field.invalidatesValuationCacheWhenSaved === false,
      `${field.fieldKey} must not invalidate valuation cache`,
    );
  }
}

// Persisted override keys from save payload are in contract
{
  for (const key of MANUAL_INPUTS_PERSISTED_OVERRIDE_KEYS) {
    const entry = contract.find((f) => f.fieldKey === key);
    assert(entry, `persisted key missing from contract: ${key}`);
    assert(entry.persistable, `${key} must be persistable in contract`);
  }
}

// All workspace leaf paths resolve to a contract entry
{
  for (const path of MANUAL_INPUTS_WORKSPACE_LEAF_PATHS) {
    const resolved = resolveWorkspacePathToContractFieldKey(path);
    assert(resolved, `workspace path not covered by contract: ${path} -> ${resolved}`);
    const entry = contract.find((f) => f.fieldKey === resolved);
    assert(entry, `resolved contract key missing: ${resolved}`);
  }
}

// Helper: future allowlist
{
  assert(
    isManualInputAllowedForFutureEngineWiring("overrides.terminalValueInputs.terminalGrowthRate"),
    "terminal growth should be future-allowlisted",
  );
  assert(
    !isManualInputAllowedForFutureEngineWiring("overrides.identity.companyName"),
    "company name should not be future-allowlisted",
  );
  assert(
    !isManualInputAllowedForFutureEngineWiring("workspace.benchmark.ismSectorDisplay"),
    "ISM display must not be allowlisted",
  );
}

// Cache invalidation gate unchanged
{
  assert(
    shouldInvalidateFoundationCacheOnManualInputsSave("persistence_only") === false,
    "persistence_only must not invalidate foundation cache",
  );
}

// Valuation path: base company fingerprint stable; merged differs but engines use base (Part 2B-1)
{
  const persisted = {
    schemaVersion: COMPANY_MANUAL_INPUTS_SCHEMA_VERSION,
    cleanTicker: "MSFT",
    savedAt: "2026-05-26T00:00:00.000Z",
    source: "user",
    wiringStatus: "persistence_only",
    overrides: {
      terminalValueInputs: { terminalGrowthRate: 0.5 },
      market: { currentPrice: 1 },
    },
  };

  const merged = mergeStoredCompanyWithManualInputs(MSFT, persisted);
  const baseFp = buildValuationFoundationFingerprint(MSFT, REF_STAMP);
  const mergedFp = buildValuationFoundationFingerprint(merged, REF_STAMP);

  assert(baseFp !== mergedFp, "merged company would change fingerprint if used");
  assert(
    buildValuationFoundationFingerprint(MSFT, REF_STAMP) === baseFp,
    "valuation path must keep using base company (MSFT mock unchanged)",
  );
  assert(
    persisted.wiringStatus === "persistence_only",
    "saved document must remain persistence_only",
  );
}

// No engine_wired status in contract
{
  const engineWired = contract.filter((f) => f.status === "engine_wired");
  assert(engineWired.length === 0, "no engine_wired field status yet");
}

// Engine groups represented
{
  const groups = new Set(contract.map((f) => f.engineGroup));
  assert(groups.has("Beta / WACC"), "Beta / WACC group required");
  assert(groups.has("MOS / Decision Foundation"), "MOS group required");
  assert(groups.has("Notes only / display only"), "display-only group required");
}

console.log("qa-manual-inputs-wiring-contract: all assertions passed");
