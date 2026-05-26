import "server-only";
import type { BenchmarkDataPullKeyRow } from "@/lib/types";

export type DamodaranPullKeyField =
  | "betaTableKey"
  | "marginTableKey"
  | "rocRoicTableKey"
  | "reinvestmentSalesToCapitalTableKey"
  | "workingCapitalTableKey"
  | "taxTableKey"
  | "waccCostOfCapitalSanityKey"
  | "multiplesSanityKey";

export type DamodaranPullKeyMappingStatus =
  | "Ready"
  | "Partial"
  | "Missing"
  | "Sanity Only"
  | "Review";

export interface DamodaranPullKeyDatasetTarget {
  datasetId: string;
  datasetName: string;
  tablePurpose: string;
  status: DamodaranPullKeyMappingStatus;
  notes: string;
}

export interface DamodaranPullKeyResolution {
  keyName: DamodaranPullKeyField;
  benchmarkName: string;
  keyValue: string | null;
  datasetId: string | null;
  datasetName: string | null;
  tablePurpose: string;
  status: DamodaranPullKeyMappingStatus;
  notes: string;
  targets: DamodaranPullKeyDatasetTarget[];
}

const KEY_TYPE_TARGETS: Record<
  DamodaranPullKeyField,
  Omit<DamodaranPullKeyDatasetTarget, "status" | "notes">[]
> = {
  betaTableKey: [
    {
      datasetId: "damodaran_beta_global",
      datasetName: "Global Industry Beta",
      tablePurpose: "tblDamodaranIndustryBeta — industry beta support",
    },
  ],
  marginTableKey: [
    {
      datasetId: "damodaran_margin_global",
      datasetName: "Global Margins",
      tablePurpose: "tblDamodaranIndustryMargins — margin benchmarks",
    },
  ],
  rocRoicTableKey: [
    {
      datasetId: "damodaran_fundgr_eb_global",
      datasetName: "Global Fundamental Growth (EBIT)",
      tablePurpose: "tblDamodaranIndustryGrowth — partial ROC/ROIC via EBIT growth",
    },
    {
      datasetId: "damodaran_pbv_global",
      datasetName: "Global PBV Multiples",
      tablePurpose: "tblDamodaranIndustryROIC — partial / review via PBV-ROIC fields",
    },
  ],
  reinvestmentSalesToCapitalTableKey: [
    {
      datasetId: "damodaran_capex_global",
      datasetName: "Global Capital Expenditures",
      tablePurpose: "tblDamodaranIndustryCapexReinvestment — reinvestment & sales-to-capital",
    },
  ],
  workingCapitalTableKey: [
    {
      datasetId: "damodaran_wcdata_global",
      datasetName: "Global Working Capital",
      tablePurpose: "tblDamodaranIndustryWorkingCapital — WC ratios",
    },
  ],
  taxTableKey: [
    {
      datasetId: "damodaran_taxrate_global",
      datasetName: "Global Industry Tax Rates",
      tablePurpose: "tblDamodaranIndustryTaxRates — industry tax benchmarks",
    },
  ],
  waccCostOfCapitalSanityKey: [
    {
      datasetId: "damodaran_wacc_global",
      datasetName: "Global Industry Cost of Capital",
      tablePurpose: "tblDamodaranIndustryCostOfCapital — WACC sanity reference only",
    },
  ],
  multiplesSanityKey: [
    {
      datasetId: "damodaran_pe_global",
      datasetName: "Global PE Multiples",
      tablePurpose: "tblDamodaranIndustryPricingMultiples — PE sanity only",
    },
    {
      datasetId: "damodaran_ps_global",
      datasetName: "Global Price/Sales Multiples",
      tablePurpose: "tblDamodaranIndustryPricingMultiples — PS sanity only",
    },
    {
      datasetId: "damodaran_vebitda_global",
      datasetName: "Global EV/EBITDA Multiples",
      tablePurpose: "tblDamodaranIndustryPricingMultiples — EV/EBITDA sanity only",
    },
    {
      datasetId: "damodaran_pbv_global",
      datasetName: "Global PBV Multiples",
      tablePurpose: "tblDamodaranIndustryPricingMultiples — PBV sanity only",
    },
    {
      datasetId: "damodaran_ev_data_global",
      datasetName: "Enterprise Value Multiples",
      tablePurpose: "tblDamodaranIndustryPricingMultiples — EV multiples (deferred)",
    },
  ],
};

function isReferenceOnlyKey(value: string | null | undefined) {
  if (!value) return false;
  return value.trim().toLowerCase().includes("reference only");
}

function resolveKeyStatus(
  keyName: DamodaranPullKeyField,
  keyValue: string | null,
  targets: DamodaranPullKeyDatasetTarget[],
): DamodaranPullKeyMappingStatus {
  if (!keyValue?.trim()) {
    return "Missing";
  }
  if (isReferenceOnlyKey(keyValue)) {
    return "Review";
  }
  if (keyName === "multiplesSanityKey") {
    const hasDeferredOnly =
      targets.length > 0 &&
      targets.every((target) => target.datasetId === "damodaran_ev_data_global");
    return hasDeferredOnly ? "Missing" : "Sanity Only";
  }
  if (keyName === "rocRoicTableKey") {
    return "Partial";
  }
  if (targets.length === 0) {
    return "Missing";
  }
  return "Ready";
}

