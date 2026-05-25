# Main Valuation Flow (Phase 0-4A)

## Canonical Flow
Input -> Reference Data -> Global Valuation Engine -> Company Valuation Engine Results -> Outputs/Dashboard

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

## Reference Data Refresh Policy (Phase 4A)
- Riskfree Rates and FX Rates refresh automatically once per day via Vercel Cron.
- Scheduled cron target: 06:00 UTC (`0 6 * * *`).
- Refresh does not run on normal frontend page loads.
- Manual refresh actions can exist for support/dev/admin use.
- Manual Override values always have priority over live values.
- Phase 4A implements refresh architecture and status tracking only.
- Phase 4B implements live provider calls:
  - Riskfree: FRED only
  - FX: provider-priority chain

## Phase 4A Correction Notes
- Riskfree selection is now explicitly tied to valuation currency mapping.
- Riskfree internal values are stored as decimals and only formatted as percentages in UI.
- Currency Map and FX Pair Rates are explicit, separate structures.
- Same-currency FX pairs are generated with selected rate fixed to 1.
- Separate seed actions exist for Riskfree defaults, Currency Map defaults, and FX Pairs.

## Phase Scope Note
- Phase 4A includes Firestore-aware refresh orchestration scaffold, secure cron endpoint, and UI status reporting.
- Real provider integrations are deferred to Phase 4B.
