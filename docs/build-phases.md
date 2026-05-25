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

## Phase 5 - Planned Later
- [ ] Form UX for company inputs and period editing
- [ ] Server-side API adapter hardening and observability
- [ ] Global valuation engine function skeletons (still no full math until approved)
- [ ] Review rules evaluation scaffolding from severity model
