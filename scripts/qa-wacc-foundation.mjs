/**
 * WACC foundation QA — run: node scripts/qa-wacc-foundation.mjs
 */
import { readFileSync } from "node:fs";
import {
  buildBetaPolicyInputFromReference,
  computeBetaPolicy,
} from "../lib/engines/beta/betaPolicyMath.ts";
import {
  computeWaccFromInput,
  computeWaccReadinessFromInput,
} from "../lib/engines/wacc/waccMath.ts";

const cache = JSON.parse(readFileSync("data/damodaran/cache/data-vault-cache.json", "utf8"));

const RISKFREE_BY_CURRENCY = {
  USD: { rate: 0.0415, source: "Mock riskfree — USD (valuation currency)" },
  SEK: { rate: 0.025, source: "Mock riskfree — SEK (valuation currency)" },
};

const ERP_BY_COUNTRY = {
  "United States": {
    erp: 0.047,
    crp: 0,
    source: "Damodaran Country ERP — United States (country-of-risk)",
  },
  Sweden: {
    erp: 0.0499,
    crp: 0.0029,
    source: "Damodaran Country ERP — Sweden (country-of-risk)",
  },
};

const REVENUE_WEIGHTED_ERP_NOTE =
  "Revenue-weighted ERP not implemented yet; country-of-risk ERP used as foundation input.";

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

function buildWaccInputFromScaffold(params) {
  const {
    companyId,
    benchmark,
    valuationCurrency,
    countryOfRisk,
    betaPolicyInputs,
    waccFoundationInputs,
  } = params;

  const lookup = mockLookup(benchmark);
  const policy = computeBetaPolicy(
    buildBetaPolicyInputFromReference(lookup, betaPolicyInputs ?? {}),
  );

  const riskfree = RISKFREE_BY_CURRENCY[valuationCurrency];
  const erp = ERP_BY_COUNTRY[countryOfRisk];

  const debtToEquity =
    waccFoundationInputs?.selectedDebtToEquity ?? policy.selectedDebtToEquity ?? null;
  const taxRate =
    waccFoundationInputs?.selectedTaxRate ?? policy.selectedTaxRate ?? null;
  const preTaxCostOfDebt = waccFoundationInputs?.preTaxCostOfDebt ?? null;

  const notes = [
    "WACC foundation only — not connected to valuation outputs or Dashboard decisions.",
    REVENUE_WEIGHTED_ERP_NOTE,
  ];
  if (waccFoundationInputs?.notes) {
    notes.push(waccFoundationInputs.notes);
  }

  return {
    companyId,
    selectedBenchmark: benchmark,
    valuationCurrency,
    countryOfRisk,
    selectedBeta: policy.selectedBeta,
    selectedBetaSource: policy.selectedBetaSource,
    riskfreeRate: riskfree?.rate ?? null,
    riskfreeSource: riskfree?.source ?? null,
    equityRiskPremium: erp?.erp ?? null,
    equityRiskPremiumSource: erp?.source ?? null,
    countryRiskPremium: erp?.crp ?? null,
    countryRiskPremiumSource: erp ? `Country Risk Premium — ${countryOfRisk}` : null,
    selectedDebtToEquity: debtToEquity,
    selectedDebtWeight: waccFoundationInputs?.selectedDebtWeight ?? null,
    selectedEquityWeight: waccFoundationInputs?.selectedEquityWeight ?? null,
    preTaxCostOfDebt: preTaxCostOfDebt,
    costOfDebtSource: waccFoundationInputs?.costOfDebtSource ?? null,
    selectedTaxRate: taxRate,
    taxRateSource: waccFoundationInputs?.taxRateSource ?? "Beta Policy / company inputs",
    manualOverrides: {},
    notes,
  };
}

function runCase(name, inputBuilder) {
  const input = inputBuilder();
  const readiness = computeWaccReadinessFromInput(input);
  const result = computeWaccFromInput(input);
  console.log(
    JSON.stringify({
      case: name,
      status: result.status,
      wacc: result.wacc === null ? null : Number(result.wacc.toFixed(6)),
      costOfEquity: result.costOfEquity === null ? null : Number(result.costOfEquity.toFixed(6)),
      afterTaxCostOfDebt:
        result.afterTaxCostOfDebt === null
          ? null
          : Number(result.afterTaxCostOfDebt.toFixed(6)),
      debtWeight: result.debtWeight,
      equityWeight: result.equityWeight,
      readinessStatus: readiness.status,
      missingInputs: readiness.missingInputs,
      warnings: result.warnings,
      errors: result.errors,
    }),
  );
}

runCase("Microsoft — complete scaffold inputs", () =>
  buildWaccInputFromScaffold({
    companyId: "MSFT",
    benchmark: "Software (System & Application)",
    valuationCurrency: "USD",
    countryOfRisk: "United States",
    betaPolicyInputs: { marketDebtToEquity: 0.22, selectedTaxRate: 0.17 },
    waccFoundationInputs: {
      preTaxCostOfDebt: 0.038,
      costOfDebtSource: "Mock / Foundation scaffold",
    },
  }),
);

runCase("Disney — missing D/E and pre-tax cost of debt", () =>
  buildWaccInputFromScaffold({
    companyId: "DIS",
    benchmark: "Entertainment",
    valuationCurrency: "USD",
    countryOfRisk: "United States",
    betaPolicyInputs: { selectedTaxRate: 0.21 },
    waccFoundationInputs: {
      notes: "No pre-tax cost of debt scaffold",
    },
  }),
);

runCase("Volvo — complete scaffold inputs (SEK)", () =>
  buildWaccInputFromScaffold({
    companyId: "VOLV-B",
    benchmark: "Auto & Truck",
    valuationCurrency: "SEK",
    countryOfRisk: "Sweden",
    betaPolicyInputs: { marketDebtToEquity: 0.45, selectedTaxRate: 0.21 },
    waccFoundationInputs: {
      preTaxCostOfDebt: 0.05,
      costOfDebtSource: "Mock / Foundation scaffold",
    },
  }),
);

runCase("Missing selected beta", () => {
  const input = buildWaccInputFromScaffold({
    companyId: "TEST",
    benchmark: "Nonexistent Industry XYZ",
    valuationCurrency: "USD",
    countryOfRisk: "United States",
    betaPolicyInputs: { marketDebtToEquity: 0.22, selectedTaxRate: 0.17 },
    waccFoundationInputs: { preTaxCostOfDebt: 0.04 },
  });
  input.selectedBeta = null;
  input.selectedBetaSource = "Missing";
  return input;
});

const disInput = buildWaccInputFromScaffold({
  companyId: "DIS",
  benchmark: "Entertainment",
  valuationCurrency: "USD",
  countryOfRisk: "United States",
  betaPolicyInputs: { selectedTaxRate: 0.21 },
  waccFoundationInputs: { notes: "No pre-tax cost of debt scaffold" },
});
const disResult = computeWaccFromInput(disInput);
if (disResult.wacc !== null) {
  throw new Error("Disney case must not compute WACC");
}
if (disResult.costOfEquity === null) {
  throw new Error("Disney case must compute Cost of Equity when beta, riskfree, and ERP exist");
}
if (
  !disResult.warnings.some((warning) =>
    warning.includes("Cost of Equity shown for review"),
  )
) {
  throw new Error("Disney case must include partial CoE review warning");
}
console.log("qa-wacc-foundation: Disney partial Cost of Equity assertions passed");
