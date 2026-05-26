import "server-only";
import {
  getBetaReadinessForBenchmark,
  getBetaReferenceForBenchmark,
} from "@/lib/engines/beta/betaReferenceService";
import {
  buildBetaPolicyInputFromReference,
  computeBetaPolicy,
} from "@/lib/engines/beta/betaPolicyMath";
import type {
  BetaLookupResult,
  BetaPolicyResult,
  BetaReadinessStatus,
  CompanyBetaPolicyInputs,
} from "@/lib/types/beta-engine";
import type { CompanyDataModel } from "@/lib/types/company";

export {
  RELEVERING_FORMULA,
  computeBetaPolicy,
  computeReleveredBeta,
  buildBetaPolicyInputFromReference,
} from "@/lib/engines/beta/betaPolicyMath";

export async function computeBetaPolicyForBenchmark(
  benchmarkName: string,
  capitalInputs: CompanyBetaPolicyInputs = {},
): Promise<{
  lookup: BetaLookupResult;
  readiness: BetaReadinessStatus;
  policy: BetaPolicyResult;
}> {
  const lookup = await getBetaReferenceForBenchmark(benchmarkName);
  const readiness = await getBetaReadinessForBenchmark(benchmarkName);
  const policyInput = buildBetaPolicyInputFromReference(lookup, capitalInputs);
  const policy = computeBetaPolicy(policyInput);

  if (lookup.matchType === "Missing" && policy.status !== "Not Applicable") {
    policy.status = "Missing";
    policy.errors.push("Beta reference row missing — policy cannot proceed.");
    policy.selectedBeta = null;
  }

  return { lookup, readiness, policy };
}

export async function computeBetaPolicyForCompany(
  company: CompanyDataModel,
): Promise<{
  lookup: BetaLookupResult;
  readiness: BetaReadinessStatus;
  policy: BetaPolicyResult;
}> {
  const benchmark = company.identity.damodaranIndustrialBenchmark ?? "";
  return computeBetaPolicyForBenchmark(benchmark, company.betaPolicyInputs ?? {});
}
