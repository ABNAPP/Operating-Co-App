# Operating Co App Architecture (Phase 0-4C-2B-1)

## Purpose
- Translate the "Operating Co Template — Master Specification v1.4" into a Next.js / React / TypeScript app foundation.
- Current scope includes architecture, app shell, Phase 2 type/data model scaffolding, Phase 3 Firestore foundation, Phase 4A refresh scaffolding, Phase 4B-1 FRED riskfree refresh, Phase 4B-2 FX provider refresh, Phase 4C-1 Country Risk / ERP Data Hub module, Phase 4C-2A Damodaran Industry Data Vault / Source Register, and Phase 4C-2B-1 Sector / Industry Mapping Foundation.
- Excluded scope remains valuation math, external market-data API integrations, Google Sheets logic, and Apps Script.

## Core Product Concept
Input -> Reference Data -> Global Valuation Engine -> Company-specific valuation results -> Outputs/Dashboard.

## Architecture Rules
- Dashboard is display/navigation only. It is **not** a valuation engine.
- Global Valuation Engine is shared TypeScript logic across all companies.
- Company Valuation Engine Results are company-specific outputs generated from one company's inputs.
- No valuation calculations in Phase 0-4C-2B-1.
- `.env.local` remains local-only and must never be committed.
- Daily refresh does not run on page load and is orchestrated via Vercel Cron.
- Manual Override values always have priority over live values.

## Main Areas
- Dashboard (table view of official/support outputs)
- Companies (card view + create company action)
- Company Workspace (full company analysis shell)
- Data Hub (shared reference data and API status)
- Engine Docs (traceability and build status)
- Settings (environment and configuration scaffolding)

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

## Not Yet Built
- Full Firestore data governance and validation rules
- Real valuation engine math
- Real review/quality decision logic execution
