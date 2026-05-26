# Main Valuation Flow (Phase 0-4C-2B-6)

## Canonical Flow
Input -> Reference Data -> Global Valuation Engine -> Company Valuation Engine Results -> Outputs/Dashboard

## Source of Truth
- Master Specification v1.5 is the active benchmark-first source of truth for industry configuration.
- Industry Benchmark Config is the primary module for benchmark-first status/defaults/pull keys; ISM-sector is display-only.
- Exact v1.5 benchmark tables are now parsed/displayed as source of truth (not generated candidates).

## Global Valuation Engine (Planned)
- Forecast & Fade Engine
- Reinvestment & FCFF Engine
- Risk/WACC Engine
- Terminal Value Engine
- Firm-to-Equity Bridge Engine
- Per-Share Engine
- Quality/Review Engine
- Decision Engine

## Rule Clarifications
- Global Valuation Engine = shared logic used by all companies.
- Company Valuation Engine Results = one company's output path and decisions.
- Dashboard displays outputs only and does not run valuation calculations.

## Reference Data Refresh Policy (Phase 4C-2B-4)
- Riskfree Rates and FX Rates refresh automatically once per day via Vercel Cron.
- Scheduled cron target: 06:00 UTC (`0 6 * * *`).
- Same cron route orchestrates both refreshes with explicit order:
  - Riskfree refresh first
  - FX refresh second
  - Separate status fields remain visible for each dataset
- Refresh does not run on normal frontend page loads.
- Manual refresh actions can exist for support/dev/admin use.
- Manual Override values always have priority over live values.
- Phase 4A implemented refresh architecture and status tracking scaffold.
- Phase 4B-1 implements live Riskfree refresh:
  - Riskfree: FRED only (implemented)
  - FRED values are converted from percent to decimal internal rates
  - Manual override remains higher priority than live rates
- Phase 4B-2 implements live FX provider chain refresh:
  - EODHD-1 -> EODHD-2 -> FMP -> Finnhub -> MarketStack (optional skip) -> Alpha Vantage-1 -> Alpha Vantage-2 -> Manual Override/Cache fallback
  - Provider chain runs sequentially (not parallel) to protect API quotas
  - Same-currency pairs are always normalized to selected/live FX = 1
  - Manual override remains authoritative selected FX
  - Required FX pairs are derived from company currencies and stored bidirectionally:
    - trading -> valuation and valuation -> trading
    - reporting -> valuation and valuation -> reporting
  - Reverse/reference pairs may be derived from inverse of refreshed direct pair rates
  - Provider call volume is constrained by `FX_REFRESH_MAX_PAIRS_PER_RUN`
- Phase 4C-1 implements Country Risk / ERP Data Hub module:
  - Country ERP rows are primary
  - Regional ERP rows are calculated fallback/reference from Country ERP + country-regional mapping
  - Country-regional mapping is many-to-many (one country can belong to multiple groups)
  - Source import is protected manual refresh (not daily cron)
  - Revenue geography will drive weighted ERP in future phases
  - Riskfree remains valuation-currency based and separate from ERP
- Phase 4C-2A implements Damodaran Industry Data Vault / Source Register module:
  - dataset metadata register for core/support/optional/advanced files
  - local-file import/parsing scaffold (XLS/XLSX)
  - generated industry master list for mapping readiness
  - generated core coverage matrix for completeness checks
  - protected manual refresh route
  - stale import policy (180 days)
  - no sector mapping logic and no valuation math in this phase
- Phase 4C-2B-1 implements Sector / Industry Mapping foundation module:
  - official ISM-sector list available in Data Hub
  - mapping rows intentionally start as blank/reviewable
  - benchmark values validated against Damodaran Industry Master List when present
  - old Google Sheet mapping is context only, not app source-of-truth
  - candidate mapping logic is deferred to Phase 4C-2B-2
  - no valuation math integration in this phase
- Phase 4C-2B-2 implements Sector Mapping candidate logic module:
  - generates reviewable candidate benchmark mappings
  - validates candidate benchmark names against Damodaran Industry Master List
  - populates benchmark keys only when validated primary benchmark and coverage permit
  - preserves user-edited benchmark values by default unless explicit overwrite mode is requested
  - mapping remains advisory and does not directly drive valuation outputs
- Phase 4C-2B-3 corrects mapping architecture to benchmark-first:
  - Damodaran benchmark is primary key for reference-data lookup
  - ISM-sector is internal classification suggested from benchmark mapping
  - reverse ISM -> benchmark candidates remain helper-only support
  - benchmark-first mapping still recommends/flags and does not calculate valuation
- Phase 4C-2B-4 extends benchmark-first rows with recommendation metadata:
  - default stage type
  - cyclicality flag
  - history/normalization hints
  - stable margin/ROC/sales-to-capital hints
  - forecast-fade and terminal-readiness hints
  - secondary/fallback benchmark review hints
  - recommendations only; still no valuation math
- Phase 4C-2B-5 consolidates Industry Benchmark Config contracts:
  - visible naming uses Industry Benchmark Config (route compatibility may keep `/sector-industry-mapping`)
  - selected Damodaran Industrial Benchmark is the primary industry anchor
  - ISM-sector is derived/display-only
  - benchmark pull keys are benchmark-primary config authority
  - pricing multiples remain sanity-only
  - no valuation math is added
