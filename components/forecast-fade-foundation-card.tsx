import { FoundationSourceNotes } from "@/components/foundation-source-notes";
import type { ForecastFadeInput, ForecastFadeResult } from "@/lib/types/forecast-fade-engine";
import { formatNumber } from "@/lib/utils/formatters";

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

function formatYesNo(value: boolean) {
  return value ? "Yes" : "No";
}

function formatYears(value: number | null) {
  if (value === null || !Number.isFinite(value)) {
    return "not provided";
  }
  return formatNumber(value, { decimals: 0 });
}

function formatStageType(value: ForecastFadeResult["recommendedStageType"]) {
  return value ?? "not provided";
}

interface ForecastFadeFoundationCardProps {
  input: ForecastFadeInput;
  result: ForecastFadeResult;
}

export function ForecastFadeFoundationCard({ input, result }: ForecastFadeFoundationCardProps) {
  const uniqueWarnings = [...new Set(result.warnings)];

  // Notes may be present in both `result.notes` and `input.notes`; de-duplicate so UI doesn't repeat.
  const uniqueNotes: string[] = [];
  const seenNotes = new Set<string>();
  for (const note of [...result.notes, ...input.notes]) {
    if (seenNotes.has(note)) continue;
    seenNotes.add(note);
    uniqueNotes.push(note);
  }

  return (
    <article className="card">
      <h3 className="cardTitle">Forecast &amp; Fade Foundation</h3>
      <p className="cardMeta">
        Forecast &amp; Fade Foundation recommends structure/readiness only. It does not calculate
        revenue, margins, reinvestment, FCFF, terminal value or intrinsic value.
      </p>
      <p className="cardMeta">
        Not connected to Dashboard decision logic. Damodaran Industrial Benchmark is the primary
        anchor — ISM-sector is display-only.
      </p>

      <dl className="betaReferenceSummary">
        <div>
          <dt>Status</dt>
          <dd>
            <span className={statusBadgeClass(result.readinessStatus)}>{result.readinessStatus}</span>
          </dd>
        </div>
        <div>
          <dt>Selected Damodaran Industrial Benchmark</dt>
          <dd>{input.selectedBenchmark || "not provided"}</dd>
        </div>
        <div>
          <dt>Recommended stage type</dt>
          <dd>{formatStageType(result.recommendedStageType)}</dd>
        </div>
        <div>
          <dt>Recommended forecast years</dt>
          <dd>{formatYears(result.recommendedForecastYears)}</dd>
        </div>
        <div>
          <dt>Recommended history years</dt>
          <dd>{formatYears(result.recommendedHistoryYears)}</dd>
        </div>
        <div>
          <dt>Fade required</dt>
          <dd>
            {result.fadeRequired === null ? "not provided" : formatYesNo(result.fadeRequired)}
          </dd>
        </div>
        {result.fadeStartYear !== null ? (
          <div>
            <dt>Fade start year</dt>
            <dd>{formatYears(result.fadeStartYear)}</dd>
          </div>
        ) : null}
        {result.fadeToStableYear !== null ? (
          <div>
            <dt>Fade-to-stable year</dt>
            <dd>{formatYears(result.fadeToStableYear)}</dd>
          </div>
        ) : null}
        <div>
          <dt>Cyclicality review required</dt>
          <dd>{formatYesNo(result.cyclicalityReviewRequired)}</dd>
        </div>
        <div>
          <dt>Benchmark review required</dt>
          <dd>{formatYesNo(result.benchmarkReviewRequired)}</dd>
        </div>
        {input.defaultStageRecommendation ? (
          <div>
            <dt>Industry Benchmark Config — default stage</dt>
            <dd>{input.defaultStageRecommendation}</dd>
          </div>
        ) : null}
        {input.historyRecommendation ? (
          <div>
            <dt>Industry Benchmark Config — history</dt>
            <dd>{input.historyRecommendation}</dd>
          </div>
        ) : null}
        {input.cyclicalityFlag ? (
          <div>
            <dt>Cyclicality flag</dt>
            <dd>{input.cyclicalityFlag}</dd>
          </div>
        ) : null}
        {input.assetIntensity ? (
          <div>
            <dt>Asset intensity</dt>
            <dd>{input.assetIntensity}</dd>
          </div>
        ) : null}
      </dl>

      {result.missingInputs.length > 0 ? (
        <div className="betaReferenceAlerts" role="status">
          <p className="cardMeta">Missing inputs: {result.missingInputs.join(", ")}</p>
        </div>
      ) : null}

      {result.warnings.length > 0 ? (
        <div className="betaReferenceAlerts" role="status">
          {uniqueWarnings.map((warning, idx) => (
            <p key={`warn-${idx}`} className="cardMeta">
              {warning}
            </p>
          ))}
        </div>
      ) : null}

      <FoundationSourceNotes notes={uniqueNotes} />
    </article>
  );
}
