import { NextRequest, NextResponse } from "next/server";
import { generateAndPersistSectorMappingCandidates } from "@/lib/firestore/repositories/sectorIndustryMappingRepository";

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
    const payload = await generateAndPersistSectorMappingCandidates();
    return NextResponse.json(
      {
        success: payload.success,
        rowsEvaluated: payload.rowsEvaluated,
        candidatesGenerated: payload.candidatesGenerated,
        primaryValidCount: payload.primaryValidCount,
        primaryInvalidCount: payload.primaryInvalidCount,
        mappingRequiredCount: payload.mappingRequiredCount,
        reviewRequiredCount: payload.reviewRequiredCount,
        okCount: payload.okCount,
        excludedSpecialReviewCount: payload.excludedSpecialReviewCount,
        warnings: payload.warnings,
        errors: payload.errors,
      },
      { status: 200 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        rowsEvaluated: 0,
        candidatesGenerated: 0,
        primaryValidCount: 0,
        primaryInvalidCount: 0,
        mappingRequiredCount: 0,
        reviewRequiredCount: 0,
        okCount: 0,
        excludedSpecialReviewCount: 0,
        warnings: [],
        errors: [error instanceof Error ? error.message : "Unknown candidate generation error."],
      },
      { status: 200 },
    );
  }
}
