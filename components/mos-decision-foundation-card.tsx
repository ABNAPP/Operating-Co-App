import { FoundationSourceNotes } from "@/components/foundation-source-notes";
import { FoundationStatusBadge } from "@/components/foundation-status-badge";
import type { MosDecisionInput, MosDecisionResult } from "@/lib/types/mos-decision-engine";
import { formatPercent, formatPerShare } from "@/lib/utils/formatters";

function formatDecisionOutcome(outcome: MosDecisionResult["decisionOutcome"]) {
  if (!outcome) return "N/A";
  return outcome;
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

interface MosDecisionFoundationCardProps {
  input: MosDecisionInput;
  result: MosDecisionResult;
  displayStatus?: string;
}

export function MosDecisionFoundationCard({
  input,
  result,
  displayStatus,
}: MosDecisionFoundationCardProps) {
  const statusLabel = displayStatus ?? result.status;
  const uniqueNotes = dedupeNotes(result.notes, input.sourceNotes);
  const uniqueWarnings = [...new Set(result.warnings)];

  const valuationCurrency = input.intrinsicValueCurrency;

  return (
    <article className="card">
      <h3 className="cardTitle">MOS / Decision Foundation</h3>
      <p className="cardMeta">
        MOS / Decision Foundation is not an official Dashboard decision.
      </p>
      <p className="cardMeta">No Buy/Sell/Hold logic is implemented in this phase.</p>
      <p className="cardMeta">
        Decision outcome is foundation-only: Above Required MOS / Below Required MOS / N/A.
      </p>
      <p className="cardMeta">Dashboard integration remains not started.</p>

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
          <dt>Intrinsic Value / Share</dt>
          <dd>
            {formatPerShare(input.intrinsicValuePerShare, {
              decimals: 2,
              currency: valuationCurrency ?? undefined,
            })}
          </dd>
        </div>
        <div>
          <dt>Current Share Price</dt>
          <dd>
            {formatPerShare(input.currentSharePrice, {
              decimals: 2,
              currency: input.priceCurrency ?? undefined,
            })}
          </dd>
        </div>
        <div>
          <dt>Upside / Downside %</dt>
          <dd>{formatPercent(result.upsideDownsidePercent, { decimals: 2 })}</dd>
        </div>
        <div>
          <dt>Margin of Safety %</dt>
          <dd>{formatPercent(result.marginOfSafetyPercent, { decimals: 2 })}</dd>
        </div>
        <div>
          <dt>Required MOS %</dt>
          <dd>{formatPercent(input.requiredMOS, { decimals: 2 })}</dd>
        </div>
        <div>
          <dt>Entry Price</dt>
          <dd>
            {formatPerShare(result.entryPrice, {
              decimals: 2,
              currency: valuationCurrency ?? undefined,
            })}
          </dd>
        </div>
        <div>
          <dt>Foundation Decision Outcome</dt>
          <dd>{formatDecisionOutcome(result.decisionOutcome)}</dd>
        </div>
        {input.requiredMOSSource ? (
          <div>
            <dt>Required MOS Source</dt>
            <dd>{input.requiredMOSSource}</dd>
          </div>
        ) : null}
      </dl>

      {result.missingInputs.length > 0 ? (
        <div className="betaReferenceAlerts" role="status">
          <p className="cardMeta">Missing inputs: {result.missingInputs.join(", ")}</p>
        </div>
      ) : null}

      {uniqueWarnings.length > 0 ? (
        <div className="betaReferenceAlerts" role="status">
          {uniqueWarnings.map((warning, idx) => (
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
