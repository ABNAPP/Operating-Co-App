export type BuildPhaseStatus =
  | "Done"
  | "Done / Hotfixed"
  | "Foundation"
  | "In progress"
  | "Not started";

/** Layer / node status on the visual flowchart map. */
export type LayerStatus = "Done" | "Done / Hotfixed" | "Ready" | "Not started";

export interface BuildPhaseItem {
  id: string;
  label: string;
  status: BuildPhaseStatus;
}

export interface FlowchartNode {
  id: string;
  label: string;
  description?: string;
  status: LayerStatus;
}

export interface FlowchartLayer {
  id: string;
  layerNumber: number;
  title: string;
  subtitle: string;
  layerStatus: LayerStatus;
  nodes: FlowchartNode[];
  /** Shown on connector after this layer (except last). */
  connectorNote?: string;
}

/** Compact checklist — update as phases complete. */
export const CURRENT_BUILD_PHASES: BuildPhaseItem[] = [
  { id: "app-shell", label: "App Shell / Navigation", status: "Done" },
  { id: "data-model", label: "Data Model / Mock Data", status: "Done" },
  { id: "firestore", label: "Firestore Foundation", status: "Done" },
  { id: "riskfree", label: "Riskfree Rates", status: "Done" },
  { id: "fx", label: "FX Rates", status: "Done / Hotfixed" },
  { id: "country-erp", label: "Country Risk / ERP", status: "Done" },
  { id: "damodaran-vault", label: "Damodaran Data Vault", status: "Done" },
  { id: "benchmark-config-v15", label: "Exact v1.5 Industry Benchmark Config", status: "Done" },
  { id: "damodaran-bridge", label: "Damodaran v1.5 Bridge", status: "Done" },
  { id: "formatting", label: "Global Formatting Standard", status: "Done" },
  {
    id: "beta-engine",
    label: "Beta Engine (Foundation / Selected Beta Policy)",
    status: "Foundation",
  },
  { id: "wacc-engine", label: "WACC Engine (Foundation)", status: "Foundation" },
  { id: "forecast-fade", label: "Forecast & Fade Engine (Foundation)", status: "Foundation" },
  { id: "reinvestment-fcff", label: "Reinvestment / FCFF Engine (Foundation)", status: "Foundation" },
  {
    id: "terminal-value-engine",
    label: "Terminal Value Engine",
    status: "Foundation",
  },
  { id: "dcf-pv-engine", label: "DCF / PV Engine", status: "Foundation" },
  { id: "firm-equity-bridge", label: "Firm-to-Equity Bridge", status: "Foundation" },
  { id: "intrinsic-share", label: "Intrinsic Value / Share", status: "Foundation" },
  { id: "mos-decision", label: "MOS / Decision Layer", status: "Foundation" },
  {
    id: "dashboard-decision",
    label: "Dashboard decision integration",
    status: "Foundation",
  },
];

/**
 * v1.5-aligned architecture layers (Master Spec §1–2, §19–20, Data Hub modules).
 * Documentation map only — does not execute valuation logic.
 */
