import "server-only";

import type { CompanyDataModel } from "@/lib/types/company";
import { computeBetaPolicyForCompany } from "@/lib/engines/beta/betaPolicyService";
import { computeDcfPvForCompany } from "@/lib/engines/dcf-pv/dcfPvService";
import { computeEquityBridgeForCompany } from "@/lib/engines/equity-bridge/equityBridgeService";
import {
  isFoundationDevTimingEnabled,
  logCompanyFoundationTiming,
  timeFoundationEngine,
} from "@/lib/engines/company-foundation/foundationDevTiming";
import type {
  CompanyFoundationBundleResult,
  CompanyValuationFoundationBundle,
} from "@/lib/engines/company-foundation/companyFoundationTypes";
import { computeForecastFadeForCompany } from "@/lib/engines/forecast-fade/forecastFadeService";
import { computeIntrinsicValueForCompany } from "@/lib/engines/intrinsic-value/intrinsicValueService";
import { computeMosDecisionForCompany } from "@/lib/engines/mos-decision/mosDecisionService";
import { computeReinvestmentFcffForCompany } from "@/lib/engines/reinvestment-fcff/reinvestmentFcffService";
import { computeTerminalValueForCompany } from "@/lib/engines/terminal-value/terminalValueService";
import { computeWaccForCompany } from "@/lib/engines/wacc/waccService";

const emptyValuationBundle: CompanyValuationFoundationBundle = {
  betaPolicy: null,
  wacc: null,
  forecastFade: null,
  reinvestmentFcff: null,
  terminalValue: null,
  dcfPv: null,
  equityBridge: null,
  intrinsicValue: null,
};

const emptyBundle: CompanyFoundationBundleResult = {
  ...emptyValuationBundle,
  mosDecision: null,
};

/**
 * Valuation foundation only: Beta → WACC → … → Intrinsic (no MOS / market overlay).
 */
export async function computeValuationFoundationBundle(
  company: CompanyDataModel,
): Promise<CompanyValuationFoundationBundle> {
  const selectedBenchmark = company.identity.damodaranIndustrialBenchmark ?? "";
  if (!selectedBenchmark.trim()) {
    return emptyValuationBundle;
  }

  const timingMs: Record<string, number> = {};

  const betaPolicy = await timeFoundationEngine("betaPolicy", timingMs, () =>
    computeBetaPolicyForCompany(company),
  );

  const [wacc, forecastFade, reinvestmentFcff] = await Promise.all([
    timeFoundationEngine("wacc", timingMs, () =>
      computeWaccForCompany(company, { upstream: { betaPolicyBundle: betaPolicy } }),
    ),
    timeFoundationEngine("forecastFade", timingMs, () => computeForecastFadeForCompany(company)),
    timeFoundationEngine("reinvestmentFcff", timingMs, () =>
      computeReinvestmentFcffForCompany(company),
    ),
  ]);

  const terminalValue = await timeFoundationEngine("terminalValue", timingMs, () =>
    computeTerminalValueForCompany(company, {
      upstream: { forecastFadeBundle: forecastFade, waccBundle: wacc, reinvestmentFcffBundle: reinvestmentFcff },
    }),
  );

  const dcfPv = await timeFoundationEngine("dcfPv", timingMs, () =>
    computeDcfPvForCompany(company, {
      upstream: {
        reinvestmentFcffBundle: reinvestmentFcff,
        terminalValueBundle: terminalValue,
        waccBundle: wacc,
      },
    }),
  );

  const equityBridge = await timeFoundationEngine("equityBridge", timingMs, () =>
    computeEquityBridgeForCompany(company, { upstream: { dcfPvBundle: dcfPv } }),
  );

  const intrinsicValue = await timeFoundationEngine("intrinsicValue", timingMs, () =>
    computeIntrinsicValueForCompany(company, { upstream: { equityBridgeBundle: equityBridge } }),
  );

  return {
    betaPolicy,
    wacc,
    forecastFade,
    reinvestmentFcff,
    terminalValue,
    dcfPv,
    equityBridge,
    intrinsicValue,
  };
}

/**
 * Market / MOS overlay only — uses pre-computed intrinsic bundle (no valuation chain rerun).
 */
export async function computeMarketDecisionOverlay(
  company: CompanyDataModel,
  valuationBundle: CompanyValuationFoundationBundle,
) {
  return computeMosDecisionForCompany(company, {
    upstream: { intrinsicValueBundle: valuationBundle.intrinsicValue ?? undefined },
  });
}

function assembleFoundationBundleResult(
  companyId: string,
  valuationBundle: CompanyValuationFoundationBundle,
  mosDecision: Awaited<ReturnType<typeof computeMarketDecisionOverlay>>,
  timingMs?: Record<string, number>,
  totalMs?: number,
): CompanyFoundationBundleResult {
  if (totalMs !== undefined && timingMs) {
    logCompanyFoundationTiming(companyId, timingMs, totalMs);
  }

  return {
    ...valuationBundle,
    mosDecision,
    timingMs,
    totalMs,
  };
}

/**
 * Full foundation bundle: valuation foundation + MOS overlay.
 */
export async function computeCompanyFoundationBundle(
  company: CompanyDataModel,
): Promise<CompanyFoundationBundleResult> {
  const selectedBenchmark = company.identity.damodaranIndustrialBenchmark ?? "";
  if (!selectedBenchmark.trim()) {
    return emptyBundle;
  }

  const timingMs: Record<string, number> = {};
  const totalStart = isFoundationDevTimingEnabled() ? performance.now() : 0;

  const valuationBundle = await computeValuationFoundationBundle(company);

  const mosDecision = await timeFoundationEngine("mosDecision", timingMs, () =>
    computeMarketDecisionOverlay(company, valuationBundle),
  );

  const totalMs =
    isFoundationDevTimingEnabled() && totalStart > 0
      ? Math.round((performance.now() - totalStart) * 100) / 100
      : undefined;

  return assembleFoundationBundleResult(
    company.identity.cleanTicker,
    valuationBundle,
    mosDecision,
    isFoundationDevTimingEnabled() ? timingMs : undefined,
    totalMs,
  );
}

export { isFoundationDevTimingEnabled };
