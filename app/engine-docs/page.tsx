import { ClickableCardLink } from "@/components/clickable-card";

const docCards = [
  {
    href: "/engine-docs/beta-engine",
    title: "Beta Engine Foundation",
    description:
      "Benchmark beta reference lookup, relevering, and selected beta policy (beta-only — no WACC math).",
  },
  {
    href: "/engine-docs/wacc-engine",
    title: "WACC Engine Foundation",
    description:
      "Cost of Equity and WACC foundation outputs — not connected to FCFF, terminal value, or intrinsic value.",
  },
  {
    href: "/engine-docs/forecast-fade-engine",
    title: "Forecast & Fade Engine Foundation",
    description:
      "Stage/history/cyclicality and fade readiness from Industry Benchmark Config — no forecast or FCFF math.",
  },
  {
    href: "/engine-docs/reinvestment-fcff-engine",
    title: "Reinvestment / FCFF Engine Foundation",
    description:
      "NOPAT, reinvestment and FCFF foundation — not connected to terminal value, DCF/PV, bridge, or intrinsic value.",
  },
  {
    href: "/engine-docs/terminal-value-engine",
    title: "Terminal Value Engine Foundation",
    description:
      "Terminal FCFF and Gordon terminal value foundation only — not discounted, and not connected to bridge or intrinsic value.",
  },
  {
    href: "/engine-docs/dcf-pv-engine",
    title: "DCF / PV Engine Foundation",
    description:
      "PV of forecast FCFF + PV of terminal value foundation — foundation-only, no discounting to equity/valuation decisions.",
  },
  {
    href: "/engine-docs/equity-bridge-engine",
    title: "Firm-to-Equity Bridge Engine Foundation",
    description:
      "Equity Value from Value of Operating Assets and explicit bridge adjustments — no intrinsic value per share or dashboard decisions.",
  },
  {
    href: "/engine-docs/intrinsic-value-engine",
    title: "Intrinsic Value / Share Engine Foundation",
    description:
      "Intrinsic value per share from Equity Value and selected diluted shares — no official Dashboard buy/sell/hold decisions.",
  },
  {
    href: "/engine-docs/mos-decision-engine",
    title: "MOS / Decision Engine Foundation",
    description:
      "MOS %, entry price, and foundation-only Above/Below Required MOS outcome — not an official Dashboard decision; no Buy/Sell/Hold logic.",
  },
  {
    href: "/engine-docs/dashboard-decision-engine",
    title: "Dashboard Decision Integration",
    description:
      "Maps foundation bundle outputs to the Dashboard table — presentation-only; no valuation math or official Buy/Sell/Hold.",
  },
];

const markdownSources = [
  "app-architecture.md",
  "main-valuation-flow.md",
  "engine-contracts.md",
  "spec-coverage-tracker.md",
  "build-phases.md",
];

export default function EngineDocsPage() {
  return (
    <section className="pageSection">
      <div>
        <h2 className="sectionHeading">Engine Docs</h2>
        <p className="sectionSubheading">
          Documentation hub for source-spec traceability, engine foundation status, and build
          progress.
        </p>
      </div>

      <div className="cardGrid">
        {docCards.map((card) => (
          <ClickableCardLink key={card.href} href={card.href} title={card.title}>
            <h3 className="cardTitle">{card.title}</h3>
            <p className="cardMeta">{card.description}</p>
          </ClickableCardLink>
        ))}
      </div>

      <div className="panel">
        <p>Review markdown sources in the `docs/` folder:</p>
        {markdownSources.map((source) => (
          <p key={source} className="cardMeta">
            - {source}
          </p>
        ))}
        <p className="cardMeta">- Type modules in `lib/types/*`</p>
      </div>
    </section>
  );
}
