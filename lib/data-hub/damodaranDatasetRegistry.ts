import "server-only";
import type {
  DamodaranDatasetClassification,
  DamodaranDatasetPriority,
  DamodaranDatasetRegisterRow,
} from "@/lib/types";

export const DAMODARAN_SOURCE_NAME = "Damodaran Current Data";
export const DAMODARAN_SOURCE_URL =
  "https://pages.stern.nyu.edu/~adamodar/New_Home_Page/datacurrent.html";
export const DAMODARAN_SOURCE_UPDATE_DATE = "January 9, 2026";
export const DAMODARAN_COUNTRY_RISK_UPDATE_DATE = "January 5, 2026";

interface RegistrySeedInput {
  id: string;
  datasetName: string;
  workbookTableName: string;
  fileName: string;
  dataCategory: string;
  priority: DamodaranDatasetPriority;
  classification: DamodaranDatasetClassification;
  blocksCoreReadiness: boolean;
  pricingSanityOnly?: boolean;
  usedBy: string;
  notes: string;
  roicSupportNote?: string;
  sourceUpdateDate?: string;
  isDeferredPlaceholder?: boolean;
}

function buildRegistryRow(input: RegistrySeedInput): DamodaranDatasetRegisterRow {
  return {
    id: input.id,
    datasetName: input.datasetName,
    workbookTableName: input.workbookTableName,
    fileName: input.fileName,
    dataCategory: input.dataCategory,
    priority: input.priority,
    classification: input.classification,
    blocksCoreReadiness: input.blocksCoreReadiness,
    pricingSanityOnly: input.pricingSanityOnly ?? false,
    usedBy: input.usedBy,
    sourceName: DAMODARAN_SOURCE_NAME,
    sourceUrl: DAMODARAN_SOURCE_URL,
    downloadUrl: input.isDeferredPlaceholder
      ? DAMODARAN_SOURCE_URL
      : `https://pages.stern.nyu.edu/~adamodar/pc/datasets/${input.fileName}`,
    sourceUpdateDate: input.sourceUpdateDate ?? DAMODARAN_SOURCE_UPDATE_DATE,
    importedLastUpdated: null,
    importStatus: input.isDeferredPlaceholder ? "Missing / Deferred" : "Not Imported",
    rowCount: 0,
    industryCount: 0,
    notes: input.notes,
    roicSupportNote: input.roicSupportNote,
    isDeferredPlaceholder: input.isDeferredPlaceholder ?? false,
  };
}

