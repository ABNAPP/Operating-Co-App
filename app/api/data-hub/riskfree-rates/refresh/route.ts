import { NextRequest, NextResponse } from "next/server";
import { refreshRiskfreeRatesFromFred } from "@/lib/data-hub/riskfreeRefreshService";

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
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  try {
    const summary = await refreshRiskfreeRatesFromFred();
    return NextResponse.json(summary, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown riskfree refresh error.",
      },
      { status: 500 },
    );
  }
}
