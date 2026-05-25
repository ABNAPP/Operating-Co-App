import { NextRequest, NextResponse } from "next/server";
import { refreshFxRatesFromProviderPriority } from "@/lib/data-hub/fxRefreshService";

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
    const summary = await refreshFxRatesFromProviderPriority();
    return NextResponse.json(summary, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        status: "FX Refresh Failed",
        error: error instanceof Error ? error.message : "Unknown FX refresh error.",
      },
      { status: 200 },
    );
  }
}
