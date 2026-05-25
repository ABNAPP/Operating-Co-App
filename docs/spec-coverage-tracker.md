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
| Riskfree refresh provider policy | Built (Phase 4B-1) | FRED-only live provider execution |
| Riskfree FRED client integration | Built (Phase 4B-1) | Server-side only observations endpoint integration |
| FRED percent-to-decimal conversion | Built (Phase 4B-1) | `decimalValue = rawValue / 100` |
| Manual override preserved during refresh | Built (Phase 4B-1) | Manual override remains selected value |
| Firebase Admin server-side write scaffold | Built (Phase 4B-1) | Graceful Not Configured fallback when admin env missing |
| Protected manual riskfree refresh endpoint | Built (Phase 4B-1) | POST endpoint with Bearer CRON_SECRET |
| Cron riskfree refresh execution | Built (Phase 4B-1) | Daily cron now runs riskfree refresh |
| Riskfree UI source alignment | Built (Phase 4B-1 Fix) | Firestore/FRED rows shown when available; mock label only on fallback |
| FX provider chain refresh | Built (Phase 4B-2) | Server-side provider priority with graceful fallback |
| FX manual refresh endpoint | Built (Phase 4B-2) | POST endpoint with Bearer CRON_SECRET |
| FX quota protection | Built (Phase 4B-2) | `FX_REFRESH_MAX_PAIRS_PER_RUN` limits provider calls per run |
| Same-currency FX enforcement | Built (Phase 4B-2) | Same-currency pair selected/live rate fixed at 1 |
| FX manual override precedence | Built (Phase 4B-2) | Manual override remains selected rate when present |
| FX refresh status visibility | Built (Phase 4B-2) | Refresh status page now shows FX attempt/success/provider/warnings/errors |
| FX refresh provider priority policy | Built (Phase 4B-2) | EODHD-1 -> EODHD-2 -> FMP -> Finnhub -> MarketStack -> AV1 -> AV2 -> Manual/Cache |
| FX provider execution mode | Built (Phase 4B-2 Hardening) | Sequential chain; stop at first success for each pair |
| Required FX pair derivation from companies | Built (Phase 4B-2 Hardening) | Derived from trading/reporting vs valuation currencies |
| Bidirectional required FX pair persistence | Built (Phase 4B-2 Hardening) | Ensures both directions exist in Data Hub FX rows |
| Required pair refresh prioritization | Built (Phase 4B-2 Hardening) | Required pairs are refreshed before general reference pairs |
| Inverse-derived reverse FX updates | Built (Phase 4B-2 Hardening) | Reverse pair can be derived from direct pair to reduce provider calls |
| Country ERP schema and repository | Built (Phase 4C-1) | Country rows, regional rows, mappings, source notes, usage rules |
| Country ERP protected import route | Built (Phase 4C-1) | POST endpoint with Bearer CRON_SECRET |
| Country ERP Damodaran source integration scaffold | Built (Phase 4C-1) | XLSX import path + source metadata tracking |
| Country ERP stale detection | Built (Phase 4C-1) | Marked stale/review when import/source age exceeds 180 days |
| Regional ERP calculation fallback | Built (Phase 4C-1) | Calculated from country rows + mapping definitions |
| Weighted ERP future contract scaffolding | Built (Phase 4C-1) | Usage rules and formula guide; no active valuation math |
| Country-regional many-to-many mapping | Built (Phase 4C-1 Correction) | One country can map to multiple regional groups |
| Regional ERP mapping-based aggregation | Built (Phase 4C-1 Correction) | Active mapped countries drive simple-average metrics |
| Country-regional map drilldown visibility | Built (Phase 4C-1 Correction) | Country Risk / ERP page shows mapping table and region filter |
| Damodaran dataset source register | Built (Phase 4C-2A) | Registry includes source URL, download URL, source date, imported date, status, notes |
| Damodaran local-file import scaffold | Built (Phase 4C-2A) | Reads XLS/XLSX from `data/damodaran/raw/` with graceful missing-file handling |
| Damodaran industry master list generation | Built (Phase 4C-2A) | Generated from imported datasets without requiring `indname.xls` |
| Damodaran coverage matrix generation | Built (Phase 4C-2A) | Core dataset presence per industry with Complete/Partial/Missing/Review status |
| Damodaran stale import policy | Built (Phase 4C-2A) | Status set to `Stale` when imported age exceeds 180 days |
| Damodaran protected refresh endpoint | Built (Phase 4C-2A) | POST endpoint with Bearer CRON_SECRET |
| Damodaran card-based vault UX | Built (Phase 4C-2A UI Refactor) | Main Damodaran route is card-based, grouped by priority, and focused on navigation/readiness |
| Damodaran compact card UX | Built (Phase 4C-2A UI Correction) | Main page cards are compact and dataset filters removed |
| Damodaran source-date display policy | Built (Phase 4C-2A UI Correction) | Cards emphasize source update date; imported timestamp remains separate metadata |
| Damodaran dataset detail raw table UX | Built (Phase 4C-2A UI Refactor) | Detail route prioritizes searchable stored raw imported rows with collapsed metadata |
| Data Hub performance summary loading | Built (Phase 4C-2A Performance Correction) | Main Data Hub and Damodaran main pages load summary/register data, not full raw rows |
| Damodaran paginated detail rendering | Built (Phase 4C-2A Performance Correction) | Dataset detail pages paginate stored rows and avoid full-table render by default |
| FX persistence safety (no wipe on seed) | Built (Phase 4C-2A Persistence Correction) | Seed/generate merges metadata and preserves existing live/selected/manual rates |
| Runtime persistence note (local vs Vercel) | Built (Phase 4C-2A Persistence Correction) | Docs clarify deployment vs Firestore persistence boundaries |
| Sector / Industry Mapping foundation | Built (Phase 4C-2B-1) | Official ISM-sector list + blank/reviewable mapping rows + readiness/validation scaffolding |
| Legacy Google Sheet mapping import | Explicitly excluded | Old sheet is context only; not loaded as source-of-truth mapping rows |
| Candidate benchmark mapping generation | Not Started | Deferred to Phase 4C-2B-2 with analyst-reviewed candidate logic |
| Global valuation calculations | Not Started | Deferred to later phase |
| API integrations (FRED/market/FX) | Not Started | Deferred; no live API calls |
| Real review logic execution | Not Started | Deferred; severity model currently structural only |

## Traceability Rule
Every new implementation phase must update this tracker so each feature maps back to the master specification.
