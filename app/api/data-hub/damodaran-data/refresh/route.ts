import { NextRequest, NextResponse } from "next/server";
import { refreshDamodaranDataVaultFromLocalFiles } from "@/lib/firestore/repositories/damodaranDataRepository";

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    return NextResponse.json(
      { success: false, error: "CRON_SECRET is not configured." },
      { status: 500 },
    );
  }

  if (!authHeader || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await refreshDamodaranDataVaultFromLocalFiles();
    return NextResponse.json(
      {
        success: result.ok,
        summary: result.summary,
        error: result.error,
      },
      { status: 200 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown Damodaran data vault refresh error.",
      },
      { status: 500 },
    );
  }
}
