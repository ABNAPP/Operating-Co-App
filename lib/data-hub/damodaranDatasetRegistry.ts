import "server-only";
import type { DamodaranDatasetPriority, DamodaranDatasetRegisterRow } from "@/lib/types";

export const DAMODARAN_SOURCE_NAME = "Damodaran Current Data";
export const DAMODARAN_SOURCE_URL =
  "https://pages.stern.nyu.edu/~adamodar/New_Home_Page/datacurrent.html";
export const DAMODARAN_SOURCE_UPDATE_DATE = "January 9, 2026";
export const DAMODARAN_COUNTRY_RISK_UPDATE_DATE = "January 5, 2026";

interface RegistrySeedInput {
  id: string;
  datasetName: string;
  fileName: string;
  dataCategory: string;
  priority: DamodaranDatasetPriority;
  usedBy: string;
  notes: string;
  sourceUpdateDate?: string;
}

function buildRegistryRow(input: RegistrySeedInput): DamodaranDatasetRegisterRow {
  return {
    id: input.id,
    datasetName: input.datasetName,
    fileName: input.fileName,
    dataCategory: input.dataCategory,
    priority: input.priority,
    usedBy: input.usedBy,
    sourceName: DAMODARAN_SOURCE_NAME,
    sourceUrl: DAMODARAN_SOURCE_URL,
    downloadUrl: `https://pages.stern.nyu.edu/~adamodar/pc/datasets/${input.fileName}`,
    sourceUpdateDate: input.sourceUpdateDate ?? DAMODARAN_SOURCE_UPDATE_DATE,
    importedLastUpdated: null,
    importStatus: "Not Imported",
    rowCount: 0,
    industryCount: 0,
    notes: input.notes,
  };
}

