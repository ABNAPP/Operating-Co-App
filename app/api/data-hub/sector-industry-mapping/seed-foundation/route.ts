import { NextRequest, NextResponse } from "next/server";
import { seedSectorIndustryMappingFoundation } from "@/lib/firestore/repositories/sectorIndustryMappingRepository";

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
    const payload = await seedSectorIndustryMappingFoundation();
    return NextResponse.json(
      {
        success: payload.success,
        ismSectorCount: payload.ismSectorCount,
        mappingRowsCount: payload.mappingRowsCount,
        mappingRequiredCount: payload.mappingRequiredCount,
        excludedSpecialReviewCount: payload.excludedSpecialReviewCount,
        reviewRequiredCount: payload.reviewRequiredCount,
        industryMasterListAvailable: payload.industryMasterListAvailable,
        warnings: payload.warnings,
        errors: payload.errors,
      },
      { status: 200 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        errors: [error instanceof Error ? error.message : "Unknown seed foundation error."],
      },
      { status: 200 },
    );
  }
}
