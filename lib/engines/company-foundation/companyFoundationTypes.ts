import type { computeBetaPolicyForCompany } from "@/lib/engines/beta/betaPolicyService";
import type { computeDcfPvForCompany } from "@/lib/engines/dcf-pv/dcfPvService";
import type { computeEquityBridgeForCompany } from "@/lib/engines/equity-bridge/equityBridgeService";
import type { computeForecastFadeForCompany } from "@/lib/engines/forecast-fade/forecastFadeService";
import type { computeIntrinsicValueForCompany } from "@/lib/engines/intrinsic-value/intrinsicValueService";
import type { computeMosDecisionForCompany } from "@/lib/engines/mos-decision/mosDecisionService";
import type { computeReinvestmentFcffForCompany } from "@/lib/engines/reinvestment-fcff/reinvestmentFcffService";
import type { computeTerminalValueForCompany } from "@/lib/engines/terminal-value/terminalValueService";
import type { computeWaccForCompany } from "@/lib/engines/wacc/waccService";

export type BetaPolicyFoundationBundle = Awaited<ReturnType<typeof computeBetaPolicyForCompany>>;
export type WaccFoundationBundle = Awaited<ReturnType<typeof computeWaccForCompany>>;
export type ForecastFadeFoundationBundle = Awaited<ReturnType<typeof computeForecastFadeForCompany>>;
export type ReinvestmentFcffFoundationBundle = Awaited<
  ReturnType<typeof computeReinvestmentFcffForCompany>
>;
export type TerminalValueFoundationBundle = Awaited<ReturnType<typeof computeTerminalValueForCompany>>;
export type DcfPvFoundationBundle = Awaited<ReturnType<typeof computeDcfPvForCompany>>;
export type EquityBridgeFoundationBundle = Awaited<ReturnType<typeof computeEquityBridgeForCompany>>;
export type IntrinsicValueFoundationBundle = Awaited<
  ReturnType<typeof computeIntrinsicValueForCompany>
>;
export type MosDecisionFoundationBundle = Awaited<ReturnType<typeof computeMosDecisionForCompany>>;

/** Pre-computed upstream engine bundles — avoids duplicate engine chains per request. */
export type CompanyFoundationUpstream = {
  betaPolicyBundle?: BetaPolicyFoundationBundle;
  waccBundle?: WaccFoundationBundle;
  forecastFadeBundle?: ForecastFadeFoundationBundle;
  reinvestmentFcffBundle?: ReinvestmentFcffFoundationBundle;
  terminalValueBundle?: TerminalValueFoundationBundle;
  dcfPvBundle?: DcfPvFoundationBundle;
  equityBridgeBundle?: EquityBridgeFoundationBundle;
  intrinsicValueBundle?: IntrinsicValueFoundationBundle;
};

export type FoundationComputeOptions = {
  upstream?: CompanyFoundationUpstream;
};

/** Beta → Intrinsic only — excludes MOS / market decision overlay. */
export type CompanyValuationFoundationBundle = {
  betaPolicy: BetaPolicyFoundationBundle | null;
  wacc: WaccFoundationBundle | null;
  forecastFade: ForecastFadeFoundationBundle | null;
  reinvestmentFcff: ReinvestmentFcffFoundationBundle | null;
  terminalValue: TerminalValueFoundationBundle | null;
  dcfPv: DcfPvFoundationBundle | null;
  equityBridge: EquityBridgeFoundationBundle | null;
  intrinsicValue: IntrinsicValueFoundationBundle | null;
};

export type CompanyFoundationBundle = CompanyValuationFoundationBundle & {
  mosDecision: MosDecisionFoundationBundle | null;
};

export type FoundationEngineTimingMs = Record<string, number>;

export type CompanyFoundationBundleResult = CompanyFoundationBundle & {
  timingMs?: FoundationEngineTimingMs;
  totalMs?: number;
};
