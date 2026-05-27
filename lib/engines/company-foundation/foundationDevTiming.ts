import type { FoundationEngineTimingMs } from "@/lib/engines/company-foundation/companyFoundationTypes";

const isDevTimingEnabled =
  process.env.NODE_ENV === "development" ||
  process.env.COMPANY_FOUNDATION_TIMING === "1";

export function isFoundationDevTimingEnabled(): boolean {
  return isDevTimingEnabled;
}

export async function timeFoundationEngine<T>(
  label: string,
  timingMs: FoundationEngineTimingMs,
  fn: () => Promise<T>,
): Promise<T> {
  if (!isDevTimingEnabled) {
    return fn();
  }

  const start = performance.now();
  try {
    return await fn();
  } finally {
    timingMs[label] = Math.round((performance.now() - start) * 100) / 100;
  }
}

export function logCompanyFoundationTiming(
  companyId: string,
  timingMs: FoundationEngineTimingMs,
  totalMs: number,
): void {
  if (!isDevTimingEnabled) {
    return;
  }

  console.info("[company-foundation]", {
    companyId,
    totalMs,
    engines: timingMs,
  });
}
