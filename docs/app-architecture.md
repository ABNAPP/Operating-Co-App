# Operating Co App Architecture (Phase 0-4C-2B-5)

## Purpose
- Translate the "Operating Co Template — Master Specification v1.5" into a Next.js / React / TypeScript app foundation.
- Current scope includes architecture, app shell, Phase 2 type/data model scaffolding, Phase 3 Firestore foundation, Phase 4A refresh scaffolding, Phase 4B-1 FRED riskfree refresh, Phase 4B-2 FX provider refresh, Phase 4C-1 Country Risk / ERP Data Hub module, Phase 4C-2A Damodaran Industry Data Vault / Source Register, Phase 4C-2B-1 Sector / Industry Mapping Foundation, Phase 4C-2B-2 Sector Mapping Candidate Logic, Phase 4C-2B-3 benchmark-first sector mapping correction, Phase 4C-2B-4 benchmark-first stage/cyclicality default recommendations, and Phase 4C-2B-5 Industry Benchmark Config v1.5 contract consolidation, and Phase 4C-2B-7 Damodaran v1.5 bridge alignment.
- Excluded scope remains valuation math, external market-data API integrations, Google Sheets logic, and Apps Script.

## Core Product Concept
Input -> Reference Data -> Global Valuation Engine -> Company-specific valuation results -> Outputs/Dashboard.

## Architecture Rules
- Dashboard is display/navigation only. It is **not** a valuation engine.
- Global Valuation Engine is shared TypeScript logic across all companies.
- Company Valuation Engine Results are company-specific outputs generated from one company's inputs.
- No valuation calculations in Phase 0-4C-2B-5.
- `.env.local` remains local-only and must never be committed.
- Daily refresh does not run on page load and is orchestrated via Vercel Cron.
- Manual Override values always have priority over live values.
- Industry Benchmark Config is benchmark-first: selected Damodaran benchmark is primary; ISM-sector is derived/display-only.

## Global UI Formatting Standard
- All new numeric UI uses `lib/utils/formatters.ts` (display layer only; no changes to stored/imported values or valuation math).
- `formatNumber` for normal numbers (2 decimals); `formatPercent` for rates/margins/growth/ROC/ROIC/tax/WACC/ERP/spreads (2 decimals); `formatAmountMillions` for amounts in millions; `formatPerShare` for per-share values; `formatFxRate` for FX (4 decimals).
- Do not format IDs, tickers, dataset IDs, FRED series IDs, dates, statuses, row counts, or text labels.
- Damodaran raw tables and future Data Hub tables: `formatTableCell` / `FormattedTableCell` for generic numeric cells; `formatColumnHeader` for amount headers (`Revenue (m)`, `Market Cap (m)`, `USDm` when currency is known).

## Main Areas (top navigation)
- Dashboard (table view of official/support outputs)
- Companies (card view + create company action; company cards open `/companies/[cleanTicker]` Company Workspace)
- Data Hub (shared reference data and API status)
- Engine Docs (traceability and build status)
- Settings (environment and configuration scaffolding; includes Flowchart card → `/engine-docs/flowchart`)

Company Workspace is the per-company shell at `/companies/[cleanTicker]` (not a separate top-nav tab). Legacy `/company-workspace` redirects to `/companies`.

## Phase 2 Additions (Type/Data Model Only)
- Company identity and ticker model (`CompanyIdentity`, `FullTicker`, `CleanTicker`, `Exchange`)
- Currency model (`CurrencyCode`, `CurrencyConfig`, `CurrencyReviewStatus`)
- Historical and forecast period models (`YEAR_MINUS_*`, `LATEST_FY`, `LTM`, `YEAR_PLUS_*`)
- Manual input structures (income statement, cash flow, working capital, debt, lease, risk/WACC, terminal, decision layer, scenario, accounting)
- Reference data placeholders (riskfree rates, FX, country risk/ERP, Damodaran metadata, sector mapping, beta reference, forecast/fade rules, API provider config)
- Valuation result placeholders for each planned engine stage
- Review severity model and worst-flag-wins structure
- Dashboard row model (`DashboardCompanyRow`) for display-only outputs

