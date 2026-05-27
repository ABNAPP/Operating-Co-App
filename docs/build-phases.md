# Build Phases Tracker

## Phase 0 - Architecture & Documentation Foundation
- [x] Create docs folder and core markdown files
- [x] Define main valuation flow placeholder
- [x] List planned valuation engines
- [x] Add spec coverage tracker
- [x] Add build phase tracker
- [x] Define rule: Dashboard is display/navigation only
- [x] Define rule: Global Valuation Engine shared, company results company-specific

## Phase 1 - App Skeleton
- [x] Build main navigation shell
- [x] Add Dashboard page (table format)
- [x] Add Companies page (card format)
- [x] Add Company Workspace page (section placeholders)
- [x] Add Data Hub page (reference-data cards)
- [x] Add Engine Docs page (documentation placeholders)
- [x] Add Settings page
- [x] Add mock company records

## Phase 2 - Data Model + Mock Data
- [x] Company identity and ticker type model
- [x] Currency type structure and review status
- [x] Historical and forecast period structures
- [x] Manual input interfaces
- [x] Reference data placeholder interfaces
- [x] Valuation result placeholder interfaces
- [x] Review severity and category status model
- [x] Dashboard output row type
- [x] Rich mock company data aligned to new types
- [x] UI pages updated to consume structured mock data

## Phase 3 - Firestore Foundation
- [x] Firebase client initialization scaffold (modular SDK only)
- [x] Firestore collection constants
- [x] Repository layer scaffold for companies, dashboard, reference data, build status
- [x] Company persistence helper functions (`get`, `upsert`, `seed`)
- [x] Dashboard row persistence helper functions (`get`, `upsert`, `seed`)
- [x] Reference data summary + seed scaffold
- [x] Firestore readiness/status utility
- [x] Data Hub status section (config/client/mode placeholders)
- [x] Development-only seed action in Settings
- [x] Mock fallback preserved when Firestore is empty or unavailable
- [x] No external API calls added
- [x] No valuation math added

## Phase 4A - Daily Refresh Architecture
- [x] Added `CRON_SECRET` template variable in `.env.example`
- [x] Added Vercel Cron config (`vercel.json`) for daily 06:00 UTC refresh
- [x] Added secure cron route (`/api/cron/daily-data-refresh`) with Bearer secret check
- [x] Added daily refresh orchestration service scaffold
- [x] Added status/warnings/errors persistence fields for refresh tracking
- [x] Preserved manual override precedence in selection structure
- [x] Added Data Hub daily refresh status UI and riskfree/FX table placeholders
- [x] Added Settings cron/refresh configuration status UI
- [x] Kept manual refresh as support/dev action; no auto refresh on page load
- [x] Corrected Riskfree model to decimal internal rates and valuation-currency mapping
- [x] Added explicit Currency Map model and table
- [x] Added explicit FX Pair model with from/to columns
- [x] Added same-currency pair generation with selected rate fixed at 1
- [x] Added separate idempotent seed actions for Riskfree, Currency Map, and FX Pairs
- [x] Refactored Data Hub main page into card-only hub navigation
- [x] Moved detailed Riskfree/FX/Refresh content to dedicated Data Hub sub-pages
- [x] Added dedicated placeholder detail pages for Damodaran, Country Risk/ERP, Sector Mapping, Beta Reference, and Forecast/Fade
- [x] Added API Integrations detail page with configured yes/no display only

## Phase 4B-1 - FRED Riskfree Refresh
- [x] Installed `firebase-admin` for secure server-side Firestore writes
- [x] Added server-only Firebase Admin initialization scaffold
- [x] Added server-only FRED observations client
- [x] Added riskfree refresh service using FRED-only source
- [x] Converted FRED percentage values to decimal internal values
- [x] Preserved manual override priority over live values
- [x] Updated daily cron refresh to execute riskfree refresh
- [x] Added protected manual riskfree refresh endpoint
- [x] Added configuration visibility (yes/no) for FRED key and Firebase Admin setup
- [x] Fixed Riskfree UI data source alignment (Firestore/FRED refreshed when Firestore rows exist)

