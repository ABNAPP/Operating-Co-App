<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Global UI Formatting Standard

All new numeric UI must use the shared display formatters in `lib/utils/formatters.ts`. For generic table cells, prefer `formatTableCell` or `components/formatted-table-cell.tsx` (`FormattedTableCell`).

- **`formatNumber`** — normal numbers; default 2 decimals.
- **`formatPercent`** — rates, margins, growth, ROC/ROIC, tax, WACC, ERP, spreads; default 2 decimals. Values with `|x| <= 1` are treated as decimals (`0.1234` → `12.34%`); larger values are treated as already percent-scaled (`12.34` → `12.34%`).
- **`formatAmountMillions`** — monetary and company financial amounts shown in millions. Default: value is already in millions. Pass `valueScale: "absolute"` only when the stored value is in full currency units.
- **`formatPerShare`** — per-share values; default 2 decimals.
- **`formatFxRate`** — FX rates only; **4 decimals** unless explicitly changed project-wide.

**Do not format:** IDs, tickers, dataset IDs, FRED series IDs, dates, statuses, row counts, or plain text labels.

**Do not** mutate stored or imported raw values for display. Formatting is a **display-layer concern only** and must not change valuation math, import logic, or engine calculations.

**Tables:** Damodaran raw tables and future Data Hub tables with dynamic numeric columns should use `formatTableCell` / `FormattedTableCell`. Use `formatColumnHeader` so amount columns show units, e.g. `Revenue (m)`, `Market Cap (m)`, or `USDm` / `SEKm` when currency is known; use `(m)` when currency is unknown.

See also: `docs/app-architecture.md` (Architecture Rules) and `docs/engine-contracts.md` (Display formatting contract).
