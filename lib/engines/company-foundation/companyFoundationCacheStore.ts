import type {
  FoundationBundleCacheStore,
  FoundationCacheStoreEntry,
} from "@/lib/engines/company-foundation/companyFoundationCacheTypes";

const DEFAULT_TTL_MS = 30 * 60 * 1000;
const DEFAULT_MAX_ENTRIES = 50;

type MemoryEntry = FoundationCacheStoreEntry & {
  lastAccessMs: number;
};

export class InMemoryFoundationBundleCacheStore implements FoundationBundleCacheStore {
  private readonly entries = new Map<string, MemoryEntry>();
  private readonly ttlMs: number;
  private readonly maxEntries: number;

  constructor(options?: { ttlMs?: number; maxEntries?: number }) {
    this.ttlMs = options?.ttlMs ?? DEFAULT_TTL_MS;
    this.maxEntries = options?.maxEntries ?? DEFAULT_MAX_ENTRIES;
  }

  get(companyId: string): FoundationCacheStoreEntry | undefined {
    this.evictExpired();
    const entry = this.entries.get(companyId);
    if (!entry) return undefined;

    if (Date.now() - entry.cachedAtMs > this.ttlMs) {
      this.entries.delete(companyId);
      return undefined;
    }

    entry.lastAccessMs = Date.now();
    return entry;
  }

  set(entry: FoundationCacheStoreEntry): void {
    this.evictExpired();
    if (this.entries.size >= this.maxEntries && !this.entries.has(entry.companyId)) {
      this.evictLeastRecentlyUsed();
    }

    this.entries.set(entry.companyId, {
      ...entry,
      lastAccessMs: Date.now(),
    });
  }

  delete(companyId: string): void {
    this.entries.delete(companyId);
  }

  clear(): void {
    this.entries.clear();
  }

  private evictExpired(): void {
    const now = Date.now();
    for (const [companyId, entry] of this.entries) {
      if (now - entry.cachedAtMs > this.ttlMs) {
        this.entries.delete(companyId);
      }
    }
  }

  private evictLeastRecentlyUsed(): void {
    let oldestId: string | null = null;
    let oldestAccess = Number.POSITIVE_INFINITY;

    for (const [companyId, entry] of this.entries) {
      if (entry.lastAccessMs < oldestAccess) {
        oldestAccess = entry.lastAccessMs;
        oldestId = companyId;
      }
    }

    if (oldestId) {
      this.entries.delete(oldestId);
    }
  }
}