## Phase 4B-2 - FX Provider Refresh
- [x] Implemented server-side FX provider chain with priority order
- [x] Documented provider chain as sequential (stop at first success) for quota protection
- [x] Added guarded/optional MarketStack handling (skip unsupported)
- [x] Added same-currency system handling (`selectedFxRate = 1`)
- [x] Preserved manual override precedence for selected FX rate
- [x] Added refresh safety limit (`FX_REFRESH_MAX_PAIRS_PER_RUN`)
- [x] Added company-required FX pair derivation helper
- [x] Added bidirectional required pair ensure step (`from -> to` and `to -> from`)
- [x] Added inverse-derived reverse pair updates to reduce duplicate provider calls
- [x] Prioritized refresh order (same-currency -> required -> manual -> reference)
- [x] Added protected manual FX refresh endpoint (`POST /api/data-hub/fx-rates/refresh`)
- [x] Updated daily cron orchestration to include FX refresh
- [x] Updated Refresh Status and API Integrations views for FX provider visibility
- [ ] Add provider-level retries/backoff/circuit-breaker behavior
- [ ] Harden Firestore data validation model and migration strategy

## Phase 4C-1 - Country Risk / ERP Data Hub
- [x] Added Country Risk / ERP typed data model and collection constants
- [x] Added Country Risk / ERP Firestore repository scaffold with admin-write path and mock fallback
- [x] Added protected manual import endpoint (`POST /api/data-hub/country-risk-erp/refresh`)
- [x] Added Damodaran XLSX import service scaffold with decimal conversion
- [x] Added source metadata and import status tracking
- [x] Added stale-data detection policy (180 days)
- [x] Added regional ERP calculator (calculated fallback/reference rows)
- [x] Seeded default regional group definitions and country-group mapping defaults
- [x] Enforced many-to-many country-to-region mapping support
- [x] Added mapping regeneration with preserve-existing behavior
- [x] Added regional drilldown/map visibility on Country Risk / ERP page
- [x] Updated Country Risk / ERP Data Hub detail page sections (source, country rows, regional fallback, usage rules, future company connection)
- [x] Confirmed no valuation math implementation in this phase

## Phase 4C-2A - Damodaran Industry Data Vault / Source Register
- [x] Added Damodaran dataset vault types (`lib/types/damodaran-data.ts`)
- [x] Added hardcoded Damodaran dataset source register with metadata and priorities
- [x] Added local-file import/parser service for XLS/XLSX in `data/damodaran/raw/`
- [x] Added graceful missing-file handling (`Missing Local File`) without app crash
- [x] Added generated Industry Master List from imported datasets (no `indname.xls` dependency)
- [x] Added generated Dataset Coverage Matrix for core industry coverage checks
- [x] Added stale import logic (180 days) while preserving visible source/update dates
- [x] Added Damodaran data vault Firestore repository with admin-write path and mock fallback
- [x] Added protected manual refresh endpoint (`POST /api/data-hub/damodaran-data/refresh`)
- [x] Added Data Hub Damodaran page sections: Source Summary, Register, Industry Master, Coverage, Readiness, Notes
- [x] Refactored Damodaran main page to card-based dataset navigation (Core first)
- [x] Removed dataset filter panel from Damodaran main page for compact Data Hub UX
- [x] Moved large register/coverage tables out of main flow into advanced/collapsed UX
- [x] Expanded dataset detail route to prioritize searchable stored raw table rows
- [x] Added workbook/source-date detection (`Date updated`) with registry-date fallback
- [x] Hardened Data Hub performance: lightweight summaries on main hub and paginated Damodaran detail rows
- [x] Added stable Firestore/local-cache fallback reads for Damodaran vault data
- [x] Hardened FX persistence so seed/generate actions do not wipe previously refreshed rates
- [x] Confirmed this phase does not implement Sector/Industry mapping logic
- [x] Confirmed this phase does not add valuation math (WACC/CoE/FCFF/TV/Bridge/Intrinsic)

## Phase 4C-2B-1 - Sector / Industry Mapping Foundation
- [x] Added dedicated Sector / Industry Mapping foundation type model (`lib/types/sector-industry-mapping.ts`)
- [x] Added official internal ISM-sector list with Operating Co status flags
- [x] Added blank/reviewable mapping foundation rows (no legacy sheet benchmark import)
- [x] Added validation service against Damodaran Industry Master List
- [x] Added sector mapping Firestore repository with local cache fallback
- [x] Added protected foundation seed endpoint (`POST /api/data-hub/sector-industry-mapping/seed-foundation`)
- [x] Added Data Hub Sector / Industry Mapping foundation page with rules/readiness sections
- [x] Added Company Workspace scaffold for ISM-sector dropdown and mapping-required status
- [x] Confirmed no valuation math added in this phase

