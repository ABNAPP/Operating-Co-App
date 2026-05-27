import { FoundationSourceNotes } from "@/components/foundation-source-notes";
import { FoundationStatusBadge } from "@/components/foundation-status-badge";
import type {
  DcfPvInput,
  DcfPvForecastPeriod,
  DcfPvResult,
} from "@/lib/types/dcf-pv-engine";
import { formatAmountMillions, formatNumber, formatPercent } from "@/lib/utils/formatters";

function formatAmount(value: number | null) {
  if (value === null || !Number.isFinite(value)) return "N/A";
  return formatAmountMillions(value, { decimals: 2 });
}

function formatRate(value: number | null) {
  if (value === null || !Number.isFinite(value)) return "N/A";
  // Inputs are decimals internally, display as percent.
  return formatPercent(value, { decimals: 2, forceDecimal: true });
}

function formatDiscountFactor(value: number | null) {
  if (value === null || !Number.isFinite(value)) return "N/A";
  return formatNumber(value, { decimals: 2 });
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

interface DcfPvFoundationCardProps {
  input: DcfPvInput;
  result: DcfPvResult;
  displayStatus?: string;
}

function pickForecastPeriod(periods: DcfPvForecastPeriod[]) {
  return periods[0] ?? null;
}

export function DcfPvFoundationCard({ input, result, displayStatus }: DcfPvFoundationCardProps) {
  const statusLabel = displayStatus ?? result.status;
  const forecastPeriod = pickForecastPeriod(result.forecastPeriods);
  const uniqueNotes = dedupeNotes(result.notes, input.sourceNotes);
  const uniqueWarnings = [...new Set(result.warnings)];

  const disclaimer =
    "DCF / PV Foundation calculates PV of forecast FCFF, PV of terminal value and Value of Operating Assets only. It does not calculate firm-to-equity bridge, equity value, intrinsic value per share or dashboard decisions.";

  return (
    <article className="card">
      <h3 className="cardTitle">DCF / PV Foundation</h3>
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
          <dt>WACC used</dt>
          <dd>{formatRate(input.wacc)}</dd>
        </div>

        {forecastPeriod ? (
          <>
            <div>
              <dt>
                Forecast year / year number
              </dt>
              <dd>
                {forecastPeriod.forecastYear || "not provided"} / {forecastPeriod.yearNumber}
              </dd>
            </div>
            <div>
              <dt>Forecast FCFF (m)</dt>
              <dd>{formatAmount(forecastPeriod.fcff)}</dd>
            </div>
            <div>
              <dt>Discount factor</dt>
              <dd>{formatDiscountFactor(forecastPeriod.discountFactor)}</dd>
            </div>
            <div>
              <dt>PV of Forecast FCFF (m)</dt>
              <dd>{formatAmount(forecastPeriod.pvFcff)}</dd>
            </div>
          </>
        ) : null}

        <div>
          <dt>Terminal year number</dt>
          <dd>{input.terminalYearNumber}</dd>
        </div>
        <div>
          <dt>Terminal Value</dt>
          <dd>{formatAmount(input.terminalValue)}</dd>
        </div>
        <div>
          <dt>PV of Terminal Value (m)</dt>
          <dd>{formatAmount(result.pvTerminalValue)}</dd>
        </div>

        <div>
          <dt>Value of Operating Assets (m)</dt>
          <dd>{formatAmount(result.valueOfOperatingAssets)}</dd>
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

