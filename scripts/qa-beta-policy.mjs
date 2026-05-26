/**
 * Beta policy QA — run: node scripts/qa-beta-policy.mjs
 */
import { readFileSync } from "node:fs";
import {
  buildBetaPolicyInputFromReference,
  computeBetaPolicy,
  computeReleveredBeta,
  RELEVERING_FORMULA,
} from "../lib/engines/beta/betaPolicyMath.ts";

const cache = JSON.parse(readFileSync("data/damodaran/cache/data-vault-cache.json", "utf8"));

function mockLookup(benchmark) {
  const row = cache.rawDatasetRows.find(
    (item) =>
      item.datasetId === "damodaran_beta_global" && item.industryName === benchmark,
  );
  if (!row) {
    return {
      selectedBenchmark: benchmark,
      betaTableKey: benchmark,
      betaTableKeyMode: "benchmark-default",
      datasetId: "damodaran_beta_global",
      matched: false,
      matchType: "Missing",
      betaReference: null,
      warnings: [],
      errors: ["No beta row"],
    };
  }
  return {
    selectedBenchmark: benchmark,
    betaTableKey: benchmark,
    betaTableKeyMode: "benchmark-default",
    datasetId: "damodaran_beta_global",
    matched: true,
    matchType: "Exact",
    betaReference: {
      benchmarkName: benchmark,
      unleveredBeta: row.values.column_6,
      leveredBeta: row.values.column_3,
      cashAdjustedBeta: row.values.column_8,
      numberOfFirms: row.values[Object.keys(row.values)[1]],
      status: "Ready",
    },
    warnings: [],
    errors: [],
  };
}

function runCase(name, benchmark, capitalInputs) {
  const lookup = mockLookup(benchmark);
  const input = buildBetaPolicyInputFromReference(lookup, capitalInputs);
  const policy = computeBetaPolicy(input);
  console.log(
    JSON.stringify({
      case: name,
      benchmark,
      status: policy.status,
      selectedBeta: policy.selectedBeta,
      selectedLeveredBeta: policy.selectedLeveredBeta,
      source: policy.selectedBetaSource,
      warnings: policy.warnings,
      errors: policy.errors,
    }),
  );
}

runCase("Microsoft / Software", "Software (System & Application)", {
  marketDebtToEquity: 0.22,
  selectedTaxRate: 0.17,
});

runCase("Disney / Entertainment (missing D/E)", "Entertainment", {
  selectedTaxRate: 0.21,
});

runCase("Volvo / Auto & Truck", "Auto & Truck", {
  marketDebtToEquity: 0.45,
  selectedTaxRate: 0.21,
});

runCase("Manual override", "Software (System & Application)", {
  marketDebtToEquity: 0.22,
  selectedTaxRate: 0.17,
  useOverride: true,
  selectedBetaOverride: 1.15,
});

runCase("Nonexistent benchmark", "Nonexistent Industry XYZ", {});

const unlevered = 1.297449832337703;
const relevered = computeReleveredBeta(unlevered, 0.22, 0.17);
console.log(
  JSON.stringify({
    case: "Formula sanity",
    formula: RELEVERING_FORMULA,
    unlevered,
    relevered: Number(relevered.toFixed(4)),
  }),
);