const registryInputs: RegistrySeedInput[] = [
  {
    id: "damodaran_beta_global",
    datasetName: "Global Industry Beta",
    workbookTableName: "tblDamodaranIndustryBeta",
    fileName: "betaGlobal.xls",
    dataCategory: "Industry Beta",
    priority: "Core",
    classification: "Core Required",
    blocksCoreReadiness: true,
    usedBy: "Beta Engine, Risk/WACC (future)",
    notes: "Core beta benchmark reference table.",
  },
  {
    id: "damodaran_wacc_global",
    datasetName: "Global Industry Cost of Capital",
    workbookTableName: "tblDamodaranIndustryCostOfCapital",
    fileName: "waccGlobal.xls",
    dataCategory: "Industry Cost of Capital",
    priority: "Core",
    classification: "Core Required",
    blocksCoreReadiness: true,
    usedBy: "WACC sanity support (future)",
    notes: "Industry cost of capital reference; no WACC math calculated in Data Hub.",
  },
  {
    id: "damodaran_ratings",
    datasetName: "Ratings and Default Spreads",
    workbookTableName: "tblSyntheticRatingSpreads",
    fileName: "ratings.xls",
    dataCategory: "Ratings / Default Spreads / Interest Coverage",
    priority: "Core",
    classification: "Core Required",
    blocksCoreReadiness: true,
    usedBy: "Cost of Debt / synthetic rating (future)",
    notes:
      "Reference table for future Cost of Debt / synthetic rating support (tblRatingsSpreadsICR). No WACC math is calculated here.",
  },
  {
    id: "damodaran_capex_global",
    datasetName: "Global Capital Expenditures",
    workbookTableName: "tblDamodaranIndustryCapexReinvestment",
    fileName: "capexGlobal.xls",
    dataCategory: "Capital Expenditures / Reinvestment / Sales-to-Capital",
    priority: "Core",
    classification: "Core Required",
    blocksCoreReadiness: true,
    usedBy: "Reinvestment & FCFF, Forecast & Fade",
    notes: "Core reinvestment and sales-to-capital support.",
  },
  {
    id: "damodaran_wcdata_global",
    datasetName: "Global Working Capital",
    workbookTableName: "tblDamodaranIndustryWorkingCapital",
    fileName: "wcdataGlobal.xls",
    dataCategory: "Working Capital",
    priority: "Core",
    classification: "Core Required",
    blocksCoreReadiness: true,
    usedBy: "Reinvestment & FCFF, NWC checks",
    notes: "Working capital benchmark data by industry.",
  },
  {
    id: "damodaran_margin_global",
    datasetName: "Global Margins",
    workbookTableName: "tblDamodaranIndustryMargins",
    fileName: "marginGlobal.xls",
    dataCategory: "Margins",
    priority: "Core",
    classification: "Core Required",
    blocksCoreReadiness: true,
    usedBy: "Forecast & Fade, Terminal Value",
    notes: "Margin benchmark reference data.",
  },
  {
    id: "damodaran_fundgr_eb_global",
    datasetName: "Global Fundamental Growth (EBIT)",
    workbookTableName: "tblDamodaranIndustryGrowth",
    fileName: "fundgrEBGlobal.xls",
    dataCategory: "ROC / Reinvestment / Fundamental EBIT Growth",
    priority: "Core",
    classification: "Core Required",
    blocksCoreReadiness: true,
    roicSupportNote: "ROIC support: partial — shares ROC/ROIC fields with tblDamodaranIndustryROIC (no dedicated ROIC file).",
    usedBy: "Terminal Value, Reinvestment Discipline, ROC/ROIC support",
    notes: "Fundamental EBIT growth and partial ROC/ROIC support.",
  },
  {
    id: "damodaran_taxrate_global",
    datasetName: "Global Industry Tax Rates",
    workbookTableName: "tblDamodaranIndustryTaxRates",
    fileName: "taxrateGlobal.xls",
    dataCategory: "Industry Tax Rates",
    priority: "Core",
    classification: "Core Required",
    blocksCoreReadiness: true,
    usedBy: "NOPAT, Tax Review",
    notes: "Industry-level effective tax reference.",
  },
  {
    id: "damodaran_country_tax_rates",
    datasetName: "Country Tax Rates",
    workbookTableName: "tblCountryMarginalTaxRates",
    fileName: "countrytaxrates.xls",
    dataCategory: "Country Tax Rates",
    priority: "Core",
    classification: "Core Required",
    blocksCoreReadiness: true,
    usedBy: "Stable tax, Tax Review",
    notes: "Country marginal tax reference (not Country ERP).",
  },
  {
    id: "damodaran_debt_details_global",
    datasetName: "Global Debt Details",
    workbookTableName: "tblDamodaranIndustryDebt",
    fileName: "debtdetailsGlobal.xls",
    dataCategory: "Debt Details",
    priority: "Core Support",
    classification: "Core Support",
    blocksCoreReadiness: true,
    usedBy: "Cost of Debt support, Financial Health",
    notes: "Debt and interest detail support.",
  },
  {
    id: "damodaran_lease_effect_global",
    datasetName: "Global Lease Effects",
    workbookTableName: "tblDamodaranIndustryLeaseAdjustment",
    fileName: "leaseeffectGlobal.xls",
    dataCategory: "Lease Adjusted Metrics",
    priority: "Core Support",
    classification: "Core Support",
    blocksCoreReadiness: true,
    usedBy: "Accounting Adjustments, ROIC review",
    notes: "Lease-adjusted benchmark metrics.",
  },
  {
    id: "damodaran_histgr_global",
    datasetName: "Global Historical Growth",
    workbookTableName: "tblDamodaranIndustryGrowth",
    fileName: "histgrGlobal.xls",
    dataCategory: "Historical Growth",
    priority: "Core Support",
    classification: "Core Support",
    blocksCoreReadiness: true,
    usedBy: "Forecast & Fade, WACC/fade support, Stage Selection",
    notes: "Promoted to Core Support per v1.5 — important for fade and WACC context.",
  },
  {
    id: "damodaran_pbv_global",
    datasetName: "Global PBV Multiples",
    workbookTableName: "tblDamodaranIndustryPricingMultiples",
    fileName: "pbvGlobal.xls",
    dataCategory: "Multiples / Book Value",
    priority: "Pricing Sanity Only",
    classification: "Pricing Sanity Only",
    blocksCoreReadiness: false,
    pricingSanityOnly: true,
    roicSupportNote:
      "ROIC support: partial / review — PBV/ROIC fields may support ROC review; pricing multiples remain sanity-only.",
    usedBy: "Pricing sanity; partial ROIC context",
    notes: "Pricing sanity only. Does not block Beta/WACC readiness.",
  },
  {
    id: "damodaran_pe_global",
    datasetName: "Global PE Multiples",
    workbookTableName: "tblDamodaranIndustryPricingMultiples",
    fileName: "peGlobal.xls",
    dataCategory: "Multiples",
    priority: "Pricing Sanity Only",
    classification: "Pricing Sanity Only",
    blocksCoreReadiness: false,
    pricingSanityOnly: true,
    usedBy: "Multiples sanity check only",
    notes: "Sanity only — must not drive official intrinsic value.",
  },
  {
    id: "damodaran_ps_global",
    datasetName: "Global Price/Sales Multiples",
    workbookTableName: "tblDamodaranIndustryPricingMultiples",
    fileName: "psGlobal.xls",
    dataCategory: "Multiples",
    priority: "Pricing Sanity Only",
    classification: "Pricing Sanity Only",
    blocksCoreReadiness: false,
    pricingSanityOnly: true,
    usedBy: "Multiples sanity check only",
    notes: "Sanity only — must not drive official intrinsic value.",
  },
  {
    id: "damodaran_vebitda_global",
    datasetName: "Global EV/EBITDA Multiples",
    workbookTableName: "tblDamodaranIndustryPricingMultiples",
    fileName: "vebitdaGlobal.xls",
    dataCategory: "Multiples",
    priority: "Pricing Sanity Only",
    classification: "Pricing Sanity Only",
    blocksCoreReadiness: false,
    pricingSanityOnly: true,
    usedBy: "Multiples sanity check only",
    notes: "Sanity only — partial EV multiple proxy until dedicated EV file is added.",
  },
  {
    id: "damodaran_ev_data_global",
    datasetName: "Enterprise Value Multiples",
    workbookTableName: "tblDamodaranIndustryPricingMultiples",
    fileName: "evdataGlobal.xls",
    dataCategory: "Enterprise Value Multiples",
    priority: "Missing / Deferred",
    classification: "Missing / Deferred",
    blocksCoreReadiness: false,
    pricingSanityOnly: true,
    isDeferredPlaceholder: true,
    usedBy: "Pricing sanity (deferred)",
    notes:
      "EV multiples: Missing / Deferred. Required action: add evdataGlobal.xls raw source file later. Does not block core readiness.",
  },
  {
    id: "damodaran_total_beta_global",
    datasetName: "Total Beta (Undiversified Investor)",
    workbookTableName: "tblDamodaranIndustrySupportOptional",
    fileName: "totalbetaGlobal (2).xls",
    dataCategory: "Total Beta",
    priority: "Strong Support",
    classification: "Strong Support",
    blocksCoreReadiness: false,
    usedBy: "Optional risk review only",
    notes: "Strong support / optional risk context. Not required for base Beta Engine.",
    sourceUpdateDate: "January 5, 2026",
  },
  {
    id: "damodaran_fundgr_global",
    datasetName: "Global Fundamental EPS Growth",
    workbookTableName: "tblDamodaranIndustryGrowth",
    fileName: "fundgrGlobal.xls",
    dataCategory: "Fundamental EPS Growth",
    priority: "Support",
    classification: "Support",
    blocksCoreReadiness: false,
    usedBy: "Forecast quality / EPS sanity",
    notes: "Support dataset for EPS growth sanity.",
  },
  {
    id: "damodaran_roe_global",
    datasetName: "Global ROE Decomposition",
    workbookTableName: "tblDamodaranIndustrySupportOptional",
    fileName: "roeGlobal.xls",
    dataCategory: "ROE Decomposition",
    priority: "Support",
    classification: "Support",
    blocksCoreReadiness: false,
    usedBy: "Quality / review — ROE context only",
    notes: "ROE context only; ROC/ROIC is more central for operating FCFF.",
  },
  {
    id: "damodaran_rd_global",
    datasetName: "Global R&D Adjustment Support",
    workbookTableName: "tblDamodaranIndustrySupportOptional",
    fileName: "R&DGlobal.xls",
    dataCategory: "R&D Adjustment Support",
    priority: "Advanced",
    classification: "Advanced",
    blocksCoreReadiness: false,
    usedBy: "R&D capitalization review",
    notes: "Advanced optional support dataset.",
  },
  {
    id: "damodaran_finflows_global",
    datasetName: "Global Financing Flows",
    workbookTableName: "tblDamodaranIndustrySupportOptional",
    fileName: "finflowsGlobal.xls",
    dataCategory: "Financing Flows",
    priority: "Optional",
    classification: "Optional",
    blocksCoreReadiness: false,
    usedBy: "Capital structure review",
    notes: "Optional support dataset.",
  },
  {
    id: "damodaran_div_fcfe_global",
    datasetName: "Global Dividend / FCFE",
    workbookTableName: "tblDamodaranIndustrySupportOptional",
    fileName: "divfcfeGlobal.xls",
    dataCategory: "Dividend / FCFE",
    priority: "Optional",
    classification: "Optional",
    blocksCoreReadiness: false,
    usedBy: "Dividend / FCFE sanity only",
    notes: "Optional — does not gate core readiness.",
  },
  {
    id: "damodaran_dollar_global",
    datasetName: "Global Dollar Value Measures",
    workbookTableName: "tblDamodaranIndustrySupportOptional",
    fileName: "DollarGlobal.xls",
    dataCategory: "Dollar Value Measures",
    priority: "Optional",
    classification: "Optional",
    blocksCoreReadiness: false,
    usedBy: "Market context / industry scale",
    notes: "Optional context dataset.",
  },
  {
    id: "damodaran_mktcapmult",
    datasetName: "Market Cap Multiples / Risk Measures",
    workbookTableName: "tblDamodaranIndustryPricingMultiples",
    fileName: "mktcapmult.xlsx",
    dataCategory: "Market Cap Decile Multiples",
    priority: "Pricing Sanity Only",
    classification: "Pricing Sanity Only",
    blocksCoreReadiness: false,
    pricingSanityOnly: true,
    usedBy: "Size / pricing sanity",
    notes: "Pricing and size sanity only.",
  },
  {
    id: "damodaran_country_stats",
    datasetName: "Country / Market Statistics",
    workbookTableName: "tblDamodaranIndustrySupportOptional",
    fileName: "countrystats.xls",
    dataCategory: "Country / Market Statistics",
    priority: "Optional",
    classification: "Optional",
    blocksCoreReadiness: false,
    usedBy: "Macro / market context",
    notes: "Optional macro context dataset.",
  },
  {
    id: "damodaran_inshold_global",
    datasetName: "Insider / Institutional Holdings",
    workbookTableName: "tblDamodaranIndustrySupportOptional",
    fileName: "insholdGlobal.xls",
    dataCategory: "Insider / Institutional Holdings",
    priority: "Optional",
    classification: "Optional",
    blocksCoreReadiness: false,
    usedBy: "Governance / ownership support",
    notes: "Optional governance support dataset.",
  },
  {
    id: "damodaran_optvar_global",
    datasetName: "Standard Deviations / Volatility",
    workbookTableName: "tblDamodaranIndustrySupportOptional",
    fileName: "optvarGlobal.xls",
    dataCategory: "Standard Deviations / Volatility",
    priority: "Strong Support",
    classification: "Strong Support",
    blocksCoreReadiness: false,
    usedBy: "Risk / WACC context (future)",
    notes: "Strong support for volatility and risk review.",
  },
];

