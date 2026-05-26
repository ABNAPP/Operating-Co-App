import "server-only";
import fs from "node:fs/promises";
import path from "node:path";
import type { FxPairRateRow } from "@/lib/types";

const FX_CACHE_DIR = path.join(process.cwd(), "data", "fx", "cache");
const FX_CACHE_FILE_PATH = path.join(FX_CACHE_DIR, "fx-rates-cache.json");

interface FxCacheState {
  rows: FxPairRateRow[];
  updatedAt: string;
}

let inMemoryFxCache: FxCacheState | null = null;

export async function readFxRatesCache(): Promise<FxPairRateRow[] | null> {
  if (inMemoryFxCache?.rows?.length) {
    return inMemoryFxCache.rows;
  }

  try {
    const content = await fs.readFile(FX_CACHE_FILE_PATH, "utf8");
    const parsed = JSON.parse(content) as FxCacheState;
    inMemoryFxCache = parsed;
    return parsed.rows ?? [];
  } catch {
    return null;
  }
}

export async function writeFxRatesCache(rows: FxPairRateRow[]) {
  const payload: FxCacheState = {
    rows,
    updatedAt: new Date().toISOString(),
  };
  await fs.mkdir(FX_CACHE_DIR, { recursive: true });
  await fs.writeFile(FX_CACHE_FILE_PATH, JSON.stringify(payload), "utf8");
  inMemoryFxCache = payload;
}
