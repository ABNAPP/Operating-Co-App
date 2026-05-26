import type { BetaPolicyResult } from "@/lib/types/beta-engine";
import { formatNumber, formatPercent } from "@/lib/utils/formatters";

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

function formatBeta(value: number | null) {
  return value === null ? "—" : formatNumber(value, { decimals: 2 });
}

function formatDebtToEquityRatio(value: number | null) {
  if (value === null || !Number.isFinite(value)) {
    return "not provided";
  }
  return `${formatNumber(value, { decimals: 2 })}x (D/E ratio, provided)`;
}

function formatTaxRate(value: number | null) {
  if (value === null || !Number.isFinite(value)) {
    return "not provided";
  }
  return formatPercent(value, { forceDecimal: true });
}

interface BetaPolicyCardProps {
  policy: BetaPolicyResult;
  showMockCapitalNote?: boolean;
}

export function BetaPolicyCard({ policy, showMockCapitalNote }: BetaPolicyCardProps) {
  const debtMissing =
    policy.selectedDebtToEquity === null || !Number.isFinite(policy.selectedDebtToEquity);
  const taxMissing =
    policy.selectedTaxRate === null || !Number.isFinite(policy.selectedTaxRate);
  const leveredReferenceShown = policy.selectedLeveredBeta !== null;

  const compactReviewWarning =
    (policy.status === "Review" || policy.status === "Missing") && leveredReferenceShown
      ? debtMissing
        ? "Selected beta not final — Debt/Equity input is missing. Industry levered beta reference is shown for review only."
        : taxMissing
          ? "Selected beta not final — Tax rate input is missing. Industry levered beta reference is shown for review only."
          : "Selected beta not final — company capital structure and tax inputs required for final review."
      : null;

  return (
    <article className="card">
      <h3 className="cardTitle">Beta Policy / Selected Beta</h3>
      <p className="cardMeta">
        Beta-only relevering for future WACC. Does not calculate Cost of Equity or WACC.
      </p>
      {showMockCapitalNote ? (
        <p className="cardMeta">Mock capital-structure inputs (company beta policy scaffold).</p>
      ) : null}

      <dl className="betaReferenceSummary">
        <div>
          <dt>Unlevered Beta (reference)</dt>
          <dd>{formatBeta(policy.selectedUnleveredBeta)}</dd>
        </div>
        <div>
          <dt>Debt/Equity (D/E ratio)</dt>
          <dd>{formatDebtToEquityRatio(policy.selectedDebtToEquity)}</dd>
        </div>
        <div>
          <dt>Tax rate</dt>
          <dd>{formatTaxRate(policy.selectedTaxRate)}</dd>
        </div>
        <div>
          <dt>Relevered Beta</dt>
          <dd>{formatBeta(policy.selectedLeveredBeta)}</dd>
        </div>
        <div>
          <dt>Selected Beta</dt>
          <dd>{formatBeta(policy.selectedBeta)}</dd>
        </div>
        <div>
          <dt>Selected Beta Source</dt>
          <dd>{policy.selectedBetaSource}</dd>
        </div>
        <div>
          <dt>Policy status</dt>
          <dd>
            <span className={statusBadgeClass(policy.status)}>{policy.status}</span>
          </dd>
        </div>
      </dl>

      {compactReviewWarning ? (
        <p className="cardMeta betaReferenceAlerts" style={{ marginTop: "0.65rem" }}>
          {compactReviewWarning}
        </p>
      ) : null}

      {policy.warnings.length > 0 && !compactReviewWarning ? (
        <div className="betaReferenceAlerts" role="status">
          {policy.warnings.map((warning) => (
            <p key={warning} className="cardMeta">
              {warning}
            </p>
          ))}
        </div>
      ) : null}

      {policy.errors.length > 0 ? (
        <div className="betaReferenceAlerts betaReferenceAlertsError" role="alert">
          {policy.errors.map((error) => (
            <p key={error} className="cardMeta">
              {error}
            </p>
          ))}
        </div>
      ) : null}

      {policy.releveringFormulaUsed || policy.notes.length > 0 ? (
        <details className="betaReferenceDetails">
          <summary>Technical notes</summary>
          {policy.releveringFormulaUsed ? (
            <p className="cardMeta">Formula: {policy.releveringFormulaUsed}</p>
          ) : null}
          {policy.notes.map((note) => (
            <p key={note} className="cardMeta">
              {note}
            </p>
          ))}
        </details>
      ) : null}
    </article>
  );
}
