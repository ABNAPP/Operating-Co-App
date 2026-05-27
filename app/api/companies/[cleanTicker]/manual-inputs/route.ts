import { NextRequest, NextResponse } from "next/server";
import type { ManualInputsWorkspaceModel } from "@/lib/company-workspace/manualInputsWorkspaceModel";
import {
  loadCompanyManualInputs,
  saveCompanyManualInputsFromWorkspace,
} from "@/lib/company-workspace/manualInputsPersistenceService";
import { getDamodaranIndustryUniverse } from "@/lib/firestore/repositories/sectorIndustryMappingRepository";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ cleanTicker: string }> },
) {
  const { cleanTicker } = await params;
  const result = await loadCompanyManualInputs(cleanTicker);

  return NextResponse.json({
    ok: true,
    data: result.data,
    source: result.source,
    error: result.error ?? null,
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ cleanTicker: string }> },
) {
  const { cleanTicker } = await params;

  let body: { draft?: ManualInputsWorkspaceModel };
  try {
    body = (await request.json()) as { draft?: ManualInputsWorkspaceModel };
  } catch {
    return NextResponse.json(
      { ok: false, errors: ["Invalid JSON body."], warnings: [] },
      { status: 400 },
    );
  }

  const draft = body.draft;
  if (!draft || typeof draft.cleanTicker !== "string") {
    return NextResponse.json(
      { ok: false, errors: ["Missing draft payload."], warnings: [] },
      { status: 400 },
    );
  }

  if (draft.cleanTicker.trim() !== cleanTicker.trim()) {
    return NextResponse.json(
      {
        ok: false,
        errors: ["Draft cleanTicker does not match URL."],
        warnings: [],
      },
      { status: 400 },
    );
  }

  const universe = await getDamodaranIndustryUniverse();
  const allowedBenchmarks = universe.data.map((row) => row.damodaranIndustrialBenchmark);

  const result = await saveCompanyManualInputsFromWorkspace(draft, { allowedBenchmarks });

  if (!result.ok) {
    return NextResponse.json(
      {
        ok: false,
        errors: result.errors,
        warnings: result.warnings,
        shouldInvalidateFoundationCache: result.shouldInvalidateFoundationCache,
      },
      { status: 422 },
    );
  }

  return NextResponse.json({
    ok: true,
    document: result.document,
    warnings: result.warnings,
    shouldInvalidateFoundationCache: result.shouldInvalidateFoundationCache,
  });
}