## Phase 3 Additions (Firestore Foundation)
- Firebase client initialization (`lib/firebase/client.ts`) with safe, modular initialization and no hardcoded credentials
- Firestore collection constants and repository scaffold (`lib/firestore/*`)
- Company, dashboard, reference data, and build status repositories with error handling
- Development-only manual seed action in Settings page
- Firestore status utility and Data Hub readiness/status section
- Mock fallback remains active when Firestore is empty or unavailable

## Phase 4A Additions (Daily Refresh Architecture)
- Vercel Cron schedule configured for daily refresh (`0 6 * * *`)
- Authorized server-only cron endpoint (`/api/cron/daily-data-refresh`) protected by `CRON_SECRET`
- Refresh orchestration service scaffold for:
  - `refreshRiskfreeRatesFromFred()` (planned provider execution in Phase 4B)
  - `refreshFxRatesFromProviderPriority()` (planned provider execution in Phase 4B)
- Cache-first and idempotent structure with status/warning/error reporting fields
- Manual override precedence preserved in selection structure
- Data Hub and Settings show refresh status and cron configuration

## Phase 4A Corrections
- Riskfree rows now explicitly use decimal internal rates (`0.0415` for 4.15%)
- Riskfree selection is explicit by valuation currency lookup
- Currency Map model is explicit and seedable as a separate dataset
- FX Pair model now uses `fromCurrency` + `toCurrency` and stable IDs
- Same-currency FX pairs are generated with selected rate fixed at `1`
- Data Hub now exposes separate seed actions:
  - Seed Default Riskfree Rates
  - Seed Default Currency Map
  - Generate/Seed FX Pairs from Currency Map
- No live provider calls added; Phase 4B remains provider integration phase

## Data Hub UX Refactor
- `Data Hub` main route is now a card-based hub view with status summary and links.
- Detailed data tables moved to dedicated routes:
  - `/data-hub/riskfree-rates`
  - `/data-hub/fx-rates`
  - `/data-hub/damodaran-data`
  - `/data-hub/country-risk-erp`
  - `/data-hub/sector-industry-mapping`
  - `/data-hub/beta-reference`
  - `/data-hub/forecast-fade-rules`
  - `/data-hub/api-integrations`
  - `/data-hub/refresh-status`

## Phase 4B-1 Additions (FRED Riskfree Refresh)
- Server-only FRED client (`lib/data-hub/fredClient.ts`) using `file_type=json`
- FRED percentage observations are converted to decimal internal rates (`value / 100`)
- Server-only Firebase Admin scaffold (`lib/firebase/admin.ts`) for secure Firestore writes
- Riskfree refresh service updates live values, timestamps, source metadata, status, and notes
- Manual override values remain prioritized over live rates
- Daily cron now executes real riskfree refresh while FX remains pending Phase 4B-2
- Protected manual server endpoint exists for riskfree refresh (`POST /api/data-hub/riskfree-rates/refresh`)
- Data Hub riskfree page now reads Firestore via server-first path (Admin preferred) so refreshed FRED rows are shown when available
- Mock fallback label is shown only when Firestore data is unavailable

## Phase 4B-2 Additions (FX Provider Refresh)
- Server-only FX provider chain added with priority:
  - EODHD-1
  - EODHD-2
  - FMP
  - Finnhub
  - MarketStack (optional/guarded skip)
  - Alpha Vantage-1
  - Alpha Vantage-2
  - Manual Override / Cache fallback
- FX refresh service updates Firestore FX pair rows using provider chain results
- Provider chain execution is sequential (not parallel) to protect limited API quotas
- Daily cron orchestration order is explicit:
  - Riskfree refresh first
  - FX refresh second
  - Shared route, separate status fields
- Manual override remains authoritative for selected FX rate
- Same-currency pairs are always selected FX rate = 1
- Required FX pairs are derived from company currencies and stored in Data Hub:
  - trading -> valuation and valuation -> trading
  - reporting -> valuation and valuation -> reporting