export const FLOWCHART_LAYERS: FlowchartLayer[] = [
  {
    id: "company-input",
    layerNumber: 1,
    title: "Company Input Layer",
    subtitle:
      "Company sheet inputs and identity — manual company data, currencies, and selected benchmark anchor (v1.5 company workspace).",
    layerStatus: "Done",
    connectorNote: "Selected benchmark and currencies feed reference data and config",
    nodes: [
      {
        id: "company-workspace",
        label: "Company Workspace",
        description: "Per-company analysis shell and manual input area",
        status: "Done",
      },
      {
        id: "company-identity",
        label: "Company Identity",
        description: "Ticker, name, website, country of risk",
        status: "Done",
      },
      {
        id: "selected-benchmark",
        label: "Selected Damodaran Industrial Benchmark",
        description: "Primary industry anchor (benchmark-first)",
        status: "Done",
      },
      {
        id: "currencies",
        label: "Reporting / Trading / Valuation Currency",
        description: "Currency map drives riskfree and FX review",
        status: "Done",
      },
      {
        id: "manual-inputs",
        label: "Manual Company Financial Inputs",
        description: "Historical, forecast, bridge, risk overrides (placeholders)",
        status: "Ready",
      },
    ],
  },
  {
    id: "reference-data-hub",
    layerNumber: 2,
    title: "Reference Data / Data Hub Layer",
    subtitle:
      "Shared system reference modules — Riskfree, FX, Country ERP, Damodaran vault, Industry Benchmark Config (v1.5 system sheets).",
    layerStatus: "Done",
    connectorNote:
      "Reference data feeds Beta/WACC foundation inputs; WACC is not connected to FCFF, terminal, intrinsic, or Dashboard",
    nodes: [
      {
        id: "riskfree",
        label: "Riskfree Rates",
        description: "Valuation-currency riskfree proxies",
        status: "Done",
      },
      {
        id: "fx",
        label: "FX Rates",
        description: "Currency map and FX pairs",
        status: "Done / Hotfixed",
      },
      {
        id: "country-erp",
        label: "Country Risk / ERP",
        description: "Country and regional ERP support",
        status: "Done",
      },
      {
        id: "damodaran-data",
        label: "Damodaran Data",
        description: "Industry benchmark vault and pull-key source register",
        status: "Done",
      },
      {
        id: "industry-benchmark-config",
        label: "Industry Benchmark Config",
        description: "Exact v1.5 config tables and pull keys",
        status: "Done",
      },
    ],
  },
  {
    id: "industry-benchmark",
    layerNumber: 3,
    title: "Industry Benchmark Layer",
    subtitle:
      "Benchmark-first industry logic — config, pull keys, and Damodaran data linkage (Master Spec §20).",
    layerStatus: "Ready",
    connectorNote: "Benchmark support context for engines — not a valuation driver by itself",
    nodes: [
      {
        id: "benchmark-anchor",
        label: "Selected Damodaran Industrial Benchmark",
        description: "Same anchor as company sheet",
        status: "Done",
      },
      {
        id: "benchmark-config",
        label: "Industry Benchmark Config",
        description: "Status, stage, cyclicality, history, rules",
        status: "Done",
      },
      {
        id: "pull-keys",
        label: "Benchmark Data Pull Keys",
        description: "tblBenchmarkDataPullKeys → Damodaran datasets",
        status: "Ready",
      },
      {
        id: "ism-display",
        label: "ISM-sector (display-only)",
        description: "tblIndustryISMDisplayMap — no model-driving effect",
        status: "Done",
      },
    ],
  },
  {
    id: "future-engines",
    layerNumber: 4,
    title: "Future Engine Layer",
    subtitle:
      "Global Valuation Engine chain (Master Spec §2): FCFF, WACC, terminal value foundation — bridge & intrinsic not implemented in app yet.",
    layerStatus: "Ready",
    connectorNote: "Engine outputs will feed presentation layers below",
    nodes: [
      {
        id: "beta-engine",
        label: "Beta Engine (Foundation / Selected Beta Policy)",
        description: "Reference lookup + relevering / selected beta policy — no WACC math",
        status: "Ready",
      },
      {
        id: "wacc-engine",
        label: "WACC Engine (Foundation)",
        description:
          "Cost of Equity + WACC foundation — not connected to FCFF, terminal, intrinsic, or Dashboard",
        status: "Ready",
      },
      {
        id: "forecast-fade",
        label: "Forecast & Fade Engine (Foundation)",
        description:
          "Stage/history/cyclicality and fade readiness — not connected to FCFF, terminal, intrinsic, or Dashboard",
        status: "Ready",
      },
      {
        id: "reinvestment-fcff",
        label: "Reinvestment / FCFF Engine (Foundation)",
        description:
          "NOPAT, reinvestment and FCFF foundation — not connected to terminal, DCF/PV, bridge, intrinsic, or Dashboard",
        status: "Ready",
      },
      {
        id: "terminal-value",
        label: "Terminal Value Engine",
        description:
          "Terminal FCFF and Gordon terminal value foundation outputs only — not discounted and not connected to bridge, intrinsic, or Dashboard decisions.",
        status: "Ready",
      },
      {
        id: "dcf-pv",
        label: "DCF / PV Engine",
        description:
          "DCF/PV foundation calculates PV of forecast FCFF and PV of terminal value only — not connected to bridge, equity value, intrinsic value, or Dashboard decisions.",
        status: "Ready",
      },
      {
        id: "firm-equity-bridge",
        label: "Firm-to-Equity Bridge",
        description:
          "Equity Value from Value of Operating Assets and explicit bridge adjustments only — not connected to intrinsic value per share or Dashboard decisions.",
        status: "Ready",
      },
      {
        id: "intrinsic-share",
        label: "Intrinsic Value / Share",
        description:
          "Intrinsic Value / Share from Equity Value and selected diluted shares only — not connected to official Dashboard buy/sell/hold decisions.",
        status: "Ready",
      },
      {
        id: "mos-decision",
        label: "MOS / Decision Layer (Foundation)",
        description:
          "MOS %, entry price, and foundation-only Above/Below Required MOS outcome — not an official Dashboard decision and no Buy/Sell/Hold logic.",
        status: "Ready",
      },
    ],
  },
  {
    id: "output",
    layerNumber: 5,
    title: "Output Layer",
    subtitle:
      "Presentation and navigation — Dashboard and Company Snapshot show outputs only; no valuation calculation in UI.",
    layerStatus: "Ready",
    nodes: [
      {
        id: "company-snapshot",
        label: "Company Snapshot",
        description: "Top presentation layer per company sheet",
        status: "Ready",
      },
      {
        id: "dashboard",
        label: "Dashboard",
        description:
          "Foundation decision integration table — maps bundle outputs; not official Buy/Sell/Hold",
        status: "Ready",
      },
      {
        id: "review-flags",
        label: "Review Flags / Status Notes",
        description: "Worst-flag-wins review scaffolding",
        status: "Ready",
      },
      {
        id: "decision-support",
        label: "Official Dashboard Buy/Sell/Hold",
        description:
          "Official investment decision logic — not started; Dashboard currently shows foundation mapping only.",
        status: "Not started",
      },
    ],
  },
];