function buildTargets(
  keyName: DamodaranPullKeyField,
  keyValue: string | null,
): DamodaranPullKeyDatasetTarget[] {
  const baseTargets = KEY_TYPE_TARGETS[keyName];
  const status = resolveKeyStatus(keyName, keyValue, []);

  return baseTargets.map((target) => {
    let targetStatus: DamodaranPullKeyMappingStatus = status;
    let notes = "Static registry mapping — numeric row lookup is a later Beta/WACC phase.";

    if (target.datasetId === "damodaran_ev_data_global") {
      targetStatus = "Missing";
      notes = "EV multiples raw file not present — deferred.";
    } else if (keyName === "rocRoicTableKey" && target.datasetId === "damodaran_pbv_global") {
      targetStatus = "Partial";
      notes = "Partial ROIC support via PBV table; dedicated tblDamodaranIndustryROIC file not imported.";
    } else if (keyName === "multiplesSanityKey") {
      targetStatus = "Sanity Only";
      notes = "Pricing sanity only — must not feed official intrinsic value.";
    } else if (keyName === "waccCostOfCapitalSanityKey") {
      targetStatus = "Ready";
      notes = "WACC sanity reference dataset — no WACC math in Data Hub.";
    } else if (!keyValue?.trim()) {
      targetStatus = "Missing";
      notes = "Pull key value is blank.";
    } else if (isReferenceOnlyKey(keyValue)) {
      targetStatus = "Review";
      notes = "Reference-only benchmark row — not a normal company industry selection.";
    } else {
      targetStatus = "Ready";
    }

    return { ...target, status: targetStatus, notes };
  });
}

export function resolveDamodaranPullKey(
  keyName: DamodaranPullKeyField,
  benchmarkName: string,
  keyValue: string | null,
): DamodaranPullKeyResolution {
  const targets = buildTargets(keyName, keyValue);
  const primary = targets[0] ?? null;
  const status = resolveKeyStatus(keyName, keyValue, targets);

  return {
    keyName,
    benchmarkName,
    keyValue,
    datasetId: primary?.datasetId ?? null,
    datasetName: primary?.datasetName ?? null,
    tablePurpose: primary?.tablePurpose ?? "Unmapped",
    status,
    notes:
      status === "Partial"
        ? "Partial mapping — review ROC/ROIC dataset split before Beta/WACC numeric extraction."
        : status === "Sanity Only"
          ? "Sanity-only pricing datasets — no valuation math."
          : "Key type mapped to Damodaran dataset registry. Benchmark row matching is a later phase.",
    targets,
  };
}

export function resolvePullKeysForBenchmarkRow(row: BenchmarkDataPullKeyRow): DamodaranPullKeyResolution[] {
  const benchmarkName = row.damodaranIndustrialBenchmark;
  return [
    resolveDamodaranPullKey("betaTableKey", benchmarkName, row.betaTableKey),
    resolveDamodaranPullKey("marginTableKey", benchmarkName, row.marginTableKey),
    resolveDamodaranPullKey(
      "reinvestmentSalesToCapitalTableKey",
      benchmarkName,
      row.reinvestmentTableKey,
    ),
    resolveDamodaranPullKey("workingCapitalTableKey", benchmarkName, row.workingCapitalTableKey),
    resolveDamodaranPullKey("rocRoicTableKey", benchmarkName, row.growthRocTableKey),
    resolveDamodaranPullKey("taxTableKey", benchmarkName, row.taxTableKey),
    resolveDamodaranPullKey("waccCostOfCapitalSanityKey", benchmarkName, benchmarkName),
    resolveDamodaranPullKey("multiplesSanityKey", benchmarkName, benchmarkName),
  ];
}

export interface DamodaranPullKeyResolverSummary {
  totalMappings: number;
  readyCount: number;
  partialCount: number;
  reviewCount: number;
  missingCount: number;
  sanityOnlyCount: number;
  resolutions: DamodaranPullKeyResolution[];
}

export function summarizePullKeyResolutions(
  pullKeyRows: BenchmarkDataPullKeyRow[],
): DamodaranPullKeyResolverSummary {
  const resolutions = pullKeyRows.flatMap((row) => resolvePullKeysForBenchmarkRow(row));
  return {
    totalMappings: resolutions.length,
    readyCount: resolutions.filter((item) => item.status === "Ready").length,
    partialCount: resolutions.filter((item) => item.status === "Partial").length,
    reviewCount: resolutions.filter((item) => item.status === "Review").length,
    missingCount: resolutions.filter((item) => item.status === "Missing").length,
    sanityOnlyCount: resolutions.filter((item) => item.status === "Sanity Only").length,
    resolutions,
  };
}