- Reverse/reference pairs may be derived as inverse of a refreshed direct pair to reduce API calls
- Refresh run is quota-protected by `FX_REFRESH_MAX_PAIRS_PER_RUN`
- Daily cron now orchestrates riskfree refresh + FX refresh

## Phase 4C-1 Additions (Country Risk / ERP Data Hub)
- Added Country Risk / ERP reference-data schema layer:
  - country ERP rows
  - regional ERP rows
  - country-to-region mapping
  - regional group definitions
  - source notes and usage rules
  - weighted ERP formula guide placeholders
- Added protected manual import route for Damodaran Country ERP source (`POST /api/data-hub/country-risk-erp/refresh`)
- Country ERP import is manual and not connected to daily cron
- Added stale detection policy (`180` days)
- Country rows are primary reference data; regional rows are calculated fallback/reference
- Regional ERP now uses many-to-many country-to-region mapping:
  - one country can belong to multiple regional groups
  - mapping is active-flag driven and editable
- Regional ERP calculation is strict mapping-based:
  - simple arithmetic average over active mapped countries
  - missing/non-numeric metric values are ignored per metric
- Revenue geography is the planned driver for weighted ERP; valuation currency remains the driver for riskfree rates
- No valuation engine math, WACC, Cost of Equity, FCFF, Terminal Value, or bridge math added in this phase

## Phase 4C-2A Additions (Damodaran Industry Data Vault / Source Register)
- Added a dedicated Damodaran Data Vault route (`/data-hub/damodaran-data`) focused on:
  - source summary metadata
  - dataset register status
  - import/refresh status
  - generated industry master list
  - generated dataset coverage matrix
  - readiness summary for future Sector / Industry Mapping
- Added dataset-level source metadata contract fields for each registered file:
  - source name
  - source URL
  - download URL
  - source/update date
  - imported/last-updated timestamp
  - status and notes
- Added local-file parser/import scaffold for Damodaran XLS/XLSX raw files in `data/damodaran/raw/`
- Added graceful missing-file behavior:
  - missing files are marked as `Missing Local File`
  - import process continues without crashing
- Added stale-data policy:
  - imported rows older than 180 days are marked `Stale`
- Added generated Industry Master List from available imported datasets with normalized-name comparison and preserved display names
- Added generated core-coverage matrix (`OK` / `Missing`) to support future mapping validation
- Added protected manual refresh endpoint (`POST /api/data-hub/damodaran-data/refresh`) requiring Bearer `CRON_SECRET`
- Updated Damodaran Data Vault UX to card-first navigation:
  - main route shows compact cards only (filters removed)
  - cards are lightweight (name, source update date, status, row count, open link)
  - datasets open to dedicated detail routes (`/data-hub/damodaran-data/[datasetId]`)
  - detail routes prioritize stored raw imported table rows with metadata collapsed
- Added resilient UI read behavior for Damodaran vault:
  - Firestore-first reads when available
  - local persisted cache fallback for permission-blocked write environments
- Added Data Hub performance hardening:
  - Data Hub main route loads summary counts/statuses only (no heavy table payloads)
  - Damodaran main route avoids loading full raw rows and uses vault summary + dataset register cards
  - Damodaran dataset detail route uses stored rows with server-side pagination
- Added persistence safety guardrails for FX:
  - FX seed/generate preserves existing live/manual/selected values
  - unsuccessful provider refreshes no longer clear previously stored FX rates
  - same-currency pairs are normalized to `1` and persisted
- Local vs deployed runtime note:
  - local app reads local files/cache and local environment variables
  - Vercel reads deployed files and Vercel environment variables
  - Firestore persistence is independent from GitHub push
  - pushing code deploys code/files only; it does not by itself write data into Firestore
- Explicitly excluded in this phase:
  - Sector / Industry Mapping logic implementation
  - valuation engine math (WACC, Cost of Equity, FCFF, Terminal Value, Bridge, Intrinsic Value)

