import type { CurrencyCode } from "@/lib/types/currency";
import type {
  CompanyManualInputOverrides,
  CompanyManualInputsSavePayload,
  ManualInputsSanitizeResult,
} from "@/lib/types/company-manual-inputs";
import type { TerminalValueInputs } from "@/lib/types/inputs";

const CURRENCY_CODES: readonly CurrencyCode[] = [
  "USD",
  "EUR",
  "SEK",
  "NOK",
  "DKK",
  "CAD",
  "AUD",
  "JPY",
  "CHF",
  "GBP",
];

const TERMINAL_METHODS: readonly TerminalValueInputs["terminalMethod"][] = [
  "Gordon Growth",
  "Exit Multiple",
  "Hybrid",
];

const SHARE_UNITS = ["millions", "absolute"] as const;

export function parseOptionalFiniteNumber(
  raw: string | number | null | undefined,
  options?: { fieldLabel?: string; min?: number; max?: number; allowPercentMagnitude?: boolean },
): { value?: number; warning?: string; error?: string } {
  if (raw === null || raw === undefined) {
    return { value: undefined };
  }
  if (typeof raw === "number") {
    if (!Number.isFinite(raw)) {
      return { error: `${options?.fieldLabel ?? "Field"} must be a finite number.` };
    }
    return validateNumericRange(raw, options);
  }

  const trimmed = String(raw).trim();
  if (!trimmed) {
    return { value: undefined };
  }

  const parsed = Number(trimmed.replace(",", "."));
  if (!Number.isFinite(parsed)) {
    return { error: `${options?.fieldLabel ?? "Field"} is not a valid number.` };
  }

  return validateNumericRange(parsed, options);
}

function validateNumericRange(
  value: number,
  options?: { fieldLabel?: string; min?: number; max?: number; allowPercentMagnitude?: boolean },
): { value?: number; warning?: string; error?: string } {
  const label = options?.fieldLabel ?? "Field";
  if (options?.min !== undefined && value < options.min) {
    return { error: `${label} must be >= ${options.min}.` };
  }
  if (options?.max !== undefined && value > options.max) {
    return { error: `${label} must be <= ${options.max}.` };
  }
  if (options?.allowPercentMagnitude && Math.abs(value) > 5) {
    return {
      warning: `${label} looks unusually large for a decimal rate — verify units.`,
      value,
    };
  }
  return { value };
}

export function sanitizeCurrencyCode(
  raw: string | undefined,
  fieldLabel: string,
): { value?: CurrencyCode; error?: string } {
  const trimmed = raw?.trim();
  if (!trimmed) {
    return { value: undefined };
  }
  if (!CURRENCY_CODES.includes(trimmed as CurrencyCode)) {
    return { error: `${fieldLabel} must be a supported currency code (${CURRENCY_CODES.join(", ")}).` };
  }
  return { value: trimmed as CurrencyCode };
}

export function sanitizeBenchmarkName(
  raw: string | undefined,
  allowedBenchmarks?: string[],
): { value?: string; warning?: string; error?: string } {
  const trimmed = raw?.trim();
  if (!trimmed) {
    return { value: undefined };
  }
  if (trimmed.length > 240) {
    return { error: "Damodaran Industrial Benchmark exceeds maximum length." };
  }
  if (allowedBenchmarks && allowedBenchmarks.length > 0 && !allowedBenchmarks.includes(trimmed)) {
    return {
      warning: "Benchmark not found in current universe table — saved as draft override only.",
      value: trimmed,
    };
  }
  return { value: trimmed };
}

export function sanitizeTerminalMethod(
  raw: string | undefined,
): { value?: TerminalValueInputs["terminalMethod"]; error?: string } {
  const trimmed = raw?.trim();
  if (!trimmed) {
    return { value: undefined };
  }
  if (!TERMINAL_METHODS.includes(trimmed as TerminalValueInputs["terminalMethod"])) {
    return { error: `Terminal method must be one of: ${TERMINAL_METHODS.join(", ")}.` };
  }
  return { value: trimmed as TerminalValueInputs["terminalMethod"] };
}

export function sanitizeShareUnit(
  raw: string | undefined,
): { value?: "millions" | "absolute"; error?: string } {
  const trimmed = raw?.trim();
  if (!trimmed) {
    return { value: undefined };
  }
  if (!SHARE_UNITS.includes(trimmed as (typeof SHARE_UNITS)[number])) {
    return { error: "Share unit must be 'millions' or 'absolute'." };
  }
  return { value: trimmed as "millions" | "absolute" };
}

