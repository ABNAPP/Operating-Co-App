import "server-only";
import fs from "node:fs/promises";
import path from "node:path";
import type {
  BenchmarkDataPullKeyRow,
  DamodaranIndustryUniverseRow,
  IndustryBenchmarkConfigTableRow,
  IndustryBenchmarkConfigV15Tables,
  IndustryBenchmarkHeaderRow,
  IndustryBenchmarkRuleRow,
  IndustryBenchmarkStatusValueRow,
  IndustryISMDisplayMapTableRow,
} from "@/lib/types";

export const INDUSTRY_BENCHMARK_V15_SOURCE_FILE = path.join(
  process.cwd(),
  "data",
  "spec",
  "Operating_Co_Template_Master_Specification_v1_5.txt",
);

const SECTION_START = "20. Industry Benchmark Config";
const SECTION_END = "21. Terminal Value";
const DISPLAY_ONLY_TEXT = "Display only - no model-driving effect";

function makeId(prefix: string, value: string, index: number) {
  const normalized = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${prefix}_${normalized || "row"}_${index + 1}`;
}

function extractSection(fullText: string) {
  const candidateStarts: number[] = [];
  let searchOffset = 0;
  while (searchOffset < fullText.length) {
    const found = fullText.indexOf(SECTION_START, searchOffset);
    if (found < 0) {
      break;
    }
    candidateStarts.push(found);
    searchOffset = found + SECTION_START.length;
  }

  if (candidateStarts.length === 0) {
    throw new Error(`Section not found: ${SECTION_START}`);
  }

  for (const start of candidateStarts) {
    const end = fullText.indexOf(SECTION_END, start + SECTION_START.length);
    if (end < 0) {
      continue;
    }
    const candidate = fullText.slice(start, end);
    if (
      candidate.includes("Table - tblIndustryBenchmarkConfig") &&
      candidate.includes("Table - tblIndustryISMDisplayMap") &&
      candidate.includes("Table - tblBenchmarkDataPullKeys")
    ) {
      return candidate;
    }
  }

  throw new Error(
    "Section boundary resolution failed for Industry Benchmark Config (required table markers not found).",
  );
}

function tokenize(text: string) {
  return text
    .split(/[\t\r\n]+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 0);
}

function findHeaderIndex(tokens: string[], headers: string[]) {
  for (let i = 0; i <= tokens.length - headers.length; i += 1) {
    let match = true;
    for (let j = 0; j < headers.length; j += 1) {
      if (tokens[i + j] !== headers[j]) {
        match = false;
        break;
      }
    }
    if (match) {
      return i;
    }
  }
  return -1;
}

function extractTableBlock(sectionText: string, heading: string, requiredTableName: string) {
  const marker = `Table - ${heading}`;
  const start = sectionText.indexOf(marker);
  if (start < 0) {
    throw new Error(`Required table cannot be parsed: ${requiredTableName} (missing heading)`);
  }
  const afterStart = start + marker.length;
  const remaining = sectionText.slice(afterStart);
  const nextHeadingOffset = remaining.search(/[\r\n]\s*Table - /);
  if (nextHeadingOffset < 0) {
    return remaining;
  }
  return remaining.slice(0, nextHeadingOffset);
}

function parseTableRows(
  sectionText: string,
  heading: string,
  headers: string[],
  requiredTableName: string,
) {
  const block = extractTableBlock(sectionText, heading, requiredTableName);
  const tokens = tokenize(block);
  const headerIndex = findHeaderIndex(tokens, headers);
  if (headerIndex < 0) {
    throw new Error(`Required table cannot be parsed: ${requiredTableName} (header mismatch)`);
  }
  const values = tokens.slice(headerIndex + headers.length);
  if (values.length === 0) {
    throw new Error(`Required table cannot be parsed: ${requiredTableName} (no row values)`);
  }
  if (values.length % headers.length !== 0) {
    throw new Error(
      `Required table cannot be parsed: ${requiredTableName} (value count mismatch: ${values.length})`,
    );
  }
  const rows: string[][] = [];
  for (let i = 0; i < values.length; i += headers.length) {
    rows.push(values.slice(i, i + headers.length));
  }
  return rows;
}

function parseSectionPurposeMap(sectionText: string) {
  const headers = ["Section", "Purpose"];
  const rows = parseTableRows(
    sectionText,
    "Industry Benchmark Config Sheet Sections",
    headers,
    "Industry Benchmark Config Sheet Sections",
  );
  return new Map(rows.map((row) => [row[0], row[1]]));
}

function parseRulesTable(sectionText: string): IndustryBenchmarkRuleRow[] {
  const headers = ["Rule ID", "Rule", "Required Behavior"];
  const rows = parseTableRows(sectionText, "tblIndustryBenchmarkRules", headers, "tblIndustryBenchmarkRules");
  return rows.map((row, index) => ({
    id: makeId("tblindustrybenchmarkrules", row[0], index),
    tableName: "tblIndustryBenchmarkRules",
    ruleId: row[0],
    rule: row[1],
    requiredBehavior: row[2],
  }));
}

function parseConfigTable(sectionText: string): IndustryBenchmarkConfigTableRow[] {
  const headers = [
    "Damodaran Industrial Benchmark",
    "Template Status",
    "Default Stage Recommendation",
    "History Recommendation",
    "Cyclicality Flag",
    "Asset Intensity",
    "Regulatory Flag",
  ];
  const rows = parseTableRows(sectionText, "tblIndustryBenchmarkConfig", headers, "tblIndustryBenchmarkConfig");
  return rows.map((row, index) => ({
    id: makeId("tblindustrybenchmarkconfig", row[0], index),
    tableName: "tblIndustryBenchmarkConfig",
    damodaranIndustrialBenchmark: row[0],
    templateStatus: row[1],
    defaultStageRecommendation: row[2],
    historyRecommendation: row[3],
    cyclicalityFlag: row[4],
    assetIntensity: row[5],
    regulatoryFlag: row[6],
  }));
}

function parseIsmDisplayMap(sectionText: string): IndustryISMDisplayMapTableRow[] {
  const headers = ["Damodaran Industrial Benchmark", "ISM-sector Display", "Use"];
  const rows = parseTableRows(sectionText, "tblIndustryISMDisplayMap", headers, "tblIndustryISMDisplayMap");
  return rows.map((row, index) => ({
    id: makeId("tblindustryismdisplaymap", row[0], index),
    tableName: "tblIndustryISMDisplayMap",
    damodaranIndustrialBenchmark: row[0],
    ismSectorDisplay: row[1],
    use: row[2],
  }));
}

function parsePullKeys(sectionText: string): BenchmarkDataPullKeyRow[] {
  const headers = [
    "Damodaran Industrial Benchmark",
    "Beta Table Key",
    "Margin Table Key",
    "Reinvestment Table Key",
    "Working Capital Table Key",
    "Growth / ROC Table Key",
    "Tax Table Key",
  ];
  const rows = parseTableRows(sectionText, "tblBenchmarkDataPullKeys", headers, "tblBenchmarkDataPullKeys");
  return rows.map((row, index) => ({
    id: makeId("tblbenchmarkdatapullkeys", row[0], index),
    tableName: "tblBenchmarkDataPullKeys",
    damodaranIndustrialBenchmark: row[0],
    betaTableKey: row[1],
    marginTableKey: row[2],
    reinvestmentTableKey: row[3],
    workingCapitalTableKey: row[4],
    growthRocTableKey: row[5],
    taxTableKey: row[6],
  }));
}

function parseHeaderTable(
  sectionPurposeMap: Map<string, string>,
  sectionText: string,
): IndustryBenchmarkHeaderRow[] {
  const purpose = sectionPurposeMap.get("tblIndustryBenchmarkHeader");
  if (!purpose) {
    throw new Error("Required table cannot be parsed: tblIndustryBenchmarkHeader (missing section row)");
  }

  const status = sectionText.includes("must not mechanically determine intrinsic value.")
    ? "Working Draft"
    : "Unknown";

  return [
    {
      id: "tblindustrybenchmarkheader_v1_5",
      tableName: "tblIndustryBenchmarkHeader",
      sheetName: "Industry Benchmark Config",
      purpose,
      version: "v1.5",
      status,
    },
  ];
}

function parseUniverseTable(config: IndustryBenchmarkConfigTableRow[]): DamodaranIndustryUniverseRow[] {
  if (config.length === 0) {
    throw new Error("Required table cannot be parsed: tblDamodaranIndustryUniverse (config rows empty)");
  }
  return config.map((row, index) => ({
    id: makeId("tbldamodaranindustryuniverse", row.damodaranIndustrialBenchmark, index),
    tableName: "tblDamodaranIndustryUniverse",
    damodaranIndustrialBenchmark: row.damodaranIndustrialBenchmark,
  }));
}

function parseStatusValuesTable(
  config: IndustryBenchmarkConfigTableRow[],
): IndustryBenchmarkStatusValueRow[] {
  const uniqueStatuses = Array.from(new Set(config.map((row) => row.templateStatus)));
  if (uniqueStatuses.length === 0) {
    throw new Error(
      "Required table cannot be parsed: tblIndustryBenchmarkStatusValues (template statuses missing)",
    );
  }
  return uniqueStatuses.map((status, index) => ({
    id: makeId("tblindustrybenchmarkstatusvalues", status, index),
    tableName: "tblIndustryBenchmarkStatusValues",
    templateStatus: status,
    meaning: status,
  }));
}

function validateRequiredContent(tables: IndustryBenchmarkConfigV15Tables) {
  if (tables.header.length === 0) {
    throw new Error("Required table cannot be parsed: tblIndustryBenchmarkHeader");
  }
  if (tables.universe.length === 0) {
    throw new Error("Required table cannot be parsed: tblDamodaranIndustryUniverse");
  }
  if (tables.config.length === 0) {
    throw new Error("Required table cannot be parsed: tblIndustryBenchmarkConfig");
  }
  if (tables.pullKeys.length === 0) {
    throw new Error("Required table cannot be parsed: tblBenchmarkDataPullKeys");
  }
  if (tables.ismDisplayMap.length === 0) {
    throw new Error("Required table cannot be parsed: tblIndustryISMDisplayMap");
  }
  if (tables.rules.length === 0) {
    throw new Error("Required table cannot be parsed: tblIndustryBenchmarkRules");
  }
  if (tables.statusValues.length === 0) {
    throw new Error("Required table cannot be parsed: tblIndustryBenchmarkStatusValues");
  }

  const hasDisplayOnlyMarker = tables.ismDisplayMap.some((row) =>
    row.use.includes(DISPLAY_ONLY_TEXT),
  );
  if (!hasDisplayOnlyMarker) {
    throw new Error(
      "Required table cannot be parsed: tblIndustryISMDisplayMap (missing display-only marker)",
    );
  }
}

let memoized: { mtimeMs: number; parsed: IndustryBenchmarkConfigV15Tables } | null = null;

export async function parseExactIndustryBenchmarkConfigV15Tables(): Promise<IndustryBenchmarkConfigV15Tables> {
  const stat = await fs.stat(INDUSTRY_BENCHMARK_V15_SOURCE_FILE);
  if (memoized && memoized.mtimeMs === stat.mtimeMs) {
    return memoized.parsed;
  }

  const source = await fs.readFile(INDUSTRY_BENCHMARK_V15_SOURCE_FILE, "utf8");
  const sectionText = extractSection(source);

  const sectionPurposeMap = parseSectionPurposeMap(sectionText);
  const rules = parseRulesTable(sectionText);
  const config = parseConfigTable(sectionText);
  const pullKeys = parsePullKeys(sectionText);
  const ismDisplayMap = parseIsmDisplayMap(sectionText);
  const header = parseHeaderTable(sectionPurposeMap, sectionText);
  const universe = parseUniverseTable(config);
  const statusValues = parseStatusValuesTable(config);

  const parsed: IndustryBenchmarkConfigV15Tables = {
    header,
    universe,
    config,
    pullKeys,
    ismDisplayMap,
    rules,
    statusValues,
    sourceFilePath: INDUSTRY_BENCHMARK_V15_SOURCE_FILE,
  };

  validateRequiredContent(parsed);

  memoized = { mtimeMs: stat.mtimeMs, parsed };
  return parsed;
}