export const IMPORTANT_RULES = [
  "Damodaran Industrial Benchmark is the primary industry anchor (v1.5 benchmark-first).",
  "ISM-sector is display-only and must not drive engines or review logic.",
  "Damodaran pricing multiples are sanity-only — not official intrinsic value.",
  "Completed Data Hub modules provide reference data; Beta, WACC, and Forecast & Fade foundations calculate engine outputs or readiness only (not full valuation chain).",
  "Formatting is display-only and does not mutate imported raw values.",
  "WACC Engine Foundation exists but is not connected to valuation outputs (FCFF, terminal, intrinsic, Dashboard).",
  "Forecast & Fade Foundation recommends structure/readiness only — no revenue, margin, or intrinsic math.",
  "Reinvestment / FCFF Foundation calculates NOPAT, reinvestment and FCFF only — not terminal value, DCF/PV, bridge, intrinsic value, or Dashboard decisions.",
  "ISM-sector is display-only and must not drive Reinvestment / FCFF logic.",
  "Terminal Value foundation calculates terminal FCFF and Gordon terminal value only — not discounted, not DCF/PV, and not connected to bridge, intrinsic value, or Dashboard decision logic.",
  "DCF/PV foundation calculates PV of forecast FCFF and PV of terminal value only — no bridge, equity value, intrinsic value, or Dashboard decision logic.",
  "Firm-to-Equity Bridge foundation calculates Equity Value from Value of Operating Assets and explicit bridge adjustments only — no intrinsic value per share, MOS, entry price, or Dashboard decision logic.",
  "Intrinsic Value / Share foundation calculates per-share value from Equity Value and explicit share-count scaffold only — no official Dashboard buy/sell/hold decision logic.",
  "MOS / Decision foundation calculates upside/downside, MOS %, entry price, and foundation-only Above/Below Required MOS outcome — not an official Dashboard decision and no Buy/Sell/Hold logic.",
  "Dashboard Decision Integration maps foundation bundle outputs to the Dashboard table — foundation-only, not official Buy/Sell/Hold.",
  "Official Dashboard buy/sell/hold decision logic remains not started.",
  "No full valuation chain math until an approved implementation phase.",
] as const;

export const NEXT_RECOMMENDED_STEP = {
  title: "Official Dashboard Buy/Sell/Hold",
  status: "Not started",
  description:
    "Next phase after Dashboard Decision Integration foundation: official investment decision logic — foundation MOS outcome must not be treated as Buy/Sell/Hold until approved.",
} as const;

/** @deprecated Use FLOWCHART_LAYERS for visual map. */
export const MAIN_APP_FLOW_STEPS = [
  "Company Workspace",
  "Selected Damodaran Industrial Benchmark",
  "Industry Benchmark Config",
  "Damodaran Data Pull Keys",
  "Damodaran Data",
  "Riskfree / ERP / FX",
  "Future Beta Engine",
  "WACC Engine Foundation",
  "Future Forecast & Fade",
  "Future Reinvestment / FCFF",
  "Future Terminal Value",
  "Future Firm-to-Equity Bridge",
  "Future Intrinsic Value / Share",
  "Future Dashboard Output",
] as const;

/** @deprecated Use FLOWCHART_LAYERS reference-data-hub layer. */
export const DATA_HUB_FLOW_STEPS = [
  "Riskfree Rates",
  "FX Rates",
  "Country Risk / ERP",
  "Damodaran Data",
  "Industry Benchmark Config",
] as const;
