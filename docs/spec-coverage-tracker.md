# Spec Coverage Tracker

| Spec Area | Status | Notes |
| --- | --- | --- |
| App shell and navigation | Done (Phase 1) | Dashboard, Companies, Workspace, Data Hub, Engine Docs, Settings |
| Dashboard display-only rule | Done (Phase 0/1) | Dashboard implemented as output table with no valuation computation |
| Global vs company engine rule | Done (Phase 0/1) | Documented in architecture and valuation-flow docs |
| Company Workspace structure | Done (Phase 1) | Snapshot, Inputs, Historical, Forecast, Engines, Review/Decision, Notes/Sources placeholders |
| Data Hub structure | Done (Phase 1) | Required shared-data cards included |
| Engine Docs structure | Done (Phase 1) | Required placeholders included |
| Mock company dataset | Done (Phase 1) | Microsoft, Disney, Volvo |
| Company Identity & Ticker Logic | Built (Phase 2) | Type/data model only |
| Manual Inputs structure | Built (Phase 2) | Type/data model only |
| Historical periods structure | Built (Phase 2) | Type/data model only |
| Forecast periods structure | Built (Phase 2) | Type/data model only |
| Currency structure | Built (Phase 2) | Type/data model only |
| Dashboard output row structure | Built (Phase 2) | Type/data model only |
| Reference Data placeholders | Built (Phase 2) | Type/data model only |
| Review Flag severity model | Built (Phase 2) | Type/data model only |
| Valuation Result placeholder model | Built (Phase 2) | Type/data model only |
| Environment variable preparation | Done (Phase 0/1) | `.env.example` prepared, no real keys |
| Firestore foundation created | Built (Phase 3) | Firebase client + collection constants + status utility |
| Repository layer created | Built (Phase 3) | companies, dashboard, reference data, build status repositories |
| Company data persistence scaffold | Built (Phase 3) | upsert/get/seed functions with mock fallback |
| Reference data persistence scaffold | Built (Phase 3) | summary/seed functions with mock fallback |
| Dashboard row persistence scaffold | Built (Phase 3) | dashboard repository and seed helper |
| Mock fallback active | Built (Phase 3) | app remains functional when Firestore is empty/unavailable |
| Firestore integration | In Progress | foundation completed; governance/rules not yet implemented |
| Daily refresh cron architecture | Built (Phase 4A) | Vercel Cron route + secure auth + orchestration scaffold |
| Daily refresh execution policy | Built (Phase 4A) | Runs daily via cron, not on page load |
| Refresh idempotent/cache-first pattern | Built (Phase 4A) | status-first orchestration with no duplicate writes |
| Manual override priority | Built (Phase 4A) | manual values remain authoritative over live values |
| Riskfree by valuation currency mapping | Built (Phase 4A Correction) | Explicit lookup helper and Data Hub guidance |
| Riskfree decimal internal values | Built (Phase 4A Correction) | Stored as decimals; UI formats as percentages |
| Currency Map explicit model | Built (Phase 4A Correction) | Separate model, table, and seed action |
| FX Pair from/to model completeness | Built (Phase 4A Correction) | Includes separate from/to columns and stable IDs |
| Same-currency FX selected rate = 1 | Built (Phase 4A Correction) | Generated in seed helper and retained in selection logic |
| Separate seeding actions | Built (Phase 4A Correction) | Riskfree, Currency Map, and FX Pairs are independently seedable |
| Data Hub card-based navigation | Built (Phase 4A UX) | Main Data Hub is card-only with detail route links |
| Riskfree detail route | Built (Phase 4A UX) | Table + valuation-currency explanation + seed action |
| FX detail route | Built (Phase 4A UX) | Currency map + FX pair tables + separate seed actions |
| Refresh status detail route | Built (Phase 4A UX) | Cron config and daily refresh status details |
| API integrations detail route | Built (Phase 4A UX) | Provider order and configured yes/no only |
| Riskfree refresh provider policy | Planned (Phase 4B) | FRED-only live provider execution |
| FX refresh provider priority policy | Planned (Phase 4B) | EODHD-1 -> EODHD-2 -> FMP -> Finnhub -> MarketStack -> AV1 -> AV2 -> Manual/Cache |
| Global valuation calculations | Not Started | Deferred to later phase |
| API integrations (FRED/market/FX) | Not Started | Deferred; no live API calls |
| Real review logic execution | Not Started | Deferred; severity model currently structural only |

## Traceability Rule
Every new implementation phase must update this tracker so each feature maps back to the master specification.