## Phase 4C-2B-1 Additions (Sector / Industry Mapping Foundation)
- Added official internal ISM-sector list as app-owned taxonomy for Operating Co workflows.
- Added blank/reviewable Sector / Industry Mapping rows with explicit `Mapping Required` / `Review Required` / `Excluded / Special Review` statuses.
- Added benchmark validation hook against Damodaran Industry Master List:
  - exact match required for nonblank benchmark values
  - normalized-only matches flagged for review
  - blank benchmarks allowed in foundation stage when correctly flagged
- Added local cache fallback for sector mapping data (`data/sector/cache/sector-mapping-cache.json`).
- Added protected server route for foundation seeding:
  - `POST /api/data-hub/sector-industry-mapping/seed-foundation`
  - requires Bearer `CRON_SECRET`
- Added Data Hub foundation view and Company Workspace scaffold:
  - ISM-sector list visibility
  - mapping-required placeholder visibility
  - no valuation-engine integration yet
- Source-of-truth clarification:
  - old Google Sheet sector mapping content is context only, not active source-of-truth mapping in app data.

## Phase 4C-2B-2 Additions (Sector Mapping Candidate Logic)
- Added candidate mapping generation from ISM-sectors to Damodaran benchmark candidates.
- Added strict benchmark validation against Damodaran Industry Master List before persistence.
- Added candidate guide rows and readiness refresh updates for analyst-review workflows.
- Added benchmark key assignment logic:
  - keys are populated from validated primary benchmark
  - key assignment is limited by dataset coverage availability
  - missing coverage leaves keys blank and flags review warnings
- Added protected generation route:
  - `POST /api/data-hub/sector-industry-mapping/generate-candidates`
  - Bearer `CRON_SECRET` required
- Added user-edit preservation behavior:
  - existing nonblank benchmark fields are not silently overwritten unless explicit overwrite mode is used
- Explicit boundary retained:
  - mapping recommends context only and does not directly force valuation assumptions
  - no WACC/CoE/FCFF/TV/Bridge/Intrinsic math added

## Phase 4C-2B-3 Additions (Benchmark-first Sector Mapping Correction)
- Corrected mapping architecture to benchmark-first:
  - Damodaran benchmark is primary lookup key for reference-data chain
  - ISM-sector remains internal business classification
- Added benchmark-to-ISM collection and repository accessors with local cache fallback support.
- Added benchmark-first candidate generation route and Data Hub rendering section.
- Kept ISM-to-benchmark rows as reverse/helper view (not primary valuation key direction).
- Updated Company Workspace scaffold to benchmark-first selection and ISM auto-suggestion behavior.
- Legacy Google Sheet remains context-only input, never source-of-truth.

## Phase 4C-2B-4 Additions (Benchmark-first Stage/Cyclicality Defaults)
- Added benchmark-first recommendation fields for:
  - default stage type
  - cyclicality
  - history/normalization hints
  - stable margin/ROC/sales-to-capital rules
  - forecast-fade and terminal-readiness hints
- Added transparent benchmark default-rules helper logic for utility/commodity/technology/defensive/healthcare/broad/excluded categories.
- Kept recommendations advisory only:
  - no valuation engine calculations
  - no beta/WACC/FCFF/terminal/bridge/intrinsic computations
- Reverse ISM -> benchmark helper table remains available but explicitly secondary.

## Phase 4C-2B-5 Additions (Industry Benchmark Config v1.5 Contract Consolidation)
- Master Specification v1.5 is the active source of truth for benchmark-first industry logic.
- Visible module naming is now Industry Benchmark Config (route compatibility can remain as `sector-industry-mapping`).
- Selected Damodaran Industrial Benchmark is the primary industry anchor for workspace and dashboard display.
- ISM-sector is derived/display-only and is not the primary valuation driver.
- Industry Benchmark Config stores benchmark pull-key authority (beta, margin, ROC/ROIC, reinvestment/sales-to-capital, working capital, tax, WACC sanity, multiples sanity).
- Pricing multiples remain sanity-only and do not feed official intrinsic value outputs.
- No valuation math is added in this phase.