## Phase 4C-2B-2 - Sector Mapping Candidate Logic
- [x] Added candidate generation service with reviewable sector-to-benchmark suggestions
- [x] Added validation against Damodaran Industry Master List before mapping persistence
- [x] Added candidate guide persistence and readiness refresh updates
- [x] Added protected generate-candidates endpoint (`POST /api/data-hub/sector-industry-mapping/generate-candidates`)
- [x] Added benchmark key assignment logic gated by validated primary benchmark and coverage availability
- [x] Preserved existing nonblank user benchmark fields unless overwrite is explicitly requested
- [x] Updated Data Hub Sector Mapping page with candidate status, guide, key details, and validation summary
- [x] Updated Company Workspace scaffold to show recommended benchmark, review flag, status, and notes
- [x] Confirmed legacy Google Sheet mapping remains context only (not source-of-truth)
- [x] Confirmed no valuation math added in this phase

## Phase 4C-2B-3 - Benchmark-first Sector Mapping Correction
- [x] Added benchmark-first mapping row model (`DamodaranBenchmarkToIsmSectorRow`)
- [x] Added benchmark-first candidate generation service
- [x] Added benchmark-first persistence collection + repository helpers
- [x] Added protected benchmark-first generation endpoint (`POST /api/data-hub/sector-industry-mapping/generate-benchmark-first`)
- [x] Updated Sector Mapping page with benchmark-first primary table
- [x] Kept ISM -> Benchmark view as labeled reverse/helper mapping view
- [x] Updated Company Workspace scaffold to benchmark-first selection flow
- [x] Confirmed no valuation math added in this phase

## Phase 4C-2B-4 - Benchmark-first Stage/Cyclicality Defaults
- [x] Extended benchmark-first mapping rows with stage/cyclicality/default recommendation fields
- [x] Added benchmark default-rules helper for transparent recommendation logic
- [x] Populated benchmark-first rows with stage/history/normalization/rule hints
- [x] Preserved existing benchmark-first manual edits unless overwrite is explicitly requested
- [x] Added secondary/fallback benchmark recommendation fields (review-only, not auto-substitution)
- [x] Updated benchmark-first generation endpoint summary with default-population counts
- [x] Updated Sector Mapping UI to prioritize benchmark-first recommendation fields
- [x] Kept reverse ISM -> benchmark helper view as secondary/collapsed
- [x] Updated Company Workspace scaffold to show benchmark-first stage/cyclicality recommendations
- [x] Confirmed no valuation math added in this phase

## Phase 4C-2B-5 - Industry Benchmark Config v1.5 Contract Consolidation
- [x] Reframed visible module naming to Industry Benchmark Config (benchmark-first)
- [x] Added v1.5 benchmark-first canonical contract type (`IndustryBenchmarkConfigRow`)
- [x] Added benchmark-config-first repository adapters (`get*`, `generate*`, `validate*`)
- [x] Added benchmark-derived ISM display-map adapters (`getIndustryISMDisplayMap`, `getISMDisplayByBenchmark`)
- [x] Moved benchmark pull-key authority to benchmark-primary config rows
- [x] Kept ISM-first logic as internal helper/collapsed support only
- [x] Updated Company Workspace to benchmark-primary display with ISM derived/display-only
- [x] Updated Dashboard primary industry display to Damodaran benchmark
- [x] Added Damodaran Data read-only linkage notes to benchmark config and sanity-only multiples
- [x] Confirmed no valuation math added in this phase

## Phase 4C-2B-6 - Exact v1.5 Industry Benchmark Config Tables
- [x] Added strict exact-table parser/seed service (`lib/data-hub/industryBenchmarkConfigV15SeedService.ts`)
- [x] Added explicit table models for all required v1.5 tables
- [x] Added repository methods for all seven exact tables + exact seed method
- [x] Data Hub now renders all seven exact v1.5 tables as source of truth
- [x] Generated/helper tables remain collapsed and clearly marked not source of truth
- [x] Company Workspace benchmark selection now uses exact universe/config tables
- [x] Company Workspace ISM-sector now derives from exact `tblIndustryISMDisplayMap`
- [x] Dashboard keeps Damodaran benchmark primary and ISM-sector secondary display-only
- [x] Pull keys are shown from exact `tblBenchmarkDataPullKeys`
- [x] No valuation math added in this phase

