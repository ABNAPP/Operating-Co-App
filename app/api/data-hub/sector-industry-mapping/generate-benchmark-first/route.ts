import { NextRequest, NextResponse } from "next/server";
import { generateAndPersistBenchmarkToIsmCandidates } from "@/lib/firestore/repositories/sectorIndustryMappingRepository";

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    return NextResponse.json(
      { success: false, errors: ["CRON_SECRET is not configured."] },
      { status: 500 },
    );
  }

  if (!authHeader || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const payload = await generateAndPersistBenchmarkToIsmCandidates();
    return NextResponse.json(
      {
        success: payload.success,
        rawIndustryCount: payload.rawIndustryCount,
        canonicalIndustryCount: payload.canonicalIndustryCount,
        variantsExcluded: payload.variantsExcluded,
        nonIndustryExcluded: payload.nonIndustryExcluded,
        benchmarksEvaluated: payload.benchmarksEvaluated,
        mappingsGenerated: payload.mappingsGenerated,
        highConfidenceCount: payload.highConfidenceCount,
        mediumConfidenceCount: payload.mediumConfidenceCount,
        lowConfidenceCount: payload.lowConfidenceCount,
        stageDefaultsPopulated: payload.stageDefaultsPopulated,
        cyclicalityDefaultsPopulated: payload.cyclicalityDefaultsPopulated,
        historyDefaultsPopulated: payload.historyDefaultsPopulated,
        reviewRequiredCount: payload.reviewRequiredCount,
        excludedSpecialReviewCount: payload.excludedSpecialReviewCount,
        unmappedCount: payload.unmappedCount,
        warnings: payload.warnings,
        errors: payload.errors,
      },
      { status: 200 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        rawIndustryCount: 0,
        canonicalIndustryCount: 0,
        variantsExcluded: 0,
        nonIndustryExcluded: 0,
        benchmarksEvaluated: 0,
        mappingsGenerated: 0,
        highConfidenceCount: 0,
        mediumConfidenceCount: 0,
        lowConfidenceCount: 0,
        stageDefaultsPopulated: 0,
        cyclicalityDefaultsPopulated: 0,
        historyDefaultsPopulated: 0,
        reviewRequiredCount: 0,
        excludedSpecialReviewCount: 0,
        unmappedCount: 0,
        warnings: [],
        errors: [
          error instanceof Error ? error.message : "Unknown benchmark-first mapping generation error.",
        ],
      },
      { status: 200 },
    );
  }
}
