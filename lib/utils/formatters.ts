export type ValueScale = "millions" | "absolute";

export interface NumberFormatOptions {
  decimals?: number;
  locale?: string;
  useGrouping?: boolean;
}

export interface PercentFormatOptions extends NumberFormatOptions {
  /** When true, always treat input as decimal (0.1234 -> 12.34%). */
  forceDecimal?: boolean;
  /** When true, always treat input as already percent-scaled (12.34 -> 12.34%). */
  forcePercentScale?: boolean;
}

export interface AmountMillionsFormatOptions extends NumberFormatOptions {
  valueScale?: ValueScale;
  currency?: string;
  suffix?: string;
}

const DEFAULT_LOCALE = "en-US";
const DEFAULT_DECIMALS = 2;
const FX_DECIMALS = 4;

function isNil(value: unknown): value is null | undefined {
  return value === null || value === undefined;
}

/** Parse numeric strings including Damodaran-style comma decimals and percent suffix. */
export function parseNumericString(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return null;
  }

  const withoutPercent = trimmed.replace(/%/g, "").trim();
  const normalized = withoutPercent.replace(/\s/g, "");

  if (!/^-?[\d.,]+$/.test(normalized)) {
    return null;
  }

  const hasDot = normalized.includes(".");
  const hasComma = normalized.includes(",");

  let canonical = normalized;
  if (hasDot && hasComma) {
    const lastDot = normalized.lastIndexOf(".");
    const lastComma = normalized.lastIndexOf(",");
    canonical =
      lastComma > lastDot
        ? normalized.replace(/\./g, "").replace(",", ".")
        : normalized.replace(/,/g, "");
  } else if (hasComma && !hasDot) {
    canonical = normalized.replace(",", ".");
  }

  const parsed = Number(canonical);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatWithDecimals(
  value: number,
  options?: NumberFormatOptions,
): string {
  const decimals = options?.decimals ?? DEFAULT_DECIMALS;
  const locale = options?.locale ?? DEFAULT_LOCALE;
  const useGrouping = options?.useGrouping ?? true;
  return value.toLocaleString(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
    useGrouping,
  });
}

export function formatNumber(
  value: number | null | undefined,
  options?: NumberFormatOptions,
): string {
  if (isNil(value) || Number.isNaN(value)) {
    return "N/A";
  }
  return formatWithDecimals(value, options);
}

export function formatPercent(
  value: number | null | undefined,
  options?: PercentFormatOptions,
): string {
  if (isNil(value)) {
    return "N/A";
  }
  const numeric = typeof value === "number" ? value : parseNumericString(String(value));
  if (numeric === null || Number.isNaN(numeric)) {
    return "N/A";
  }

  let percentValue = numeric;
  if (options?.forcePercentScale) {
    percentValue = numeric;
  } else if (options?.forceDecimal) {
    percentValue = numeric * 100;
  } else if (Math.abs(numeric) <= 1) {
    percentValue = numeric * 100;
  }

  return `${formatWithDecimals(percentValue, options)}%`;
}

export function formatAmountMillions(
  value: number | null | undefined,
  options?: AmountMillionsFormatOptions,
): string {
  if (isNil(value)) {
    return "N/A";
  }
  const numeric = typeof value === "number" ? value : parseNumericString(String(value));
  if (numeric === null || Number.isNaN(numeric)) {
    return "N/A";
  }

  const scale = options?.valueScale ?? "millions";
  const millionsValue = scale === "absolute" ? numeric / 1_000_000 : numeric;
  const suffix = options?.suffix ?? "m";
  const formatted = formatWithDecimals(millionsValue, options);
  const currency = options?.currency?.trim();
  return currency ? `${currency} ${formatted}${suffix}` : `${formatted}${suffix}`;
}

export function formatFxRate(value: number | null | undefined): string {
  if (isNil(value) || Number.isNaN(value)) {
    return "N/A";
  }
  return formatWithDecimals(value, { decimals: FX_DECIMALS });
}

export function formatPerShare(
  value: number | null | undefined,
  options?: NumberFormatOptions & { currency?: string },
): string {
  const formatted = formatNumber(value, options);
  if (formatted === "N/A") {
    return formatted;
  }
  return options?.currency ? `${options.currency} ${formatted}` : formatted;
}

export function formatDate(value: string | Date | null | undefined): string {
  if (isNil(value) || value === "") {
    return "N/A";
  }
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? "N/A" : value.toISOString().slice(0, 10);
  }
  return String(value);
}

function normalizeKey(value: string) {
  return value.trim().toLowerCase();
}