## Phase 4C-2B-7 - Damodaran v1.5 Bridge (Registry, Classification & Pull-Key Alignment)
- [x] Reclassified Damodaran datasets per v1.5 / Source Pack (Core Required, Core Support, Strong Support, Pricing Sanity Only)
- [x] Pricing multiples no longer block Beta/WACC readiness (`blocksCoreReadiness` gate)
- [x] Promoted `histgrGlobal.xls` to Core Support
- [x] Registered Total Beta (`totalbetaGlobal (2).xls`) as Strong Support
- [x] Added deferred EV multiples registry entry (`evdataGlobal.xls` missing)
- [x] Added workbook semantic table names on cards (`tblDamodaranIndustryBeta`, etc.)
- [x] Added static pull-key → dataset resolver (`lib/data-hub/damodaranPullKeyResolver.ts`)
- [x] Added canonical vs v1.5 universe cross-check helper
- [x] Fixed canonical core coverage keys (removed orphan `evdataGlobal` / pricing multiples from gating)
- [x] Added Industry Benchmark Config linkage panel on Damodaran Data page
- [x] Added structured ratings reference note on ratings detail page
- [x] Replaced Sector Mapping readiness label with Industry Benchmark Config wording
- [x] Confirmed no valuation math; Riskfree/FX/Country ERP untouched

## Phase 4C-2B-8 - Pre-Beta/WACC Checkpoint + Settings Flowchart
- [x] Pre-build checkpoint confirmed (Industry Benchmark Config, Damodaran bridge, Riskfree/FX/ERP, formatting standard)
- [x] Settings Flowchart card (`/settings` → `/engine-docs/flowchart`)
- [x] Flowchart page with build status, main app flow, Data Hub flow, rules, next step
- [x] Static phase data in `lib/build-flow/buildPhases.ts` for easy updates
- [x] Documentation/navigation only — no valuation logic

## Phase 4C-2B-10 - Beta Engine Relevering & Selected Beta Policy
- [x] Extended `lib/types/beta-engine.ts` with `BetaPolicyInput`, `BetaPolicyResult`, `BetaSelectionPolicy`
- [x] Added `lib/engines/beta/betaPolicyMath.ts` and `betaPolicyService.ts` (relevering only)
- [x] Formula: Relevered Beta = Unlevered × (1 + (1 − tax) × D/E) — no Cost of Equity or WACC
- [x] Company Workspace Beta Policy / Selected Beta card
- [x] Mock `betaPolicyInputs` on Microsoft (complete), Disney (tax only), Volvo (D/E + tax)
- [x] Engine Docs relevering section; QA script `scripts/qa-beta-policy.mjs`
- [x] ISM-sector not used for beta selection

## Phase 4C-2B-9 - Beta Engine Foundation (Reference Lookup)
- [x] Added `lib/types/beta-engine.ts` (`BetaReferenceRow`, `BetaLookupResult`, `BetaReadinessStatus`)
- [x] Added read-only `lib/engines/beta/betaReferenceService.ts`
- [x] Benchmark → `betaTableKey` (`tblBenchmarkDataPullKeys`) → `damodaran_beta_global` row lookup
- [x] Flexible beta column detection (named headers + betaGlobal position fallback)
- [x] Company Workspace Beta Reference / Beta Readiness card
- [x] Engine Docs page `/engine-docs/beta-engine`
- [x] Flowchart/build status updated — Beta Engine foundation in progress
- [x] No WACC, Cost of Equity, relevering, FCFF, terminal, bridge, or intrinsic math
- [x] ISM-sector not used for beta lookup (benchmark-first only)
- [x] Riskfree / FX / Country ERP / Damodaran import / Industry Benchmark Config tables unchanged

## Phase 4C-2B-11 - WACC Engine Foundation
- [x] Added `lib/types/wacc-engine.ts`, `waccMath.ts`, `waccService.ts`, `scripts/qa-wacc-foundation.mjs`
- [x] Cost of Equity and WACC calculated inside WACC foundation only — not official valuation output
- [x] Company Workspace WACC Foundation card; Engine Docs `/engine-docs/wacc-engine`
- [x] Valuation Engines status: WACC Engine Foundation; Forecast/FCFF/Terminal/Intrinsic not started
- [x] Country-of-risk ERP with Review note (revenue-weighted ERP pending); no synthetic rating CoD
- [x] No FCFF, Terminal Value, Intrinsic Value, or Dashboard decision logic from WACC

