# Spec Coverage Tracker

| Spec Area | Status | Notes |
| --- | --- | --- |
| App shell and navigation | Done (Phase 1) | Dashboard, Companies, Data Hub, Engine Docs, Settings; workspace via `/companies/[cleanTicker]` |
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
| Candidate benchmark mapping generation | Built (Phase 4C-2B-2) | Candidate logic fills reviewable benchmark suggestions and preserves user edits by default |
| Benchmark-to-master validation | Built (Phase 4C-2B-2) | Nonblank benchmark values validate against Damodaran Industry Master List exact names |
| Sector benchmark key scaffolding | Built (Phase 4C-2B-2) | Beta/margin/reinvestment/working-capital/growth/multiples keys populated only when validated primary + coverage support |
| Benchmark-first mapping direction | Built (Phase 4C-2B-3) | Damodaran benchmark -> ISM is primary; ISM -> benchmark remains helper/reverse view |
| Company benchmark-first scaffold | Built (Phase 4C-2B-3) | Company workspace shows benchmark-primary selection with ISM-sector suggestion and review flags |
| Benchmark-first stage/cyclicality defaults | Built (Phase 4C-2B-4) | Stage/cyclicality/history/normalization/rule hints now live on benchmark-first mapping rows |
| Benchmark-first secondary/fallback benchmark hints | Built (Phase 4C-2B-4) | Related/fallback benchmarks are recommendation-only and canonical-name validated |
| Reverse helper table secondary status | Built (Phase 4C-2B-4) | ISM -> benchmark helper view remains available and explicitly secondary/collapsed |
| Industry Benchmark Config naming | Built (Phase 4C-2B-5) | Visible module label now Industry Benchmark Config in Data Hub UI/docs |
| Benchmark-config-first repository contract | Built (Phase 4C-2B-5) | Added benchmark-config-first adapters without physical collection migration |
| Benchmark pull-key authority on benchmark-primary rows | Built (Phase 4C-2B-5) | Beta/margin/ROC/reinvestment/WC/tax/WACC sanity/multiples sanity keys live on benchmark rows |
| ISM display map contract | Built (Phase 4C-2B-5) | ISM mapping is derived display-only via benchmark-first config |
| ISM sector role | Built (Phase 4C-2B-5) | ISM-sector is derived/display-only and not a primary valuation driver |
| Dashboard benchmark-first industry display | Built (Phase 4C-2B-5) | Dashboard primary industry display uses selected Damodaran benchmark |
| Pricing multiples policy | Built (Phase 4C-2B-5) | Multiples remain sanity-only and not official intrinsic value inputs |
| Exact v1.5 benchmark table parser/seed | Built (Phase 4C-2B-6) | Source file parser now loads exact table rows from `Operating_Co_Template_Master_Specification_v1_5.txt` |
| Seven exact benchmark tables in Data Hub | Built (Phase 4C-2B-6) | Data Hub now shows all required `tbl*` Industry Benchmark Config tables as source-of-truth |
| Generated candidate mapping source-of-truth policy | Built (Phase 4C-2B-6) | Generated/helper mapping is explicitly labeled internal only and not source-of-truth |
| Pull keys source-of-truth table | Built (Phase 4C-2B-6) | Pull keys are read from exact `tblBenchmarkDataPullKeys` |
| Damodaran v1.5 classification bridge | Built (Phase 4C-2B-7) | Registry uses v1.5 classifications; pricing sanity does not block readiness |
| Damodaran pull-key dataset resolver | Built (Phase 4C-2B-7) | Static map from pull-key types to dataset registry IDs (no numeric engine extraction) |
| Damodaran universe cross-check | Built (Phase 4C-2B-7) | Canonical industries compared to exact `tblDamodaranIndustryUniverse` |
| Damodaran Beta/WACC numeric extraction | Not Started | Pending after bridge; no Cost of Equity/WACC math in Data Hub |
| Settings Flowchart card | Built (Phase 4C-2B-8) | Clickable card in Settings → `/engine-docs/flowchart`; navigation/docs only |
| App build flowchart page | Built (Phase 4C-2B-8) | Build status, main flow, Data Hub flow, rules; data in `lib/build-flow/buildPhases.ts` |
| Beta Engine Foundation | Built (Phase 4C-2B-9) | Benchmark beta reference lookup + readiness; `damodaran_beta_global`; no WACC/Cost of Equity |
| Beta relevering / selected beta | Built (Phase 4C-2B-10) | `betaPolicyService` + Company Workspace policy card; relevering formula only |
| Beta policy QA script | Built (Phase 4C-2B-10) | `scripts/qa-beta-policy.mjs` |
| WACC Engine Foundation | Built (Phase 4C-2B-11) | CoE + WACC foundation; not connected to valuation outputs |
| WACC foundation QA script | Built (Phase 4C-2B-11) | `scripts/qa-wacc-foundation.mjs` |
| WACC Engine docs page | Built (Phase 4C-2B-11) | `/engine-docs/wacc-engine` |
| Company Workspace WACC card | Built (Phase 4C-2B-11) | WACC Foundation on `/companies/[cleanTicker]` |
| Forecast & Fade Engine Foundation | Built (Phase 4C-2B-12) | Stage/history/cyclicality readiness; no forecast or FCFF math |
| Forecast & Fade foundation QA script | Built (Phase 4C-2B-12) | `scripts/qa-forecast-fade-foundation.mjs` |
| Forecast & Fade Engine docs page | Built (Phase 4C-2B-12) | `/engine-docs/forecast-fade-engine` |
| Company Workspace Forecast & Fade card | Built (Phase 4C-2B-12) | Forecast & Fade Foundation on `/companies/[cleanTicker]` |
| Reinvestment / FCFF Engine Foundation | Built (Phase 4C-2B-13) | NOPAT, reinvestment, FCFF; no terminal, DCF/PV, bridge, or intrinsic math |
| Reinvestment / FCFF foundation QA script | Built (Phase 4C-2B-13) | `scripts/qa-reinvestment-fcff-foundation.mjs` |
| Reinvestment / FCFF Engine docs page | Built (Phase 4C-2B-13) | `/engine-docs/reinvestment-fcff-engine` |
| Company Workspace Reinvestment / FCFF card | Built (Phase 4C-2B-13) | Reinvestment / FCFF Foundation on `/companies/[cleanTicker]` |
| Terminal Value Engine Foundation | Built (Phase 4C-2B-14) | Terminal FCFF + Gordon terminal value only (no discounting); no DCF/PV, bridge, or intrinsic math |
| Terminal Value foundation QA script | Built (Phase 4C-2B-14) | `scripts/qa-terminal-value-foundation.mjs` |
| Terminal Value Engine docs page | Built (Phase 4C-2B-14) | `/engine-docs/terminal-value-engine` |
| Company Workspace Terminal Value card | Built (Phase 4C-2B-14) | Terminal Value Foundation on `/companies/[cleanTicker]` |
| DCF / PV Engine Foundation | Built (Phase 4C-2B-15) | PV of forecast FCFF, PV of terminal value, and Value of Operating Assets only (no discounting to equity/decisions) |
| DCF / PV foundation QA script | Built (Phase 4C-2B-15) | `scripts/qa-dcf-pv-foundation.mjs` |
| DCF / PV Engine docs page | Built (Phase 4C-2B-15) | `/engine-docs/dcf-pv-engine` |
| Company Workspace DCF / PV card | Built (Phase 4C-2B-15) | DCF / PV Foundation on `/companies/[cleanTicker]` |
| Firm-to-Equity Bridge Engine Foundation | Built (Phase 4C-2B-16) | Equity Value from operating assets + explicit bridge adjustments only (no intrinsic/share) |
| Firm-to-Equity Bridge foundation QA script | Built (Phase 4C-2B-16) | `scripts/qa-equity-bridge-foundation.mjs` |
| Firm-to-Equity Bridge Engine docs page | Built (Phase 4C-2B-16) | `/engine-docs/equity-bridge-engine` |
| Company Workspace Firm-to-Equity Bridge card | Built (Phase 4C-2B-16) | Firm-to-Equity Bridge Foundation on `/companies/[cleanTicker]` |
| Intrinsic Value / Share Engine Foundation | Built (Phase 4C-2B-17) | Per-share value from Equity Value + explicit share unit/shares only |
| Intrinsic Value / Share foundation QA script | Built (Phase 4C-2B-17) | `scripts/qa-intrinsic-value-foundation.mjs` |
| Intrinsic Value / Share Engine docs page | Built (Phase 4C-2B-17) | `/engine-docs/intrinsic-value-engine` |
| Company Workspace Intrinsic Value / Share card | Built (Phase 4C-2B-17) | Intrinsic Value / Share Foundation on `/companies/[cleanTicker]` |
| Beta reference service | Built (Phase 4C-2B-9) | `lib/engines/beta/betaReferenceService.ts` — read-only, no raw data mutation |
| Company Workspace beta card | Built (Phase 4C-2B-9) | Beta Reference / Beta Readiness on `/companies/[cleanTicker]` |
| Beta Engine docs page | Built (Phase 4C-2B-9) | `/engine-docs/beta-engine` — foundation scope and rules |
| Global valuation calculations | Not Started | Deferred to later phase |
| API integrations (FRED/market/FX) | Not Started | Deferred; no live API calls |
| Real review logic execution | Not Started | Deferred; severity model currently structural only |

## Traceability Rule
Every new implementation phase must update this tracker so each feature maps back to the master specification.
