# Operating Co App Architecture (Phase 0-4A)

## Purpose
- Translate the "Operating Co Template — Master Specification v1.4" into a Next.js / React / TypeScript app foundation.
- Current scope includes architecture, app shell, Phase 2 type/data model scaffolding, Phase 3 Firestore foundation, and Phase 4A daily refresh architecture.
- Excluded scope remains valuation math, external market-data API integrations, Google Sheets logic, and Apps Script.

## Core Product Concept
Input -> Reference Data -> Global Valuation Engine -> Company-specific valuation results -> Outputs/Dashboard.

## Architecture Rules
- Dashboard is display/navigation only. It is **not** a valuation engine.
- Global Valuation Engine is shared TypeScript logic across all companies.
- Company Valuation Engine Results are company-specific outputs generated from one company's inputs.
- No real external API calls in Phase 0-4A.
- No valuation calculations in Phase 0-4A.
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

## Not Yet Built
- Full Firestore data governance and validation rules
- API ingestion pipelines (FRED riskfree only, FX provider priority chain)
- Real valuation engine math
- Real review/quality decision logic execution