- Phase 4C-2B-6 enforces exact v1.5 table source-of-truth:
  - `tblIndustryBenchmarkHeader`, `tblDamodaranIndustryUniverse`, `tblIndustryBenchmarkConfig`,
    `tblBenchmarkDataPullKeys`, `tblIndustryISMDisplayMap`, `tblIndustryBenchmarkRules`,
    `tblIndustryBenchmarkStatusValues`
  - generated/candidate mapping remains internal helper only
  - pull keys come from `tblBenchmarkDataPullKeys`
  - ISM map remains display-only (`Display only - no model-driving effect`)
- Phase 4C-2B-7 aligns Damodaran Data with v1.5 before Beta/WACC:
  - registry classifications and readiness gates updated
  - pull-key resolver maps config keys to Damodaran dataset registry (no numeric extraction yet)
  - pricing multiples remain sanity-only and do not block readiness
  - Damodaran Data feeds Industry Benchmark Config; ISM-sector is not part of Damodaran Data logic
- Phase 4C-2B-10 adds Beta relevering and selected beta policy (beta-only):
  - unlevered reference → company D/E and tax → relevered / selected beta
  - no Cost of Equity, WACC, or valuation outputs
  - ISM-sector not used
- Phase 4C-2B-11 adds WACC Engine Foundation:
  - Selected Beta → Riskfree → ERP → Cost of Equity → capital structure / cost of debt → WACC
  - foundation output only — not FCFF, terminal, intrinsic, or Dashboard
  - country-of-risk ERP with Review note until revenue-weighted ERP exists
- Phase 4C-2B-12 adds Forecast & Fade Engine Foundation:
  - Selected Damodaran Industrial Benchmark → Industry Benchmark Config → stage/history/cyclicality/fade readiness
  - structure and readiness recommendations only — no revenue, margin, reinvestment, FCFF, terminal, or intrinsic math
  - ISM-sector is display-only
- Phase 4C-2B-13 adds Reinvestment / FCFF Engine Foundation:
  - Company operating inputs → NOPAT → reinvestment method → reinvestment → FCFF
  - NOPAT, reinvestment and FCFF only — no terminal value, DCF/PV, bridge, intrinsic value, or Dashboard decisions
  - benchmark cyclical/high review context only — ISM-sector is display-only
- Phase 4C-2B-14 adds Terminal Value Engine Foundation:
  - Final forecast FCFF → stable growth → stable WACC → Terminal FCFF → Gordon Terminal Value
  - terminal outputs only — no discounting, no DCF/PV, no Firm-to-Equity Bridge, no Intrinsic Value, and no Dashboard decision logic
  - Exit Multiple / Hybrid treated as not implemented review notes; Gordon is the only foundation method
  - ISM-sector is display-only and must not drive terminal value logic
- Phase 4C-2B-15 adds DCF / PV Engine Foundation:
  - Forecast PV of FCFF + PV of terminal value using foundation WACC and foundation FCFF sources
  - discounting-only foundation outputs — no bridge, equity value, intrinsic value/share, or Dashboard decision logic
  - ISM-sector is display-only and must not drive DCF/PV logic
- Phase 4C-2B-16 adds Firm-to-Equity Bridge Engine Foundation:
  - Value of Operating Assets (DCF/PV) + cash/non-operating assets − debt/preferred/minority/other claims → Equity Value
  - bridge foundation outputs only — no intrinsic value per share, MOS, entry price, or Dashboard decision logic
  - Total Debt uses gross debt plus lease liabilities (not net debt); ISM-sector is display-only
- Phase 4C-2B-17 adds Intrinsic Value / Share Engine Foundation:
  - Equity Value (bridge) ÷ selected diluted shares (explicit share unit) → Intrinsic Value / Share
  - per-share foundation output only — no MOS, entry price, buy/sell/hold, or Dashboard decision logic
  - current share price is display-only context when available; ISM-sector is display-only
- Phase 4C-2B-9 adds Beta Engine Foundation (reference lookup only):
  - Selected Damodaran Industrial Benchmark → `betaTableKey` → `damodaran_beta_global` → Beta Reference display
  - Company Workspace and `/engine-docs/beta-engine` show readiness and source metadata
  - no Cost of Equity, WACC, relevering, FCFF, terminal, bridge, or intrinsic math
  - ISM-sector is not used for beta lookup

## Phase 4A Correction Notes
- Riskfree selection is now explicitly tied to valuation currency mapping.
- Riskfree internal values are stored as decimals and only formatted as percentages in UI.
- Currency Map and FX Pair Rates are explicit, separate structures.
- Same-currency FX pairs are generated with selected rate fixed to 1.
- Separate seed actions exist for Riskfree defaults, Currency Map defaults, and FX Pairs.

## Phase Scope Note
- Phase 4B-1 includes secure server-side FRED refresh for riskfree rows.
- Phase 4B-2 includes secure server-side FX provider refresh for FX pair rows.
- Phase 4C-1 includes secure server-side Country Risk / ERP import scaffolding and Data Hub presentation.
- Phase 4C-2A includes secure server-side Damodaran industry dataset import scaffolding and Data Vault presentation.
- Phase 4C-2B-1 includes secure server-side Sector Mapping foundation seed scaffolding and Data Hub presentation.
- Phase 4C-2B-2 includes secure server-side Sector Mapping candidate generation scaffolding and review presentation.
- Phase 4C-2B-4 includes secure server-side benchmark-first recommendation-default generation scaffolding and benchmark-primary workspace recommendation presentation.
- FX remains separate from riskfree and no valuation math is introduced in this phase.
- Full historical/period-level financial FX conversion remains a future phase.
- Weighted ERP integration into Risk/WACC engine remains future phase work.
