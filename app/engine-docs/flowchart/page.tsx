import { BackLink } from "@/components/back-link";
import {
  CURRENT_BUILD_PHASES,
  FLOWCHART_LAYERS,
  IMPORTANT_RULES,
  NEXT_RECOMMENDED_STEP,
  type BuildPhaseStatus,
  type LayerStatus,
} from "@/lib/build-flow/buildPhases";

function phaseStatusBadgeClass(status: BuildPhaseStatus) {
  if (status === "Done" || status === "Done / Hotfixed") {
    return "badge badgeGreen";
  }
  if (status === "Foundation" || status === "In progress") {
    return "badge badgeYellow";
  }
  return "badge badgeRed";
}

function layerStatusBadgeClass(status: LayerStatus) {
  if (status === "Done" || status === "Done / Hotfixed") {
    return "badge badgeGreen";
  }
  if (status === "Ready") {
    return "badge badgeBlue";
  }
  return "badge badgeRed";
}

function LayerConnector({ note }: { note: string }) {
  return (
    <div className="flowchartLayerConnector" aria-hidden="true">
      <span className="flowchartConnectorLine" />
      <span className="flowchartConnectorArrow">↓</span>
      {note ? <p className="flowchartConnectorNote">{note}</p> : null}
      <span className="flowchartConnectorLine" />
    </div>
  );
}

function FlowchartLayerSection({
  layer,
  showConnector,
}: {
  layer: (typeof FLOWCHART_LAYERS)[number];
  showConnector: boolean;
}) {
  return (
    <>
      <section className="flowchartLayer panel" aria-labelledby={`layer-${layer.id}`}>
        <div className="flowchartLayerHeader">
          <div>
            <p className="flowchartLayerNumber">Layer {layer.layerNumber}</p>
            <h3 className="cardTitle" id={`layer-${layer.id}`}>
              {layer.title}
            </h3>
            <p className="cardMeta">{layer.subtitle}</p>
          </div>
          <span className={layerStatusBadgeClass(layer.layerStatus)}>{layer.layerStatus}</span>
        </div>
        <div className="flowchartNodeGrid">
          {layer.nodes.map((node) => (
            <article key={node.id} className="flowchartNodeCard">
              <div className="flowchartNodeCardHeader">
                <h4 className="flowchartNodeTitle">{node.label}</h4>
                <span className={layerStatusBadgeClass(node.status)}>{node.status}</span>
              </div>
              {node.description ? (
                <p className="flowchartNodeDescription">{node.description}</p>
              ) : null}
            </article>
          ))}
        </div>
      </section>
      {showConnector && layer.connectorNote ? <LayerConnector note={layer.connectorNote} /> : null}
    </>
  );
}

export default function FlowchartPage() {
  return (
    <section className="pageSection">
      <BackLink href="/settings" label="Back to Settings" />
      <div>
        <h2 className="sectionHeading">Operating Co App Flowchart</h2>
        <p className="sectionSubheading">
          v1.5-aligned model map: company inputs → reference data → industry benchmark → future
          engines → outputs. Pedagogical overview aligned with Master Specification v1.5.
        </p>
        <p className="cardMeta" role="note">
          This page is documentation/navigation only and does not drive valuation logic.
        </p>
      </div>

      <div className="panel flowchartCallout">
        <p className="cardMeta">
          <strong>Data flow today:</strong> Completed Data Hub modules (Riskfree, FX, Country
          ERP, Damodaran Data, Industry Benchmark Config) hold reference data and configuration.
          Beta, WACC, Forecast &amp; Fade, and Reinvestment / FCFF foundations calculate preliminary
          engine outputs or structure/readiness when inputs are available. Reinvestment / FCFF
          calculates NOPAT, reinvestment and FCFF only — not connected to terminal value, DCF/PV,
          firm-to-equity bridge, intrinsic value, or Dashboard decision logic. Terminal Value
          foundation calculates terminal FCFF and Gordon terminal value only (not discounted) — not
          connected to bridge, intrinsic value, or Dashboard decision logic. DCF/PV foundation
          calculates PV of forecast FCFF and PV of terminal value only — not connected to bridge,
          intrinsic value, or Dashboard decision logic.
        </p>
      </div>

      <div className="panel">
        <h3 className="cardTitle">Current Build Status</h3>
        <p className="cardMeta">Compact phase checklist — same data as Settings Flowchart source.</p>
        <ul className="flowchartStatusList">
          {CURRENT_BUILD_PHASES.map((phase) => (
            <li key={phase.id} className="flowchartStatusRow">
              <span>{phase.label}</span>
              <span className={phaseStatusBadgeClass(phase.status)}>{phase.status}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="panel">
        <h3 className="cardTitle">v1.5 Architecture Model Map</h3>
        <p className="cardMeta">
          Layers follow the benchmark-first chain: Company → Data Hub reference → Industry
          Benchmark context → Valuation engines (planned) → Presentation outputs.
        </p>
        <div className="flowchartLayerMap">
          {FLOWCHART_LAYERS.map((layer, index) => (
            <FlowchartLayerSection
              key={layer.id}
              layer={layer}
              showConnector={index < FLOWCHART_LAYERS.length - 1}
            />
          ))}
        </div>
      </div>

      <div className="panel">
        <h3 className="cardTitle">Important Rules (v1.5)</h3>
        <ul className="flowchartRulesList">
          {IMPORTANT_RULES.map((rule) => (
            <li key={rule} className="cardMeta">
              {rule}
            </li>
          ))}
        </ul>
      </div>

      <div className="panel">
        <h3 className="cardTitle">Next Recommended Step</h3>
        <p className="cardMeta">
          <strong>{NEXT_RECOMMENDED_STEP.title}</strong> — {NEXT_RECOMMENDED_STEP.status}
        </p>
        <p className="cardMeta">{NEXT_RECOMMENDED_STEP.description}</p>
      </div>

      <p className="cardMeta">
        Source alignment: Operating Co Template Master Specification v1.5 (benchmark-first
        industry flow, Data Hub modules, engine chain). Damodaran Source Pack and Raw Tables
        Appendix inform Damodaran Data layer only.
      </p>
    </section>
  );
}
