import { FoundationSourceNotes } from "@/components/foundation-source-notes";
import { FoundationStatusBadge } from "@/components/foundation-status-badge";
import type {
  TerminalValueInput,
  TerminalValueResult,
  TerminalValueMethod,
} from "@/lib/types/terminal-value-engine";
import { formatAmountMillions, formatPercent } from "@/lib/utils/formatters";

function formatAmount(value: number | null) {
  if (value === null || !Number.isFinite(value)) return "not provided";
  return formatAmountMillions(value, { decimals: 2 });
}

function formatRate(value: number | null) {
  if (value === null || !Number.isFinite(value)) return "not provided";
  return formatPercent(value, { decimals: 2 });
}

function formatMethod(value: TerminalValueMethod | null) {
  return value ?? "not provided";
}

function dedupeNotes(notesA: string[], notesB: string[]) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const note of [...notesA, ...notesB]) {
    if (seen.has(note)) continue;
    seen.add(note);
    out.push(note);
  }
  return out;
}

interface TerminalValueFoundationCardProps {
  input: TerminalValueInput;
  result: TerminalValueResult;
  displayStatus?: string;
}

export function TerminalValueFoundationCard({
  input,
  result,
  displayStatus,
}: TerminalValueFoundationCardProps) {
  const statusLabel = displayStatus ?? result.status;
  const requestedMethod = input.terminalMethod;
  const isRequestedNotImplemented =
    requestedMethod !== null && requestedMethod !== "Gordon Growth";

  const uniqueNotes = dedupeNotes(result.notes, input.sourceNotes);

  return (
    <article className="card">
      <h3 className="cardTitle">Terminal Value Foundation</h3>
      <p className="cardMeta">
        Terminal Value Foundation calculates terminal FCFF and Gordon terminal value
        only. It does not calculate DCF/PV, firm-to-equity bridge, intrinsic value or
        dashboard decisions.
      </p>
      <p className="cardMeta">
        Terminal FCFF and Gordon terminal value are foundation approximations only — not
        official valuation outputs.
      </p>
      <p className="cardMeta">
        Stable reinvestment and stable ROC terminal discipline are not fully implemented in
        this phase.
      </p>

      {isRequestedNotImplemented ? (
        <div className="betaReferenceAlerts" role="status">
          <p className="cardMeta">
            Review / Not Implemented: Requested terminal method is{" "}
            <strong>{requestedMethod}</strong>. Exit Multiple / Hybrid are not implemented in
            this phase; Gordon Growth is the only implemented foundation method.
          </p>
        </div>
      ) : null}

      <dl className="betaReferenceSummary">
        <div>
          <dt>Status</dt>
          <dd>
            <FoundationStatusBadge displayStatus={statusLabel} />
          </dd>
        </div>
        <div>
          <dt>Selected Damodaran Industrial Benchmark</dt>
          <dd>{input.selectedBenchmark || "not provided"}</dd>
        </div>
        <div>
          <dt>Final forecast year</dt>
          <dd>{input.finalForecastYear || "not provided"}</dd>
        </div>
        <div>
          <dt>Final forecast FCFF (m)</dt>
          <dd>{formatAmount(input.finalForecastFcff)}</dd>
        </div>
        <div>
          <dt>Stable Growth Rate</dt>
          <dd>{formatRate(input.stableGrowthRate)}</dd>
        </div>
        <div>
          <dt>Stable WACC</dt>
          <dd>{formatRate(input.stableWacc)}</dd>
        </div>
        <div>
          <dt>Terminal spread (WACC - Growth)</dt>
          <dd>{formatRate(result.terminalSpread)}</dd>
        </div>
        <div>
          <dt>Terminal FCFF (m)</dt>
          <dd>{formatAmount(result.terminalFcff)}</dd>
        </div>
        <div>
          <dt>Terminal method requested</dt>
          <dd>{formatMethod(input.terminalMethod)}</dd>
        </div>
        <div>
          <dt>Terminal method used</dt>
          <dd>{formatMethod(result.terminalMethodUsed)}</dd>
        </div>
        <div>
          <dt>
            Gordon Terminal Value
            {isRequestedNotImplemented && result.terminalValue !== null ? (
              <span className="cardMeta" style={{ marginLeft: "0.5rem" }}>
                Gordon foundation output for review only
              </span>
            ) : null}
          </dt>
          <dd>{formatAmount(result.terminalValue)}</dd>
        </div>
      </dl>

      {result.missingInputs.length > 0 ? (
        <div className="betaReferenceAlerts" role="status">
          <p className="cardMeta">Missing inputs: {result.missingInputs.join(", ")}</p>
        </div>
      ) : null}

      {result.warnings.length > 0 ? (
        <div className="betaReferenceAlerts" role="status">
          {result.warnings.map((warning, idx) => (
            <p key={`warn-${idx}-${warning.slice(0, 40)}`} className="cardMeta">
              {warning}
            </p>
          ))}
        </div>
      ) : null}

      <FoundationSourceNotes notes={uniqueNotes} />
    </article>
  );
}

