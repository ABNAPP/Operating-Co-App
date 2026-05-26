import type {
  ReinvestmentFcffInput,
  ReinvestmentFcffResult,
} from "@/lib/types/reinvestment-fcff-engine";
import { formatAmountMillions, formatNumber, formatPercent } from "@/lib/utils/formatters";

function statusBadgeClass(status: string) {
  if (status === "Ready") {
    return "badge badgeGreen";
  }
  if (status === "Review") {
    return "badge badgeYellow";
  }
  if (status === "Not Applicable") {
    return "badge badgeBlue";
  }
  return "badge badgeRed";
}

function formatAmount(value: number | null) {
  if (value === null || !Number.isFinite(value)) {
    return "not provided";
  }
  return formatAmountMillions(value, { decimals: 2 });
}

function formatRate(value: number | null) {
  if (value === null || !Number.isFinite(value)) {
    return "not provided";
  }
  return formatPercent(value, { forceDecimal: true });
}

function formatMethod(value: ReinvestmentFcffResult["selectedReinvestmentMethod"]) {
  return value ?? "not provided";
}

interface ReinvestmentFcffFoundationCardProps {
  input: ReinvestmentFcffInput;
  result: ReinvestmentFcffResult;
}

export function ReinvestmentFcffFoundationCard({
  input,
  result,
}: ReinvestmentFcffFoundationCardProps) {
  const uniqueWarnings = [...new Set(result.warnings)];
  const uniqueNotes: string[] = [];
  const seenNotes = new Set<string>();
  for (const note of [...result.notes, ...input.sourceNotes]) {
    if (seenNotes.has(note)) continue;
    seenNotes.add(note);
    uniqueNotes.push(note);
  }

  const showSalesToCapital =
    input.salesToCapital !== null ||
    result.methodComparison.salesToCapitalAvailable ||
    result.methodComparison.salesToCapitalReinvestment !== null;

  return (
    <article className="card">
      <h3 className="cardTitle">Reinvestment / FCFF Foundation</h3>
      <p className="cardMeta">
        Reinvestment / FCFF Foundation calculates NOPAT, reinvestment and FCFF only. It does not
        calculate terminal value, DCF/PV, firm-to-equity bridge, intrinsic value or dashboard
        decisions.
      </p>
      <p className="cardMeta">
        Damodaran Industrial Benchmark is the primary anchor for review context — ISM-sector is
        display-only.
      </p>

      <dl className="betaReferenceSummary">
        <div>
          <dt>Status</dt>
          <dd>
            <span className={statusBadgeClass(result.status)}>{result.status}</span>
          </dd>
        </div>
        <div>
          <dt>Selected Damodaran Industrial Benchmark</dt>
          <dd>{input.selectedBenchmark || "not provided"}</dd>
        </div>
        <div>
          <dt>Forecast year</dt>
          <dd>{input.forecastYear || "not provided"}</dd>
        </div>
        <div>
          <dt>Selected reinvestment method</dt>
          <dd>{formatMethod(result.selectedReinvestmentMethod)}</dd>
        </div>
        <div>
          <dt>Revenue (m)</dt>
          <dd>{formatAmount(input.revenue)}</dd>
        </div>
        <div>
          <dt>Prior revenue (m)</dt>
          <dd>{formatAmount(input.priorRevenue)}</dd>
        </div>
        <div>
          <dt>EBIT (m)</dt>
          <dd>{formatAmount(input.ebit)}</dd>
        </div>
        <div>
          <dt>Tax rate</dt>
          <dd>{formatRate(input.taxRate)}</dd>
        </div>
        <div>
          <dt>NOPAT (m)</dt>
          <dd>{formatAmount(result.nopat)}</dd>
        </div>
        <div>
          <dt>CapEx (m)</dt>
          <dd>{formatAmount(input.capex)}</dd>
        </div>
        <div>
          <dt>D&amp;A (m)</dt>
          <dd>{formatAmount(input.depreciationAmortization)}</dd>
        </div>
        <div>
          <dt>Change in Non-Cash Working Capital (m)</dt>
          <dd>{formatAmount(input.changeInNonCashWorkingCapital)}</dd>
        </div>
        {showSalesToCapital ? (
          <>
            <div>
              <dt>Sales-to-Capital</dt>
              <dd>
                {input.salesToCapital !== null
                  ? formatNumber(input.salesToCapital, { decimals: 2 })
                  : "not provided"}
              </dd>
            </div>
            {result.methodComparison.salesToCapitalReinvestment !== null ? (
              <div>
                <dt>Sales-to-Capital reinvestment (m)</dt>
                <dd>{formatAmount(result.methodComparison.salesToCapitalReinvestment)}</dd>
              </div>
            ) : null}
          </>
        ) : null}
        <div>
          <dt>Reinvestment (m)</dt>
          <dd>{formatAmount(result.reinvestment)}</dd>
        </div>
        <div>
          <dt>FCFF (m)</dt>
          <dd>{formatAmount(result.fcff)}</dd>
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
            <p key={`warn-${idx}`} className="cardMeta">
              {warning}
            </p>
          ))}
        </div>
      ) : null}

      {result.methodComparison.comparisonNote ? (
        <p className="cardMeta">{result.methodComparison.comparisonNote}</p>
      ) : null}

      {uniqueNotes.length > 0 ? (
        <details className="betaReferenceDetails">
          <summary>Source notes</summary>
          {uniqueNotes.map((note, idx) => (
            <p key={`note-${idx}-${note.slice(0, 40)}`} className="cardMeta">
              {note}
            </p>
          ))}
        </details>
      ) : null}
    </article>
  );
}
