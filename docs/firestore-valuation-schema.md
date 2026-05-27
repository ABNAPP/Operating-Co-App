# Firestore Valuation Schema (Phase A)

Phase A defines **how computed valuation results are stored** so the frontend can render Dashboard and Company Workspace without running engines. Phase B will add workers that **write** these documents; Phase A does not change page behavior yet.

## Collections overview

| Collection | Document ID | Purpose |
|------------|-------------|---------|
| `valuationResults` | `{cleanTicker}` | Canonical full foundation output + official headline fields |
| `dashboardRows` | `{cleanTicker}` | Denormalized list view for Dashboard `getDocs()` / `onSnapshot()` |
| `companies` | `{cleanTicker}` | Inputs / identity only (unchanged) |
| `companyInputs` | `{cleanTicker}` | Manual inputs overlay (future `engine_wired`) |

**Write rule (Phase B):** every successful company compute writes **both** `valuationResults` and `dashboardRows` in one logical operation (batch/transaction).

**Read rule (target frontend):**

- Dashboard → `getDocs(collection('dashboardRows'))` only
- Company Workspace Valuation/Review → `getDoc(valuationResults/{cleanTicker})` only
- Company Snapshot headline → `valuationResults.workspaceSnapshot` (or `official`)

---

## `valuationResults/{cleanTicker}`

TypeScript: `ValuationResultDocument` in `lib/types/valuation-results-firestore.ts`

### Top-level identity

| Field | Type | Notes |
|-------|------|-------|
| `cleanTicker` | string | Document ID |
| `companyName` | string | Display |
| `fullTicker` | string | e.g. `AAPL US` |
| `selectedBenchmark` | string | Damodaran Industrial Benchmark |
| `valuationCurrency` | CurrencyCode \| null | |
| `reportingCurrency` | CurrencyCode \| null | |
| `tradingCurrency` | CurrencyCode \| null | |
| `countryOfRisk` | string | |
| `ismSectorDisplay` | string \| null | Display-only ISM label |

### `versioning`

| Field | Type | Notes |
|-------|------|-------|
| `schemaVersion` | `"valuation-result-v1"` | Bump on breaking shape changes |
| `engineVersion` | string | e.g. `foundation-v1` |
| `calculatedAt` | ISO string | When compute finished |
| `computeSource` | enum | `foundation-worker`, `nextjs-request`, … |
| `runId` | string \| null | Batch id from orchestrator |
| `computeStatus` | enum | `complete` \| `failed` \| `stale` \| `pending` |
| `supersededAt` | ISO \| null | Set when replaced |

### `fingerprints` (invalidation)

| Field | Type | Recompute when changed |
|-------|------|------------------------|
| `valuationInputFingerprint` | string | Company inputs, benchmark, historical LTM, etc. |
| `marketOverlayFingerprint` | string | Current price, required MOS |
| `referenceDataStamp` | string | Riskfree / ERP / engine version |
| `companyDocumentLastUpdated` | string | `companies.lastUpdated` |
| `manualInputsRevision` | string \| null | `companyInputs` revision (Phase B+) |

### `official` (source of truth headlines)

| Field | Description |
|-------|-------------|
| `officialIntrinsicValuePerShare` | **Official Intrinsic Value / Share** |
| `officialIntrinsicValueCurrency` | Valuation currency for IV |
| `currentSharePrice` | For MOS / upside |
| `foundationDecisionOutcome` | `Above Required MOS` \| `Below Required MOS` \| `N/A` |
| `foundationReadinessStatus` | `Ready` \| `Review` \| `Missing` \| `Not Applicable` |
| `wacc`, `costOfEquity`, `selectedBeta` | Snapshot headline metrics |

### `dashboard`

Embedded copy of `DashboardDecisionIntegrationResult` — same fields the Dashboard table uses today, so a single `getDoc` can hydrate the company detail drawer without mapping engines.

### `workspaceSnapshot`

Lightweight slice for Company Snapshot tab (beta/WACC/IV/MOS status strings + headline numbers).

### `foundation`

Full persisted engine bundles:

```
betaPolicy → wacc → forecastFade → reinvestmentFcff → terminalValue → dcfPv → equityBridge → intrinsicValue → mosDecision
```

Each stage stores `{ input, result }` (and beta adds `lookup` + `readiness`). Types mirror `lib/engines/company-foundation/companyFoundationTypes.ts`.

### `compute`

| Field | Notes |
|-------|-------|
| `timingMs` | Per-engine timings (optional) |
| `totalMs` | Wall time |
| `errorMessage` | Set when `computeStatus === 'failed'` |

---

## `dashboardRows/{cleanTicker}`

TypeScript: `ValuationDashboardSnapshotDocument` in `lib/types/dashboard-snapshot-firestore.ts`

Denormalized **list row** — no nested `foundation` tree (keeps `getDocs()` payloads small).

### Columns mapped to current Dashboard UI

