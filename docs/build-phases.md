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

## Phase 4B - Planned Next
- [ ] Implement live FRED calls for Riskfree Rates (only source)
- [ ] Implement FX provider priority chain:
  - EODHD-1
  - EODHD-2
  - FMP
  - Finnhub
  - MarketStack
  - Alpha Vantage-1
  - Alpha Vantage-2
  - Manual Override / Cache
- [ ] Add provider-level retries/backoff/circuit-breaker behavior
- [ ] Harden Firestore data validation model and migration strategy

## Phase 5 - Planned Later
- [ ] Form UX for company inputs and period editing
- [ ] Server-side API adapter hardening and observability
- [ ] Global valuation engine function skeletons (still no full math until approved)
- [ ] Review rules evaluation scaffolding from severity model
