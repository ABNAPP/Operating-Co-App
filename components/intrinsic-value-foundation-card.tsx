import { FoundationSourceNotes } from "@/components/foundation-source-notes";
import { FoundationStatusBadge } from "@/components/foundation-status-badge";
import type { IntrinsicValueInput, IntrinsicValueResult } from "@/lib/types/intrinsic-value-engine";
import { formatAmountMillions, formatNumber, formatPerShare } from "@/lib/utils/formatters";

function formatEquityValue(value: number | null) {
  if (value === null || !Number.isFinite(value)) return "N/A";
  return formatAmountMillions(value, { decimals: 2 });
}

function formatShares(value: number | null, shareUnit: string | null) {
  if (value === null || !Number.isFinite(value)) return "N/A";
  const formatted = formatNumber(value, { decimals: 2 });
  if (!shareUnit) return formatted;
  return `${formatted} (${shareUnit})`;
}

function formatShareUnit(shareUnit: string | null) {
  if (!shareUnit) return "not provided";
  return shareUnit;
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

interface IntrinsicValueFoundationCardProps {
  input: IntrinsicValueInput;
  result: IntrinsicValueResult;
  displayStatus?: string;
}

export function IntrinsicValueFoundationCard({
  input,
  result,
  displayStatus,
}: IntrinsicValueFoundationCardProps) {
  const statusLabel = displayStatus ?? result.status;
  const uniqueNotes = dedupeNotes(result.notes, input.sourceNotes);
  const uniqueWarnings = [...new Set(result.warnings)];

  const disclaimer =
    "Intrinsic Value / Share Foundation calculates intrinsic value per share only. It does not calculate MOS, entry price, buy/sell/hold decisions or dashboard decisions.";

  const valuationCurrency = result.valuationCurrency ?? input.equityValueCurrency;

  return (
    <article className="card">
      <h3 className="cardTitle">Intrinsic Value / Share Foundation</h3>
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
          <dt>Equity Value (m)</dt>
          <dd>{formatEquityValue(input.equityValue)}</dd>
        </div>
        <div>
          <dt>Selected Diluted Shares</dt>
          <dd>{formatShares(result.selectedDilutedShares, result.shareUnit)}</dd>
        </div>
        <div>
          <dt>Share Unit</dt>
          <dd>{formatShareUnit(result.shareUnit)}</dd>
        </div>
        <div>
          <dt>Selected Shares Source</dt>
          <dd>{result.selectedSharesSource ?? input.selectedSharesSource ?? "not provided"}</dd>
        </div>
        <div>
          <dt>Valuation Currency</dt>
          <dd>{valuationCurrency ?? "not provided"}</dd>
        </div>
        <div>
          <dt>Intrinsic Value / Share</dt>
          <dd>
            {formatPerShare(result.intrinsicValuePerShare, {
              decimals: 2,
              currency: valuationCurrency ?? undefined,
            })}
          </dd>
        </div>
        <div>
          <dt>Current Share Price (display-only)</dt>
          <dd>
            {formatPerShare(input.currentSharePrice, {
              decimals: 2,
              currency: input.priceCurrency ?? undefined,
            })}
          </dd>
        </div>
        <div>
          <dt>Price Currency</dt>
          <dd>{input.priceCurrency ?? "not provided"}</dd>
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