| Snapshot field | Dashboard column |
|----------------|------------------|
| `companyName` | Company |
| `cleanTicker` | Ticker |
| `damodaranIndustrialBenchmark` | Damodaran Industrial Benchmark |
| `valuationCurrency` | Valuation Currency |
| `officialIntrinsicValuePerShare` | Intrinsic Value / Share |
| `currentSharePrice` | Current Price |
| `upsideDownsidePercent` | Upside / Downside % |
| `marginOfSafetyPercent` | Margin of Safety % |
| `requiredMosPercent` | Required MOS % |
| `entryPrice` | Entry Price |
| `foundationDecisionOutcome` | Foundation Outcome |
| `foundationReadinessStatus` | Foundation Status |
| `dashboardDecisionIntegrationStatus` | Dashboard Decision Integration |
| `legacyMockDecisionStatus` | Legacy mock decision (separate) |

### Indexing / sorting

| Field | Purpose |
|-------|---------|
| `sortKey` | Default table order, e.g. `1-acme corp` |
| `foundationReadinessSortRank` | Numeric filter/sort (0–3) |
| `calculatedAt` | Staleness display |
| `valuationResultId` | Always equals `cleanTicker`; link to full doc |

### Version mirrors (for stale badges without reading full result)

- `engineVersion`
- `referenceDataStamp`
- `valuationInputFingerprint`
- `marketOverlayFingerprint`

---

## Mapper & repositories (Phase A scaffold)

| Module | Role |
|--------|------|
| `lib/firestore/mappers/valuationResultDocumentMapper.ts` | `buildValuationResultDocument`, `buildDashboardSnapshotDocument`, `buildPersistedValuationArtifacts` |
| `lib/firestore/repositories/valuationResultsRepository.ts` | `getValuationResultByCleanTicker`, `upsertValuationResult` |
| `lib/firestore/repositories/valuationDashboardRepository.ts` | `getValuationDashboardSnapshots`, `upsertValuationDashboardSnapshot`, `upsertValuationArtifactsPair` |

## Firestore Security Rules

Client read-only for persisted valuation outputs; writes via Admin SDK only.

See `firestore.rules` in the repo root — paste into Firebase Console → Firestore → Rules → Publish.

---

## Local batch (Phase B — Spark / no Cloud Functions)

Run on your machine (not Vercel):

```bash
npm run valuation:batch
# or
node scripts/run-all-valuations-batch.mjs --tickers MSFT,AAPL --chunk 5 --pause-chunk 5000
```

Uses Firebase Admin writes with chunking and pauses to stay within Spark free-tier limits.

---

## Dev seed (Phase A verification)

`POST /api/dev/seed-valuation-result` — runs one company through the foundation pipeline and writes both collections via Firebase Admin.

- Auth: `Authorization: Bearer <CRON_SECRET>`
- Default ticker: `MSFT`
- `GET` same route returns curl/PowerShell examples (no auth)

See response field `verifyInConsole` for Firestore paths to inspect.

---

**Phase B worker** should call:

```ts
const { valuationResult, dashboardSnapshot } = buildPersistedValuationArtifacts({
  company,
  foundationBundle,
  fingerprints: {
    valuationInputFingerprint,
    marketOverlayFingerprint,
    referenceDataStamp,
    companyDocumentLastUpdated: company.lastUpdated,
    manualInputsRevision: null,
  },
  referenceDataStamp,
  computeSource: "foundation-worker",
  runId,
});
await upsertValuationArtifactsPair({ valuationResult, dashboardSnapshot });
```

---

## Relationship to legacy types

| Legacy | Status |
|--------|--------|
| `DashboardCompanyRow` (`lib/types/dashboard.ts`) | Mock/scaffold; replace reads with `ValuationDashboardSnapshotDocument` |
| `CompanyValuationResult` on `companies` doc | Mock placeholders; **do not** use for official IV |
| `DashboardDecisionIntegrationResult` | Still produced by mapper **at write time**; persisted inside `valuationResults.dashboard` |

---

## Firestore indexes (recommended)

```
Collection: dashboardRows
  - sortKey ASC
  - foundationReadinessSortRank ASC, sortKey ASC
  - calculatedAt DESC
```

Single-document reads use document ID — no composite index required.

---

## Document size note

Full `foundation` trees may approach Firestore’s 1 MiB limit for pathological note arrays. If needed in Phase C:

- Move `foundation` to a subcollection `valuationResults/{id}/engineStages/{stage}`
- Keep `official` + `dashboard` + `workspaceSnapshot` on the parent doc

Phase A keeps a single document for simplicity.

---

## Schema version migration

1. Bump `VALUATION_RESULT_SCHEMA_VERSION` / `DASHBOARD_SNAPSHOT_SCHEMA_VERSION`
2. Add migration worker or lazy upgrade on read
3. Set `versioning.supersededAt` on old docs when rewriting
