import type { BetaLookupResult, BetaReadinessStatus } from "@/lib/types/beta-engine";
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

function formatBetaValue(value: number | null) {
  if (value === null) {
    return "—";
  }
  return formatNumber(value, { decimals: 2 });
}

function formatBetaTableKeyDisplay(lookup: BetaLookupResult) {
  if (!lookup.betaTableKey) {
    return "—";
  }
  if (lookup.betaTableKeyMode === "benchmark-default") {
    return `Auto default = ${lookup.betaTableKey}`;
  }
  return lookup.betaTableKey;
}

interface BetaReferenceCardProps {
  selectedBenchmark: string;
  lookup: BetaLookupResult;
  readiness: BetaReadinessStatus;
}

export function BetaReferenceCard({ selectedBenchmark, lookup, readiness }: BetaReferenceCardProps) {
  const ref = lookup.betaReference;
  const technicalNotes = [
    ref?.technicalNotes,
    ref?.notes,
    lookup.datasetId ? `Dataset row id: ${ref?.rawDatasetRowId ?? "—"}` : null,
    ref?.importedLastUpdated ? `Imported: ${ref.importedLastUpdated}` : null,
    ref?.sourceName ? `Source: ${ref.sourceName}` : null,
  ]
    .filter(Boolean)
    .join(" ");

  const readinessDetailNotes = readiness.notes.filter(
    (note) => !lookup.warnings.includes(note) && !lookup.errors.includes(note),
  );

  return (
    <article className="card">
      <h3 className="cardTitle">Beta Reference / Beta Readiness</h3>
      <p className="cardMeta">
        Read-only Damodaran beta support. WACC / Cost of Equity is not calculated in this phase.
      </p>

      <dl className="betaReferenceSummary">
        <div>
          <dt>Benchmark</dt>
          <dd>{selectedBenchmark || "—"}</dd>
        </div>
        <div>
          <dt>Beta Table Key</dt>
          <dd>{formatBetaTableKeyDisplay(lookup)}</dd>
        </div>
        <div>
          <dt>Dataset</dt>
          <dd>{lookup.datasetId ?? "damodaran_beta_global"}</dd>
        </div>
        <div>
          <dt>Match</dt>
          <dd>
            {lookup.matchType}
            {lookup.matched ? "" : " (no row)"}
          </dd>
        </div>
        <div>
          <dt>Readiness</dt>
          <dd>
            <span className={statusBadgeClass(readiness.status)}>{readiness.status}</span>
          </dd>
        </div>
        <div>
          <dt>Unlevered Beta</dt>
          <dd>{ref ? formatBetaValue(ref.unleveredBeta) : "—"}</dd>
        </div>
        {ref?.leveredBeta !== null && ref?.leveredBeta !== undefined ? (
          <div>
            <dt>Levered Beta</dt>
            <dd>{formatBetaValue(ref.leveredBeta)}</dd>
          </div>
        ) : null}
        {ref?.cashAdjustedBeta !== null && ref?.cashAdjustedBeta !== undefined ? (
          <div>
            <dt>Cash-adjusted Beta</dt>
            <dd>{formatBetaValue(ref.cashAdjustedBeta)}</dd>
          </div>
        ) : null}
        {ref?.numberOfFirms !== null && ref?.numberOfFirms !== undefined ? (
          <div>
            <dt>Number of firms</dt>
            <dd>{formatNumber(ref.numberOfFirms, { decimals: 0, useGrouping: true })}</dd>
          </div>
        ) : null}
        <div>
          <dt>Source update</dt>
          <dd>{ref?.sourceUpdateDate || "—"}</dd>
        </div>
      </dl>

      {!ref && lookup.matchType === "Missing" ? (
        <p className="cardMeta">No beta reference row found for this benchmark.</p>
      ) : null}

      {lookup.warnings.length > 0 ? (
        <div className="betaReferenceAlerts" role="status">
          {lookup.warnings.map((warning) => (
            <p key={warning} className="cardMeta">
              {warning}
            </p>
          ))}
        </div>
      ) : null}

      {lookup.errors.length > 0 ? (
        <div className="betaReferenceAlerts betaReferenceAlertsError" role="alert">
          {lookup.errors.map((error) => (
            <p key={error} className="cardMeta">
              {error}
            </p>
          ))}
        </div>
      ) : null}

      {technicalNotes || readinessDetailNotes.length > 0 ? (
        <details className="betaReferenceDetails">
          <summary>Technical notes</summary>
          {ref?.notes ? <p className="cardMeta">{ref.notes}</p> : null}
          {technicalNotes ? <p className="cardMeta">{technicalNotes}</p> : null}
          {readinessDetailNotes.length > 0 ? (
            <ul className="flowchartRulesList">
              {readinessDetailNotes.map((note) => (
                <li key={note} className="cardMeta">
                  {note}
                </li>
              ))}
            </ul>
          ) : null}
        </details>
      ) : null}
    </article>
  );
}