function shouldSkipNumericFormatting(columnName: string): boolean {
  const key = normalizeKey(columnName);
  return (
    /(^|\/|\b)(id|ids|ticker|code|status|notes?|name|industry name|series|fred|dataset|zip|postal)(\b|\/|$)/.test(
      key,
    ) ||
    /source date|update date|imported|last updated|created|modified|date updated/.test(key) ||
    /^(year|fiscal year|yr)(s)?$/.test(key) ||
    /historical beta year|beta year/.test(key)
  );
}

function isCountColumn(columnName: string): boolean {
  const key = normalizeKey(columnName);
  return (
    /number of firms|# of firms|firm count|row count|country count|mapping count|active mapping count/.test(
      key,
    ) || key === "count"
  );
}

function isFxColumn(combinedKey: string): boolean {
  return (
    /\bfx\b/.test(combinedKey) ||
    /exchange rate/.test(combinedKey) ||
    /(^| )rate( |$)/.test(combinedKey) && /fx|currency pair|from currency|to currency/.test(combinedKey)
  );
}

function isBetaColumn(combinedKey: string): boolean {
  return /\bbeta\b/.test(combinedKey) && !/beta year/.test(combinedKey);
}

function isMultipleColumn(combinedKey: string): boolean {
  return (
    /\b(pe|pbv|ps|p\/e|p\/s|peg|ev\/ebitda|ev\/sales|ev\/ebit|price\/sales|price\/book)\b/.test(
      combinedKey,
    ) || /\bmultiple(s)?\b/.test(combinedKey)
  );
}

function isPercentColumn(combinedKey: string): boolean {
  if (isBetaColumn(combinedKey) || isMultipleColumn(combinedKey)) {
    return false;
  }
  return (
    /%/.test(combinedKey) ||
    /\b(margin|rate|yield|tax|growth|roc|roic|reinvestment|spread|premium|erp|wacc|return|roe|roa|volatility|correlation|mos)\b/.test(
      combinedKey,
    ) ||
    /cost of (equity|debt|capital)/.test(combinedKey) ||
    /default spread/.test(combinedKey)
  );
}

function isAmountColumn(combinedKey: string): boolean {
  return (
    /\b(revenue|sales|market cap|market capitalization|debt|cash|enterprise value|firm value|ebit|ebitda|net income|book equity|invested capital|cap ex|capex|fcf|fcff|fcfe|dividend|acquisition|r&d|rd)\b/.test(
      combinedKey,
    ) ||
    /\b(in \$ millions|in millions|usd m|usdm|sek m)\b/.test(combinedKey) ||
    /\$/.test(combinedKey)
  );
}

function isYearValue(columnName: string, value: number): boolean {
  const key = normalizeKey(columnName);
  if (!/year/.test(key)) {
    return false;
  }
  return Number.isInteger(value) && value >= 1900 && value <= 2100;
}

export function formatColumnHeader(
  columnName: string,
  options?: { currency?: string },
): string {
  const key = normalizeKey(columnName);
  if (/\(m\)|\(usdm\)|\(sek m\)|\(.*m\)|%/.test(key)) {
    return columnName;
  }
  if (isAmountColumn(key)) {
    const currency = options?.currency?.trim();
    if (currency) {
      return `${columnName} (${currency}m)`;
    }
    return `${columnName} (m)`;
  }
  return columnName;
}

export function formatTableCell(
  value: unknown,
  columnName: string,
  datasetContext?: string,
): string {
  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed === "") {
      return "";
    }
    if (shouldSkipNumericFormatting(columnName)) {
      return value;
    }
    const parsed = parseNumericString(trimmed);
    if (parsed === null) {
      return value;
    }
    return formatTableCell(parsed, columnName, datasetContext);
  }

  if (typeof value !== "number") {
    return String(value);
  }

  if (Number.isNaN(value)) {
    return "N/A";
  }

  const combinedKey = normalizeKey(`${columnName} ${datasetContext ?? ""}`);

  if (shouldSkipNumericFormatting(columnName)) {
    if (Number.isInteger(value) && Math.abs(value) < 100000) {
      return String(value);
    }
    return formatNumber(value);
  }

  if (isCountColumn(columnName) && Number.isInteger(value)) {
    return String(value);
  }

  if (isYearValue(columnName, value)) {
    return String(value);
  }

  if (isFxColumn(combinedKey)) {
    return formatFxRate(value);
  }

  if (isBetaColumn(combinedKey)) {
    return formatNumber(value);
  }

  if (isMultipleColumn(combinedKey)) {
    return formatNumber(value);
  }

  if (isPercentColumn(combinedKey)) {
    return formatPercent(value);
  }

  if (isAmountColumn(combinedKey)) {
    return formatAmountMillions(value);
  }

  return formatNumber(value);
}