const registryInputs: RegistrySeedInput[] = [
  {
    id: "damodaran_beta_global",
    datasetName: "Global Industry Beta",
    fileName: "betaGlobal.xls",
    dataCategory: "Industry Beta",
    priority: "Core",
    usedBy: "Beta Engine, Risk/WACC",
    notes: "Core beta benchmark reference table.",
  },
  {
    id: "damodaran_wacc_global",
    datasetName: "Global Industry Cost of Capital",
    fileName: "waccGlobal.xls",
    dataCategory: "Industry Cost of Capital",
    priority: "Core",
    usedBy: "Risk/WACC Review",
    notes: "Sanity/reference only; not official app WACC override.",
  },
  {
    id: "damodaran_ratings",
    datasetName: "Ratings and Default Spreads",
    fileName: "ratings.xls",
    dataCategory: "Ratings / Default Spreads / Interest Coverage",
    priority: "Core",
    usedBy: "Cost of Debt, Risk/WACC",
    notes: "Supports synthetic-rating and default-spread lookup later.",
  },
  {
    id: "damodaran_capex_global",
    datasetName: "Global Capital Expenditures",
    fileName: "capexGlobal.xls",
    dataCategory: "Capital Expenditures / Reinvestment / Sales-to-Capital",
    priority: "Core",
    usedBy: "Reinvestment & FCFF, Forecast & Fade",
    notes: "Core reinvestment support dataset.",
  },
  {
    id: "damodaran_wcdata_global",
    datasetName: "Global Working Capital",
    fileName: "wcdataGlobal.xls",
    dataCategory: "Working Capital",
    priority: "Core",
    usedBy: "Reinvestment & FCFF, NWC checks",
    notes: "Working capital benchmark data by industry.",
  },
  {
    id: "damodaran_margin_global",
    datasetName: "Global Margins",
    fileName: "marginGlobal.xls",
    dataCategory: "Margins",
    priority: "Core",
    usedBy: "Forecast & Fade, Terminal Value",
    notes: "Margin benchmark reference data.",
  },
  {
    id: "damodaran_fundgr_eb_global",
    datasetName: "Global Fundamental Growth (EBIT)",
    fileName: "fundgrEBGlobal.xls",
    dataCategory: "ROC / Reinvestment / Fundamental EBIT Growth",
    priority: "Core",
    usedBy: "Terminal Value, Reinvestment Discipline, Quality / Review",
    notes: "Core profitability/growth benchmark set.",
  },
  {
    id: "damodaran_taxrate_global",
    datasetName: "Global Industry Tax Rates",
    fileName: "taxrateGlobal.xls",
    dataCategory: "Industry Tax Rates",
    priority: "Core",
    usedBy: "NOPAT, Risk/WACC, Tax Review",
    notes: "Industry-level effective tax reference.",
  },
  {
    id: "damodaran_country_tax_rates",
    datasetName: "Country Tax Rates",
    fileName: "countrytaxrates.xls",
    dataCategory: "Country Tax Rates",
    priority: "Core",
    usedBy: "Stable tax, Tax Review, Cost of Debt after-tax support",
    notes: "Country tax reference (not Country ERP).",
  },
  {
    id: "damodaran_debt_details_global",
    datasetName: "Global Debt Details",
    fileName: "debtdetailsGlobal.xls",
    dataCategory: "Debt Details",
    priority: "Core",
    usedBy: "Risk/WACC, Financial Health, Cost of Debt",
    notes: "Debt and interest detail support.",
  },
  {
    id: "damodaran_lease_effect_global",
    datasetName: "Global Lease Effects",
    fileName: "leaseeffectGlobal.xls",
    dataCategory: "Lease Adjusted Metrics",
    priority: "Core",
    usedBy: "Accounting Adjustments, WACC/Bridge Review",
    notes: "Lease-adjusted benchmark metrics.",
  },
  {
    id: "damodaran_pbv_global",
    datasetName: "Global PBV Multiples",
    fileName: "pbvGlobal.xls",
    dataCategory: "Multiples / Book Value / ROE-ROIC Support",
    priority: "Core",
    usedBy: "Sanity Checks, Business Quality",
    notes: "Multiples and ROE/ROIC benchmark support.",
  },
  {
    id: "damodaran_pe_global",
    datasetName: "Global PE Multiples",
    fileName: "peGlobal.xls",
    dataCategory: "Multiples",
    priority: "Core",
    usedBy: "Multiples sanity check only",
    notes: "Sanity only, not primary valuation engine input.",
  },
  {
    id: "damodaran_ps_global",
    datasetName: "Global Price/Sales Multiples",
    fileName: "psGlobal.xls",
    dataCategory: "Multiples",
    priority: "Core",
    usedBy: "Multiples sanity check only",
    notes: "Sanity only, not primary valuation engine input.",
  },
  {
    id: "damodaran_vebitda_global",
    datasetName: "Global EV/EBITDA Multiples",
    fileName: "vebitdaGlobal.xls",
    dataCategory: "Multiples",
    priority: "Core",
    usedBy: "Multiples sanity check only",
    notes: "Sanity only, not primary valuation engine input.",
  },
  {
    id: "damodaran_histgr_global",
    datasetName: "Global Historical Growth",
    fileName: "histgrGlobal.xls",
    dataCategory: "Historical Growth",
    priority: "Support",
    usedBy: "Stage Selection, Forecast Quality, Cyclicality Review",
    notes: "Support dataset.",
  },
  {
    id: "damodaran_fundgr_global",
    datasetName: "Global Fundamental EPS Growth",
    fileName: "fundgrGlobal.xls",
    dataCategory: "Fundamental EPS Growth",
    priority: "Support",
    usedBy: "Business Quality / sanity",
    notes: "Support dataset.",
  },
  {
    id: "damodaran_roe_global",
    datasetName: "Global ROE Decomposition",
    fileName: "roeGlobal.xls",
    dataCategory: "ROE Decomposition",
    priority: "Support",
    usedBy: "Business Quality / Support",
    notes: "Support dataset.",
  },
  {
    id: "damodaran_rd_global",
    datasetName: "Global R&D Adjustment Support",
    fileName: "R&DGlobal.xls",
    dataCategory: "R&D Adjustment Support",
    priority: "Advanced",
    usedBy: "Accounting Adjustments / R&D Review",
    notes: "Optional advanced support dataset.",
  },
  {
    id: "damodaran_finflows_global",
    datasetName: "Global Financing Flows",
    fileName: "finflowsGlobal.xls",
    dataCategory: "Financing Flows",
    priority: "Optional",
    usedBy: "Financial Health / Capital Return Review",
    notes: "Optional/support dataset.",
  },
  {
    id: "damodaran_div_fcfe_global",
    datasetName: "Global Dividend / FCFE",
    fileName: "divfcfeGlobal.xls",
    dataCategory: "Dividend / FCFE",
    priority: "Optional",
    usedBy: "Dividend / FCFE support only",
    notes: "FCFF remains official valuation engine later.",
  },
  {
    id: "damodaran_dollar_global",
    datasetName: "Global Dollar Value Measures",
    fileName: "DollarGlobal.xls",
    dataCategory: "Dollar Value Measures",
    priority: "Optional",
    usedBy: "Market context / industry scale",
    notes: "Optional context dataset.",
  },
  {
    id: "damodaran_mktcapmult",
    datasetName: "Market Cap Multiples / Risk Measures",
    fileName: "mktcapmult.xlsx",
    dataCategory: "Market Cap Multiples / Risk Measures",
    priority: "Optional",
    usedBy: "Sanity / market context",
    notes: "Optional context dataset.",
  },
  {
    id: "damodaran_country_stats",
    datasetName: "Country / Market Statistics",
    fileName: "countrystats.xls",
    dataCategory: "Country / Market Statistics",
    priority: "Optional",
    usedBy: "Reference / macro context",
    notes: "Optional macro context dataset.",
  },
  {
    id: "damodaran_inshold_global",
    datasetName: "Insider / Institutional Holdings",
    fileName: "insholdGlobal.xls",
    dataCategory: "Insider / Institutional Holdings",
    priority: "Optional",
    usedBy: "Governance / ownership support",
    notes: "Optional governance support dataset.",
  },
  {
    id: "damodaran_optvar_global",
    datasetName: "Option / Volatility",
    fileName: "optvarGlobal.xls",
    dataCategory: "Option / Volatility",
    priority: "Advanced",
    usedBy: "Advanced optional support",
    notes: "Optional advanced dataset.",
  },
];

export const damodaranDatasetRegistry: DamodaranDatasetRegisterRow[] = registryInputs.map(
  buildRegistryRow,
);

export const coreDamodaranFileNames = damodaranDatasetRegistry
  .filter((row) => row.priority === "Core")
  .map((row) => row.fileName);
