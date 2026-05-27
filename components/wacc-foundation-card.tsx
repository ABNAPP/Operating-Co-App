import { FoundationSourceNotes } from "@/components/foundation-source-notes";
import { FoundationStatusBadge } from "@/components/foundation-status-badge";
import type { WaccInput, WaccReadinessStatus, WaccResult } from "@/lib/types/wacc-engine";
import { formatNumber, formatPercent } from "@/lib/utils/formatters";

function formatBeta(value: number | null) {
  return value === null ? "—" : formatNumber(value, { decimals: 2 });
}

function formatRate(value: number | null) {
  if (value === null || !Number.isFinite(value)) {
    return "not provided";
  }
  return formatPercent(value, { forceDecimal: true });
}

function formatDebtToEquityRatio(value: number | null) {
  if (value === null || !Number.isFinite(value)) {
    return "not provided";
  }
  return `${formatNumber(value, { decimals: 2 })}x (D/E ratio)`;
}

function formatWeight(value: number | null) {
  if (value === null || !Number.isFinite(value)) {
    return "not provided";
  }
  return formatPercent(value, { forceDecimal: true });
}

interface WaccFoundationCardProps {
  input: WaccInput;
  readiness: WaccReadinessStatus;
  result: WaccResult;
  displayStatus?: string;
  showMockScaffoldNote?: boolean;
}

export function WaccFoundationCard({
  input,
  readiness,
  result,
  displayStatus,
  showMockScaffoldNote,
}: WaccFoundationCardProps) {
  const statusLabel = displayStatus ?? result.status;
  const capitalStructureLabel =
    input.selectedDebtToEquity !== null
      ? formatDebtToEquityRatio(input.selectedDebtToEquity)
      : input.selectedDebtWeight !== null && input.selectedEquityWeight !== null
        ? `Weights — Debt: ${formatWeight(input.selectedDebtWeight)}, Equity: ${formatWeight(input.selectedEquityWeight)}`
        : "not provided";

  const waccSourceNotes = [
    ...Object.entries(result.sourceSummary).map(([key, value]) => `${key}: ${value}`),
    ...result.notes,
    ...input.notes,
  ];

  return (
    <article className="card">
      <h3 className="cardTitle">WACC Foundation</h3>
      <p className="cardMeta">
        WACC Foundation is not connected to FCFF, terminal value, intrinsic value or Dashboard
        decision logic.
      </p>
      {showMockScaffoldNote ? (
        <p className="cardMeta">Mock / foundation scaffold inputs — not live company data.</p>
      ) : null}

      <dl className="betaReferenceSummary">
        <div>
          <dt>Status</dt>
          <dd>
            <FoundationStatusBadge displayStatus={statusLabel} />
          </dd>
        </div>
        <div>
          <dt>Selected Beta</dt>
          <dd>{formatBeta(input.selectedBeta)}</dd>
        </div>
        <div>
          <dt>Selected Beta Source</dt>
          <dd>{input.selectedBetaSource ?? "—"}</dd>
        </div>
        <div>
          <dt>Riskfree Rate ({input.valuationCurrency})</dt>
          <dd>{formatRate(input.riskfreeRate)}</dd>
        </div>
        <div>
          <dt>Riskfree Source</dt>
          <dd>{input.riskfreeSource ?? "—"}</dd>
        </div>
        <div>
          <dt>Equity Risk Premium (ERP)</dt>
          <dd>{formatRate(input.equityRiskPremium)}</dd>
        </div>
        <div>
          <dt>ERP Source</dt>
          <dd>{input.equityRiskPremiumSource ?? "—"}</dd>
        </div>
        {input.countryRiskPremium !== null ? (
          <div>
            <dt>Country Risk Premium</dt>
            <dd>{formatRate(input.countryRiskPremium)}</dd>
          </div>
        ) : null}
        <div>
          <dt>Cost of Equity</dt>
          <dd>{formatRate(result.costOfEquity)}</dd>
        </div>
        <div>
          <dt>Debt/Equity or weights</dt>
          <dd>{capitalStructureLabel}</dd>
        </div>
        {result.debtWeight !== null && result.equityWeight !== null ? (
          <>
            <div>
              <dt>Debt weight</dt>
              <dd>{formatWeight(result.debtWeight)}</dd>
            </div>
            <div>
              <dt>Equity weight</dt>
              <dd>{formatWeight(result.equityWeight)}</dd>
            </div>
          </>
        ) : null}
        <div>
          <dt>Pre-tax Cost of Debt</dt>
          <dd>{formatRate(input.preTaxCostOfDebt)}</dd>
        </div>
        <div>
          <dt>Cost of Debt Source</dt>
          <dd>{input.costOfDebtSource ?? "—"}</dd>
        </div>
        <div>
          <dt>After-tax Cost of Debt</dt>
          <dd>{formatRate(result.afterTaxCostOfDebt)}</dd>
        </div>
        <div>
          <dt>Tax Rate</dt>
          <dd>{formatRate(input.selectedTaxRate)}</dd>
        </div>
        <div>
          <dt>Tax Rate Source</dt>
          <dd>{input.taxRateSource ?? "—"}</dd>
        </div>
        <div>
          <dt>WACC</dt>
          <dd>{formatRate(result.wacc)}</dd>
        </div>
      </dl>

      {readiness.missingInputs.length > 0 ? (
        <div className="betaReferenceAlerts" role="status">
          <p className="cardMeta">
            Missing inputs: {readiness.missingInputs.join(", ")}
          </p>
        </div>
      ) : null}

      {result.warnings.length > 0 ? (
        <div className="betaReferenceAlerts" role="status">
          {result.warnings.map((warning) => (
            <p key={warning} className="cardMeta">
              {warning}
            </p>
          ))}
        </div>
      ) : null}

      {result.errors.length > 0 ? (
        <div className="betaReferenceAlerts betaReferenceAlertsError" role="alert">
          {result.errors.map((error) => (
            <p key={error} className="cardMeta">
              {error}
            </p>
          ))}
        </div>
      ) : null}

      <FoundationSourceNotes notes={waccSourceNotes} />
    </article>
  );
}