## Phase 4C-2B-6 Additions (Exact v1.5 Tables)
- Exact v1.5 Industry Benchmark Config tables are parsed from `data/spec/Operating_Co_Template_Master_Specification_v1_5.txt`.
- Data Hub displays the seven exact source-of-truth tables:
  - `tblIndustryBenchmarkHeader`
  - `tblDamodaranIndustryUniverse`
  - `tblIndustryBenchmarkConfig`
  - `tblBenchmarkDataPullKeys`
  - `tblIndustryISMDisplayMap`
  - `tblIndustryBenchmarkRules`
  - `tblIndustryBenchmarkStatusValues`
- Generated/candidate mappings are retained only as collapsed internal helper data and are not source of truth.
- ISM display map remains display-only and explicitly does not drive valuation engines.
- Pull keys come from `tblBenchmarkDataPullKeys`.

## Phase 4C-2B-7 Additions (Damodaran v1.5 Bridge)
- Damodaran Data cards show v1.5 workbook table names and classification badges.
- Readiness uses `blocksCoreReadiness` (engine-support datasets only); pricing sanity datasets are excluded.
- `histgrGlobal.xls` promoted to Core Support; Total Beta registered as Strong Support; EV multiples marked Missing / Deferred until raw file is added.
- Industry Benchmark Config linkage panel shows pull-key resolver summary and universe cross-check counts.
- Pull-key resolver statically maps key types to dataset IDs without fetching numeric engine values.
- ISM-sector is not used in Damodaran Data vault logic.

## Phase 4C-2B-8 Additions (Settings Flowchart)
- Settings includes a clickable **Flowchart** card linking to `/engine-docs/flowchart`.
- Flowchart page is documentation/navigation only; it does not execute valuation logic or engines.
- Build phase labels and statuses are maintained in `lib/build-flow/buildPhases.ts`.

## Phase 4C-2B-10 Additions (Beta Relevering & Selected Beta Policy)
- Beta Engine now includes reference lookup plus beta-only relevering / selected beta policy.
- `computeBetaPolicy` uses Damodaran unlevered beta + company D/E and tax when provided.
- Does not calculate Cost of Equity, WACC, FCFF, terminal value, bridge, or intrinsic value.
- Manual override and missing capital-structure inputs return Review — not fake final WACC beta.
- ISM-sector is not used for beta selection.

## Phase 4C-2B-11 Additions (WACC Engine Foundation)
- WACC Foundation calculates Cost of Equity and preliminary WACC from Beta Policy selected beta, valuation-currency riskfree, country-of-risk ERP, and explicit scaffold inputs.
- `lib/engines/wacc/waccService.ts` and `lib/engines/wacc/waccMath.ts`; types in `lib/types/wacc-engine.ts`.
- Company Workspace WACC Foundation card; Engine Docs at `/engine-docs/wacc-engine`.
- Not connected to FCFF, terminal value, intrinsic value, or Dashboard decision logic. Synthetic rating cost of debt and revenue-weighted ERP remain pending.

## Phase 4C-2B-12 Additions (Forecast & Fade Engine Foundation)
- Forecast & Fade Foundation recommends stage type, forecast/history years, and fade readiness from Industry Benchmark Config (benchmark-first).
- `lib/engines/forecast-fade/forecastFadeService.ts` and `forecastFadeRules.ts`; types in `lib/types/forecast-fade-engine.ts`.
- Company Workspace Forecast & Fade Foundation card; Engine Docs at `/engine-docs/forecast-fade-engine`.
- Does not calculate revenue, margins, reinvestment, FCFF, terminal value, or intrinsic value. ISM-sector is display-only.

## Phase 4C-2B-13 Additions (Reinvestment / FCFF Engine Foundation)
- Reinvestment / FCFF Foundation calculates NOPAT, reinvestment and FCFF from company operating inputs (benchmark-first review context only).
- `lib/engines/reinvestment-fcff/reinvestmentFcffService.ts` and `reinvestmentFcffMath.ts`; types in `lib/types/reinvestment-fcff-engine.ts`.
- Company Workspace Reinvestment / FCFF Foundation card; Engine Docs at `/engine-docs/reinvestment-fcff-engine`.
- Does not calculate terminal value, DCF/PV, firm-to-equity bridge, intrinsic value, or Dashboard decisions. ISM-sector is display-only.

