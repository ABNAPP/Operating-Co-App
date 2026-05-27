import { NextRequest, NextResponse } from "next/server";
import {
  DEFAULT_DEV_SEED_TICKER,
  seedSingleCompanyValuation,
} from "@/lib/valuation-persistence/seedSingleCompanyValuation";

function unauthorized() {
  return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
}

function requireCronSecret(request: NextRequest): NextResponse | null {
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    return NextResponse.json(
      {
        success: false,
        error: "CRON_SECRET is not configured in .env.local",
      },
      { status: 500 },
    );
  }

  const authHeader = request.headers.get("authorization");
  if (!authHeader || authHeader !== `Bearer ${cronSecret}`) {
    return unauthorized();
  }

  return null;
}

/**
 * GET — usage instructions (no auth required).
 */
export async function GET() {
  return NextResponse.json({
    description:
      "Dev seed: compute full valuation foundation for one company and write valuationResults + dashboardRows to Firestore.",
    method: "POST",
    auth: "Authorization: Bearer <CRON_SECRET>",
    defaultTicker: DEFAULT_DEV_SEED_TICKER,
    examples: {
      curlMsft: `curl -X POST "http://localhost:3000/api/dev/seed-valuation-result" -H "Authorization: Bearer $CRON_SECRET" -H "Content-Type: application/json" -d "{\\"cleanTicker\\":\\"MSFT\\"}"`,
      curlPowerShell: `$h = @{ Authorization = "Bearer $env:CRON_SECRET"; "Content-Type" = "application/json" }; Invoke-RestMethod -Method POST -Uri "http://localhost:3000/api/dev/seed-valuation-result" -Headers $h -Body '{"cleanTicker":"MSFT"}'`,
    },
    requirements: [
      "Firebase Admin: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY",
      "CRON_SECRET in .env.local",
      "npm run dev running",
    ],
    firestorePaths: [
      "valuationResults/{cleanTicker}",
      "dashboardRows/{cleanTicker}",
    ],
  });
}

/**
 * POST — run seed for one company.
 * Body (optional): { "cleanTicker": "MSFT", "refresh": true }
 * Query (optional): ?cleanTicker=MSFT
 */
export async function POST(request: NextRequest) {
  const authError = requireCronSecret(request);
  if (authError) return authError;

  let cleanTicker = request.nextUrl.searchParams.get("cleanTicker") ?? undefined;
  let refresh = true;

  try {
    const body = (await request.json()) as {
      cleanTicker?: string;
      refresh?: boolean;
    };
    cleanTicker = body.cleanTicker ?? cleanTicker;
    if (typeof body.refresh === "boolean") {
      refresh = body.refresh;
    }
  } catch {
    // Empty body is fine — use query/default ticker.
  }

  try {
    const result = await seedSingleCompanyValuation({
      cleanTicker,
      refresh,
    });

    const status = result.success ? 200 : 500;

    return NextResponse.json(
      {
        success: result.success,
        cleanTicker: result.cleanTicker,
        companyName: result.companyName,
        companySource: result.companySource,
        selectedBenchmark: result.selectedBenchmark,
        officialIntrinsicValuePerShare: result.officialIntrinsicValuePerShare,
        foundationDecisionOutcome: result.foundationDecisionOutcome,
        foundationReadinessStatus: result.foundationReadinessStatus,
        computeTotalMs: result.computeTotalMs,
        referenceDataStamp: result.referenceDataStamp,
        fingerprints: {
          valuationInputFingerprint: result.valuationInputFingerprint,
          marketOverlayFingerprint: result.marketOverlayFingerprint,
        },
        firestore: result.firestore,
        errors: result.errors,
        verifyInConsole: [
          `valuationResults/${result.cleanTicker}`,
          `dashboardRows/${result.cleanTicker}`,
        ],
      },
      { status },
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown dev seed error.",
      },
      { status: 500 },
    );
  }
}
