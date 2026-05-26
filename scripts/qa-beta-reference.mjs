/**
 * Local QA helper — run: node scripts/qa-beta-reference.mjs
 * Exercises beta row matching + field extraction against the Damodaran cache.
 */
import { readFileSync } from "node:fs";

const cache = JSON.parse(readFileSync("data/damodaran/cache/data-vault-cache.json", "utf8"));
const betaRows = cache.rawDatasetRows.filter((row) => row.datasetId === "damodaran_beta_global");

function norm(name) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function findRows(benchmark, key) {
  const exact = betaRows.filter(
    (row) => row.industryName === benchmark || row.industryName === key,
  );
  if (exact.length) {
    return { matchType: "Exact", rows: exact };
  }
  const n = norm(benchmark);
  const normalized = betaRows.filter(
    (row) => (row.normalizedIndustryName || norm(row.industryName)) === n,
  );
  if (normalized.length === 1) {
    return { matchType: "Normalized", rows: normalized };
  }
  if (normalized.length > 1) {
    return { matchType: "Review", rows: normalized };
  }
  return { matchType: "Missing", rows: [] };
}

function extract(row) {
  return {
    unlevered: row.values.column_6,
    levered: row.values.column_3,
    cashAdjusted: row.values.column_8,
    firms: row.values[Object.keys(row.values)[1]],
  };
}

const cases = [
  { company: "Microsoft", benchmark: "Software (System & Application)" },
  { company: "Disney", benchmark: "Entertainment" },
  { company: "Volvo", benchmark: "Auto & Truck" },
  { company: "Missing test", benchmark: "Nonexistent Industry XYZ" },
];

for (const testCase of cases) {
  const key = testCase.benchmark;
  const result = findRows(testCase.benchmark, key);
  const fields = result.rows[0] ? extract(result.rows[0]) : null;
  console.log(
    JSON.stringify({
      company: testCase.company,
      benchmark: testCase.benchmark,
      matchType: result.matchType,
      matched: result.rows.length > 0,
      fields,
    }),
  );
}