## Phase 4C-2B-14 Additions (Terminal Value Engine Foundation)
- Terminal Value Foundation calculates Terminal FCFF and Gordon terminal value only (no discounting; no DCF/PV; not connected to bridge/intrinsic value or Dashboard decisions).
- `lib/engines/terminal-value/terminalValueMath.ts` and `lib/engines/terminal-value/terminalValueService.ts`; types in `lib/types/terminal-value-engine.ts`.
- Company Workspace Terminal Value Foundation card; Engine Docs at `/engine-docs/terminal-value-engine`.
- Method support: Gordon Growth is the only implemented foundation method; Exit Multiple / Hybrid are treated as review-only / not implemented for this phase.
- ISM-sector is display-only and must not drive terminal value logic.

## Phase 4C-2B-15 Additions (DCF / PV Engine Foundation)
- DCF/PV foundation calculates PV of forecast FCFF, PV of terminal value, and Value of Operating Assets only.
- `lib/engines/dcf-pv/dcfPvMath.ts` and `lib/engines/dcf-pv/dcfPvService.ts`; types in `lib/types/dcf-pv-engine.ts`.
- Company Workspace DCF / PV Foundation card; Engine Docs at `/engine-docs/dcf-pv-engine`.
- DCF/PV is foundation-only — not an official valuation output yet; it does not calculate firm-to-equity bridge, equity value, intrinsic value per share, or Dashboard decisions.
- ISM-sector is display-only and must not drive DCF/PV logic.

## Phase 4C-2B-16 Additions (Firm-to-Equity Bridge Engine Foundation)
- Firm-to-Equity Bridge foundation calculates Equity Value from Value of Operating Assets and explicit bridge adjustments only.
- `lib/engines/equity-bridge/equityBridgeMath.ts` and `lib/engines/equity-bridge/equityBridgeService.ts`; types in `lib/types/equity-bridge-engine.ts`.
- Company Workspace Firm-to-Equity Bridge Foundation card; Engine Docs at `/engine-docs/equity-bridge-engine`.
- Bridge is foundation-only — it does not calculate intrinsic value per share, MOS, entry price, or Dashboard decisions.
- Total Debt uses gross debt plus lease liabilities (not net debt); optional claims default to zero only when documented in scaffold notes.
- ISM-sector is display-only and must not drive bridge logic.

## Phase 4C-2B-17 Additions (Intrinsic Value / Share Engine Foundation)
- Intrinsic Value / Share foundation calculates per-share value from Equity Value and explicit share-count scaffold only.
- `lib/engines/intrinsic-value/intrinsicValueMath.ts` and `lib/engines/intrinsic-value/intrinsicValueService.ts`; types in `lib/types/intrinsic-value-engine.ts`.
- Company Workspace Intrinsic Value / Share Foundation card; Engine Docs at `/engine-docs/intrinsic-value-engine`.
- Share unit must be explicitly `millions` or `absolute` — no silent unit guessing.
- Does not calculate MOS, entry price, buy/sell/hold, upside/downside, or Dashboard decisions.
- ISM-sector is display-only and must not drive intrinsic value logic.

## Phase 4C-2B-9 Additions (Beta Engine Foundation)
- Beta Engine foundation is read-only reference lookup — not a valuation engine.
- Flow: Selected Damodaran Industrial Benchmark → `betaTableKey` (`tblBenchmarkDataPullKeys`) → `damodaran_beta_global` row → Beta Reference / Readiness display.
- Service: `lib/engines/beta/betaReferenceService.ts`; types: `lib/types/beta-engine.ts`.
- Company Workspace shows Beta Reference card; Engine Docs at `/engine-docs/beta-engine`.
- Uses benchmark-first industry anchor only — ISM-sector is not used for beta lookup.
- Does not calculate Cost of Equity, WACC, relevering, FCFF, terminal value, bridge, or intrinsic value.
- Future phase: company-specific relevering / selected beta policy (still before WACC engine).

## Not Yet Built
- Full Firestore data governance and validation rules
- Real valuation engine math
- Real review/quality decision logic execution