export function sanitizeTextField(
  raw: string | undefined,
  fieldLabel: string,
  maxLength = 500,
): { value?: string; error?: string } {
  const trimmed = raw?.trim();
  if (!trimmed) {
    return { value: undefined };
  }
  if (trimmed.length > maxLength) {
    return { error: `${fieldLabel} exceeds maximum length (${maxLength}).` };
  }
  return { value: trimmed };
}

/** Sanitize a save payload (e.g. from workspace draft) before persistence. */
export function sanitizeCompanyManualInputsSavePayload(
  input: CompanyManualInputsSavePayload,
  options?: { allowedBenchmarks?: string[] },
): ManualInputsSanitizeResult {
  const warnings: string[] = [];
  const errors: string[] = [];
  const overrides: CompanyManualInputOverrides = {};
  const src = input.overrides ?? {};

  if (src.identity) {
    const identity: NonNullable<CompanyManualInputOverrides["identity"]> = {};
    const name = sanitizeTextField(src.identity.companyName, "Company name", 200);
    if (name.error) errors.push(name.error);
    else if (name.value) identity.companyName = name.value;

    const exchange = sanitizeTextField(src.identity.exchange, "Exchange", 80);
    if (exchange.error) errors.push(exchange.error);
    else if (exchange.value) identity.exchange = exchange.value;

    const website = sanitizeTextField(src.identity.websiteUrl, "Website URL", 300);
    if (website.error) errors.push(website.error);
    else if (website.value) identity.websiteUrl = website.value;

    const country = sanitizeTextField(src.identity.countryOfRisk, "Country of risk", 120);
    if (country.error) errors.push(country.error);
    else if (country.value) identity.countryOfRisk = country.value;

    const benchmark = sanitizeBenchmarkName(
      src.identity.damodaranIndustrialBenchmark,
      options?.allowedBenchmarks,
    );
    if (benchmark.error) errors.push(benchmark.error);
    if (benchmark.warning) warnings.push(benchmark.warning);
    if (benchmark.value) identity.damodaranIndustrialBenchmark = benchmark.value;

    if (Object.keys(identity).length > 0) {
      overrides.identity = identity;
    }
  }

  if (src.currencies) {
    const currencies: NonNullable<CompanyManualInputOverrides["currencies"]> = {};
    for (const [key, label] of [
      ["reportingCurrency", "Reporting currency"],
      ["valuationCurrency", "Valuation currency"],
      ["tradingCurrency", "Trading currency"],
    ] as const) {
      const parsed = sanitizeCurrencyCode(src.currencies[key], label);
      if (parsed.error) errors.push(parsed.error);
      else if (parsed.value) currencies[key] = parsed.value;
    }
    const fxPair = sanitizeTextField(src.currencies.fxPairToValuation, "FX pair", 32);
    if (fxPair.error) errors.push(fxPair.error);
    else if (fxPair.value) currencies.fxPairToValuation = fxPair.value;

    const note = sanitizeTextField(src.currencies.note, "Currency note", 1000);
    if (note.error) errors.push(note.error);
    else if (note.value) currencies.note = note.value;

    if (Object.keys(currencies).length > 0) {
      overrides.currencies = currencies;
    }
  }

  if (src.companySetup?.valuationDate) {
    const date = sanitizeTextField(src.companySetup.valuationDate, "Valuation date", 32);
    if (date.error) errors.push(date.error);
    else if (date.value) overrides.companySetup = { valuationDate: date.value };
  }

  if (src.market) {
    const market: NonNullable<CompanyManualInputOverrides["market"]> = {};
    const price = parseOptionalFiniteNumber(src.market.currentPrice, {
      fieldLabel: "Current price",
      min: 0,
    });
    if (price.error) errors.push(price.error);
    if (price.value !== undefined) market.currentPrice = price.value;

    const cap = parseOptionalFiniteNumber(src.market.marketCap, {
      fieldLabel: "Market cap",
      min: 0,
    });
    if (cap.error) errors.push(cap.error);
    if (cap.value !== undefined) market.marketCap = cap.value;
    const shares = parseOptionalFiniteNumber(src.market.manualShareCountOverride, {
      fieldLabel: "Manual share override",
      min: 0,
    });
    if (shares.error) errors.push(shares.error);
    if (shares.value !== undefined) market.manualShareCountOverride = shares.value;

    const beta = parseOptionalFiniteNumber(src.market.beta, {
      fieldLabel: "Market beta",
      min: -5,
      max: 10,
    });
    if (beta.error) errors.push(beta.error);
    if (beta.value !== undefined) market.beta = beta.value;
    if (Object.keys(market).length > 0) overrides.market = market;
  }

  if (src.forecastInputs) {
    const forecast: NonNullable<CompanyManualInputOverrides["forecastInputs"]> = {};
    for (const [key, label] of [
      ["revenueGrowthAssumption", "Revenue growth"],
      ["targetOperatingMargin", "Target margin"],
      ["targetTaxRate", "Target tax"],
      ["targetReinvestmentRate", "Reinvestment rate"],
      ["targetRoeOrRoic", "Target ROE/ROIC"],
    ] as const) {
      const raw = src.forecastInputs[key];
      if (raw === undefined) continue;
      const parsed = parseOptionalFiniteNumber(raw, {
        fieldLabel: label,
        allowPercentMagnitude: true,
      });
      if (parsed.error) errors.push(parsed.error);
      if (parsed.warning) warnings.push(parsed.warning);
      if (parsed.value !== undefined) forecast[key] = parsed.value;
    }
    if (Object.keys(forecast).length > 0) overrides.forecastInputs = forecast;
  }

  if (src.riskWaccInputs) {
    const risk: NonNullable<CompanyManualInputOverrides["riskWaccInputs"]> = {};
    for (const [key, label] of [
      ["riskfreeRate", "Risk-free rate"],
      ["equityRiskPremium", "ERP"],
      ["countryRiskPremium", "CRP"],
      ["preTaxCostOfDebt", "Pre-tax cost of debt"],
      ["targetDebtToCapital", "Target D/C"],
      ["marginalTaxRate", "Marginal tax"],
      ["beta", "Risk beta"],
    ] as const) {
      const raw = src.riskWaccInputs[key];
      if (raw === undefined) continue;
      const parsed = parseOptionalFiniteNumber(raw, {
        fieldLabel: label,
        allowPercentMagnitude: key !== "beta",
        min: key === "beta" ? -5 : undefined,
        max: key === "beta" ? 10 : undefined,
      });
      if (parsed.error) errors.push(parsed.error);
      if (parsed.warning) warnings.push(parsed.warning);
      if (parsed.value !== undefined) risk[key] = parsed.value;
    }
    if (Object.keys(risk).length > 0) overrides.riskWaccInputs = risk;
  }

  if (src.betaPolicyInputs) {
    const beta: NonNullable<CompanyManualInputOverrides["betaPolicyInputs"]> = {};
    const de = parseOptionalFiniteNumber(src.betaPolicyInputs.marketDebtToEquity, {
      fieldLabel: "Market D/E",
      min: 0,
      max: 50,
    });
    if (de.error) errors.push(de.error);
    if (de.value !== undefined) beta.marketDebtToEquity = de.value;

    const tax = parseOptionalFiniteNumber(src.betaPolicyInputs.selectedTaxRate, {
      fieldLabel: "Beta policy tax rate",
      allowPercentMagnitude: true,
    });
    if (tax.error) errors.push(tax.error);
    if (tax.value !== undefined) beta.selectedTaxRate = tax.value;

    if (Object.keys(beta).length > 0) overrides.betaPolicyInputs = beta;
  }

  if (src.waccFoundationInputs?.preTaxCostOfDebt !== undefined) {
    const preTax = parseOptionalFiniteNumber(src.waccFoundationInputs.preTaxCostOfDebt, {
      fieldLabel: "WACC pre-tax cost of debt",
      allowPercentMagnitude: true,
    });
    if (preTax.error) errors.push(preTax.error);
    if (preTax.value !== undefined) {
      overrides.waccFoundationInputs = { preTaxCostOfDebt: preTax.value };
    }
  }

  if (src.terminalValueInputs) {
    const terminal: NonNullable<CompanyManualInputOverrides["terminalValueInputs"]> = {};
    const growth = parseOptionalFiniteNumber(src.terminalValueInputs.terminalGrowthRate, {
      fieldLabel: "Terminal growth",
      allowPercentMagnitude: true,
    });
    if (growth.error) errors.push(growth.error);
    if (growth.value !== undefined) terminal.terminalGrowthRate = growth.value;

    const margin = parseOptionalFiniteNumber(src.terminalValueInputs.terminalMargin, {
      fieldLabel: "Terminal margin",
      allowPercentMagnitude: true,
    });
    if (margin.error) errors.push(margin.error);
    if (margin.value !== undefined) terminal.terminalMargin = margin.value;

    const method = sanitizeTerminalMethod(src.terminalValueInputs.terminalMethod);
    if (method.error) errors.push(method.error);
    if (method.value) terminal.terminalMethod = method.value;

    if (Object.keys(terminal).length > 0) overrides.terminalValueInputs = terminal;
  }

  if (src.balanceSheetBridgeInputs) {
    const bridge: NonNullable<CompanyManualInputOverrides["balanceSheetBridgeInputs"]> = {};
    for (const [key, label] of [
      ["cashAndCashEquivalents", "Cash"],
      ["marketableSecurities", "Marketable securities"],
      ["grossDebt", "Gross debt"],
      ["leaseLiabilities", "Lease liabilities"],
      ["minorityInterest", "Minority interest"],
      ["preferredEquity", "Preferred equity"],
      ["pensionDeficit", "Pension deficit"],
      ["otherClaims", "Other claims"],
    ] as const) {
      const raw = src.balanceSheetBridgeInputs[key];
      if (raw === undefined) continue;
      const parsed = parseOptionalFiniteNumber(raw, { fieldLabel: label });
      if (parsed.error) errors.push(parsed.error);
      if (parsed.value !== undefined) bridge[key] = parsed.value;
    }
    if (Object.keys(bridge).length > 0) overrides.balanceSheetBridgeInputs = bridge;
  }

  if (src.intrinsicValueFoundationInputs) {
    const intrinsic: NonNullable<CompanyManualInputOverrides["intrinsicValueFoundationInputs"]> =
      {};
    const shares = parseOptionalFiniteNumber(
      src.intrinsicValueFoundationInputs.selectedDilutedShares,
      { fieldLabel: "Diluted shares", min: 0 },
    );
    if (shares.error) errors.push(shares.error);
    if (shares.value !== undefined) intrinsic.selectedDilutedShares = shares.value;

    const unit = sanitizeShareUnit(src.intrinsicValueFoundationInputs.shareUnit);
    if (unit.error) errors.push(unit.error);
    if (unit.value) intrinsic.shareUnit = unit.value;

    const source = sanitizeTextField(
      src.intrinsicValueFoundationInputs.selectedSharesSource,
      "Shares source",
      300,
    );
    if (source.error) errors.push(source.error);
    else if (source.value) intrinsic.selectedSharesSource = source.value;

    const fx = parseOptionalFiniteNumber(
      src.intrinsicValueFoundationInputs.fxRateToValuationCurrency,
      { fieldLabel: "FX to valuation", min: 0 },
    );
    if (fx.error) errors.push(fx.error);
    if (fx.value !== undefined) intrinsic.fxRateToValuationCurrency = fx.value;

    if (Object.keys(intrinsic).length > 0) {
      overrides.intrinsicValueFoundationInputs = intrinsic;
    }
  }

  if (src.decisionLayerInputs) {
    const decision: NonNullable<CompanyManualInputOverrides["decisionLayerInputs"]> = {};
    const minMos = parseOptionalFiniteNumber(src.decisionLayerInputs.minimumMOSForApprove, {
      fieldLabel: "Minimum MOS",
      allowPercentMagnitude: true,
    });
    if (minMos.error) errors.push(minMos.error);
    if (minMos.value !== undefined) decision.minimumMOSForApprove = minMos.value;

    const floor = parseOptionalFiniteNumber(src.decisionLayerInputs.watchlistMOSFloor, {
      fieldLabel: "Watchlist MOS floor",
      allowPercentMagnitude: true,
    });
    if (floor.error) errors.push(floor.error);
    if (floor.value !== undefined) decision.watchlistMOSFloor = floor.value;

    const note = sanitizeTextField(
      src.decisionLayerInputs.analystOverrideNote,
      "Analyst note",
      2000,
    );
    if (note.error) errors.push(note.error);
    else if (note.value) decision.analystOverrideNote = note.value;

    if (Object.keys(decision).length > 0) overrides.decisionLayerInputs = decision;
  }

  if (src.historicalLtm) {
    const historical: NonNullable<CompanyManualInputOverrides["historicalLtm"]> = {};
    const revenue = parseOptionalFiniteNumber(src.historicalLtm.revenue, {
      fieldLabel: "LTM revenue",
    });
    if (revenue.error) errors.push(revenue.error);
    if (revenue.value !== undefined) historical.revenue = revenue.value;

    const fcf = parseOptionalFiniteNumber(src.historicalLtm.freeCashFlow, {
      fieldLabel: "LTM FCF",
    });
    if (fcf.error) errors.push(fcf.error);
    if (fcf.value !== undefined) historical.freeCashFlow = fcf.value;

    if (Object.keys(historical).length > 0) overrides.historicalLtm = historical;
  }

  return {
    payload: {
      overrides,
      source: input.source ?? "user",
    },
    warnings,
    errors,
  };
}