## Phase 4C-2B-12 - Forecast & Fade Engine Foundation
- [x] Added `lib/types/forecast-fade-engine.ts`, `forecastFadeRules.ts`, `forecastFadeService.ts`, `scripts/qa-forecast-fade-foundation.mjs`
- [x] Stage/history/cyclicality and fade readiness from Industry Benchmark Config — no forecast or FCFF math
- [x] Company Workspace Forecast & Fade Foundation card; Engine Docs `/engine-docs/forecast-fade-engine`
- [x] Valuation Engines status: Forecast & Fade Foundation; Reinvestment/FCFF/Terminal/Intrinsic not started
- [x] Benchmark-first only — ISM-sector display-only; not connected to Dashboard decisions

## Phase 4C-2B-13 - Reinvestment / FCFF Engine Foundation
- [x] Added `lib/types/reinvestment-fcff-engine.ts`, `reinvestmentFcffMath.ts`, `reinvestmentFcffService.ts`, `scripts/qa-reinvestment-fcff-foundation.mjs`
- [x] NOPAT, Direct and Sales-to-Capital reinvestment, FCFF — no terminal, DCF/PV, bridge, or intrinsic math
- [x] Company Workspace Reinvestment / FCFF Foundation card; Engine Docs `/engine-docs/reinvestment-fcff-engine`
- [x] Valuation Engines status: Reinvestment / FCFF Foundation; Terminal/Bridge/Intrinsic not started
- [x] Benchmark cyclical/high review notes only — ISM-sector display-only; not connected to Dashboard decisions

## Phase 4C-2B-14 - Terminal Value Engine Foundation
- [x] Added `lib/types/terminal-value-engine.ts`, `terminalValueMath.ts`, `terminalValueService.ts`, `scripts/qa-terminal-value-foundation.mjs`
- [x] Terminal FCFF + Gordon terminal value foundation outputs (no discounting; no DCF/PV)
- [x] Stable growth vs stable WACC guardrail (stable growth >= stable WACC => null terminal value)
- [x] Company Workspace Terminal Value Foundation card; Engine Docs `/engine-docs/terminal-value-engine`
- [x] Valuation Engines status: Terminal Value Engine Foundation; Firm-to-Equity Bridge / Intrinsic not started
- [x] Method scope: Gordon Growth only for this phase; Exit Multiple / Hybrid treated as not implemented review notes

## Phase 4C-2B-15 - DCF / PV Engine Foundation
- [x] Added `lib/types/dcf-pv-engine.ts`, `dcfPvMath.ts`, `dcfPvService.ts`, `scripts/qa-dcf-pv-foundation.mjs`
- [x] Discounting + PV of forecast FCFF foundation outputs (no multi-year forecast math in this phase)
- [x] PV of terminal value and Value of Operating Assets calculated foundation-only (no discounting to equity bridge/intrinsic)
- [x] Company Workspace DCF / PV Foundation card; Engine Docs `/engine-docs/dcf-pv-engine`
- [x] Valuation Engines status: DCF / PV Engine Foundation; Firm-to-Equity Bridge / Intrinsic not started
- [x] ISM-sector display-only; DCF/PV logic uses only WACC + terminal value + FCFF foundations

## Phase 4C-2B-16 - Firm-to-Equity Bridge Engine Foundation
- [x] Added `lib/types/equity-bridge-engine.ts`, `equityBridgeMath.ts`, `equityBridgeService.ts`, `scripts/qa-equity-bridge-foundation.mjs`
- [x] Equity Value from Value of Operating Assets + explicit bridge adjustments (no intrinsic value per share)
- [x] Total Debt = Gross Debt + Lease Liabilities (explicit gross debt; not net debt)
- [x] Company Workspace Firm-to-Equity Bridge Foundation card; Engine Docs `/engine-docs/equity-bridge-engine`
- [x] Valuation Engines status: Firm-to-Equity Bridge Foundation; Intrinsic Value / Share not started
- [x] ISM-sector display-only; bridge logic uses DCF/PV operating assets + balance sheet bridge scaffold only

## Phase 4C-2B-17 - Intrinsic Value / Share Engine Foundation
- [x] Added `lib/types/intrinsic-value-engine.ts`, `intrinsicValueMath.ts`, `intrinsicValueService.ts`, `scripts/qa-intrinsic-value-foundation.mjs`
- [x] Intrinsic Value / Share = Equity Value ÷ selected diluted shares (explicit share unit: millions | absolute)
- [x] Company Workspace Intrinsic Value / Share Foundation card; Engine Docs `/engine-docs/intrinsic-value-engine`
- [x] Valuation Engines status: Intrinsic Value / Share Foundation; MOS / Decision Layer not started
- [x] No MOS, entry price, buy/sell/hold, or Dashboard decision wiring in this phase