export const damodaranDatasetRegistry: DamodaranDatasetRegisterRow[] = registryInputs.map(
  buildRegistryRow,
);

export const coreDamodaranFileNames = damodaranDatasetRegistry
  .filter((row) => row.blocksCoreReadiness)
  .map((row) => row.fileName);

export const pricingSanityDamodaranFileNames = damodaranDatasetRegistry
  .filter((row) => row.pricingSanityOnly)
  .map((row) => row.fileName);

export function isReadinessBlockingDataset(row: DamodaranDatasetRegisterRow) {
  return row.blocksCoreReadiness;
}

export function getRegistryRowById(datasetId: string) {
  return damodaranDatasetRegistry.find((row) => row.id === datasetId) ?? null;
}

/** Merge imported status from stored rows onto the current registry template (v1.5 fields). */
export function hydrateDamodaranRegisterRows(
  storedRows: DamodaranDatasetRegisterRow[],
): DamodaranDatasetRegisterRow[] {
  const storedById = new Map(storedRows.map((row) => [row.id, row]));
  return damodaranDatasetRegistry.map((template) => {
    const stored = storedById.get(template.id);
    if (!stored) {
      return { ...template };
    }
    return {
      ...template,
      importStatus: stored.importStatus,
      importedLastUpdated: stored.importedLastUpdated,
      rowCount: stored.rowCount,
      industryCount: stored.industryCount,
      detectedColumns: stored.detectedColumns,
      sourceUpdateDate: stored.sourceUpdateDate || template.sourceUpdateDate,
      notes: stored.notes?.includes("Columns:") ? stored.notes : template.notes,
    };
  });
}
