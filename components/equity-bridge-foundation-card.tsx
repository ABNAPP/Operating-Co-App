import { FoundationSourceNotes } from "@/components/foundation-source-notes";
import { FoundationStatusBadge } from "@/components/foundation-status-badge";
import type { EquityBridgeInput, EquityBridgeResult } from "@/lib/types/equity-bridge-engine";
import { formatAmountMillions } from "@/lib/utils/formatters";

function formatAmount(value: number | null) {
  if (value === null || !Number.isFinite(value)) return "N/A";
  return formatAmountMillions(value, { decimals: 2 });
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

interface EquityBridgeFoundationCardProps {
  input: EquityBridgeInput;
  result: EquityBridgeResult;
  displayStatus?: string;
}

export function EquityBridgeFoundationCard({
  input,
  result,
  displayStatus,
}: EquityBridgeFoundationCardProps) {
  const statusLabel = displayStatus ?? result.status;
  const uniqueNotes = dedupeNotes(result.notes, input.sourceNotes);
  const uniqueWarnings = [...new Set(result.warnings)];

  const disclaimer =
    "Firm-to-Equity Bridge Foundation calculates Equity Value only. It does not calculate intrinsic value per share, MOS, entry price or dashboard decisions.";

  return (
    <article className="card">
      <h3 className="cardTitle">Firm-to-Equity Bridge Foundation</h3>
      <p className="cardMeta">{disclaimer}</p>

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
          <dt>Value of Operating Assets (m)</dt>
          <dd>{formatAmount(result.valueOfOperatingAssets)}</dd>
        </div>
        <div>
          <dt>Cash &amp; Cash Equivalents (m)</dt>
          <dd>{formatAmount(input.cashAndCashEquivalents)}</dd>
        </div>
        <div>
          <dt>Non-Operating Assets (m)</dt>
          <dd>{formatAmount(input.nonOperatingAssets)}</dd>
        </div>
        <div>
          <dt>Total Additions (m)</dt>
          <dd>{formatAmount(result.totalAdditions)}</dd>
        </div>
        <div>
          <dt>Total Debt (m)</dt>
          <dd>{formatAmount(input.totalDebt)}</dd>
        </div>
        <div>
          <dt>Preferred Equity (m)</dt>
          <dd>{formatAmount(input.preferredEquity)}</dd>
        </div>
        <div>
          <dt>Minority Interest (m)</dt>
          <dd>{formatAmount(input.minorityInterest)}</dd>
        </div>
        <div>
          <dt>Other Non-Equity Claims (m)</dt>
          <dd>{formatAmount(input.otherNonEquityClaims)}</dd>
        </div>
        <div>
          <dt>Total Deductions (m)</dt>
          <dd>{formatAmount(result.totalDeductions)}</dd>
        </div>
        <div>
          <dt>Equity Value (m)</dt>
          <dd>{formatAmount(result.equityValue)}</dd>
        </div>
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