## Phase 4C-2B-18 - MOS / Decision Layer Foundation (Part 2 — UI + Docs)
- [x] MOS / Decision foundation card on Company Workspace (after Intrinsic Value / Share)
- [x] `computeCompanyFoundationBundle` extended with `mosDecision` (single bundle per page load)
- [x] `mosDecisionService` accepts optional upstream intrinsic bundle (no duplicate valuation chain)
- [x] Engine Docs `/engine-docs/mos-decision-engine`; Engine Docs index updated
- [x] Valuation Engines status: MOS / Decision Layer = Foundation; Dashboard decision integration = Not started
- [x] Flowchart/status: MOS / Decision Layer Foundation; Dashboard decision integration not started
- [x] Foundation-only decision outcome (Above Required MOS / Below Required MOS / N/A) — no Buy/Sell/Hold
- [x] No official Dashboard decision wiring in this phase

## Phase 4C-2B-21 - Manual Inputs Persistence (Part 1–2A)
- [x] Part 1: `companyInputs` persistence types, validation, mapping, merge, fingerprint prep (`persistence_only`)
- [x] Part 2A: Save UI + `POST/GET /api/companies/[cleanTicker]/manual-inputs`; local draft + reload on Inputs tab
- [x] Valuation tab unchanged: base company + `getCachedCompanyFoundationBundle`; no engine_wired merge

## Phase 4C-2B-23 - Manual Inputs Market Overlay Wiring (Part 2B-2)
- [x] `market_overlay_wired` save status; `mergeMarketOverlayManualInputs` (current price + required MOS only)
- [x] Foundation cache: valuation fingerprint from base company; market fingerprint from overlay; STALE MOS-only path
- [x] MOS / Decision Foundation + Dashboard presentation use overlay; Beta→Intrinsic unchanged
- [x] `scripts/qa-manual-inputs-market-overlay-wiring.mjs`

## Phase 4C-2B-22 - Manual Inputs Engine Wiring Contract (Part 2B-1)
- [x] `lib/company-workspace/manualInputsEngineWiringContract.ts` — allowlist per field and engine group
- [x] All fields `not_wired_yet`; `shouldInvalidateFoundationCacheOnManualInputsSave("persistence_only")` = false
- [x] Inputs tab wiring contract documentation panel; `scripts/qa-manual-inputs-wiring-contract.mjs`
- [x] No valuation math, fingerprint, or cache changes in this phase

## Phase 4C-2B-20 - Foundation Bundle Cache (performance)
- [x] In-memory foundation bundle cache with valuation + market overlay fingerprints
- [x] `getCachedCompanyFoundationBundle` on Company Workspace and Dashboard (parallel + cache HIT)
- [x] Market-only STALE path recomputes MOS overlay without full valuation chain
- [x] Dev bypass: `?refresh=1` or `COMPANY_FOUNDATION_CACHE_DISABLED=1`; logs `[foundation-cache] HIT|MISS|STALE|BYPASS`
- [x] `scripts/qa-foundation-cache.mjs`; pluggable cache store interface for future Firestore backend

## Phase 4C-2B-19 - Dashboard Decision Integration (Part 1–2)
- [x] Part 1: `lib/types/dashboard-decision-engine.ts`, `dashboardDecisionMapping.ts`, `dashboardDecisionService.ts`, `scripts/qa-dashboard-decision-integration-foundation.mjs`
- [x] Part 2: Dashboard UI foundation table on `/` via `buildDashboardFoundationPresentationRows` (one bundle per company)
- [x] Engine Docs `/engine-docs/dashboard-decision-engine`; Valuation Engines status: Dashboard decision integration = Foundation
- [x] Legacy mock decision (Approve/Watchlist) shown separately — not official, not mixed with MOS foundation outcome
- [x] No Buy/Sell/Hold, gateway, hard gate, or shadow valuation; Dashboard does not calculate valuation math

## Phase 5 - Planned Later
- [ ] Form UX for company inputs and period editing
- [ ] Server-side API adapter hardening and observability
- [ ] Global valuation engine function skeletons (still no full math until approved)
- [ ] Review rules evaluation scaffolding from severity model
