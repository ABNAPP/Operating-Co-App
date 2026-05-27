"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { ManualInputsWiringContractPanel } from "@/components/manual-inputs-wiring-contract-panel";
import type { ManualInputsSaveApiResponse } from "@/lib/company-workspace/manualInputsApiTypes";
import type { ManualInputsWorkspaceModel } from "@/lib/company-workspace/manualInputsWorkspaceModel";

type SaveUiState = "idle" | "saving" | "saved" | "error";

interface CompanyManualInputsWorkspaceProps {
  model: ManualInputsWorkspaceModel;
}

async function saveManualInputsDraft(
  draft: ManualInputsWorkspaceModel,
): Promise<ManualInputsSaveApiResponse> {
  const response = await fetch(`/api/companies/${encodeURIComponent(draft.cleanTicker)}/manual-inputs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ draft }),
  });

  const payload = (await response.json()) as ManualInputsSaveApiResponse;
  if (!response.ok && payload.ok !== false) {
    return {
      ok: false,
      errors: [`Save failed (${response.status}).`],
    };
  }
  return payload;
}

function DraftField({
  id,
  label,
  value,
  onChange,
  hint,
  type = "text",
  readOnly = false,
  as = "input",
  options,
}: {
  id: string;
  label: string;
  value: string;
  onChange?: (value: string) => void;
  hint?: string;
  type?: string;
  readOnly?: boolean;
  as?: "input" | "select" | "textarea";
  options?: { value: string; label: string }[];
}) {
  const commonProps = {
    id,
    className: readOnly ? "manualInputControl manualInputControlReadOnly" : "manualInputControl",
    value,
    onChange: onChange
      ? (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
          onChange(e.target.value)
      : undefined,
    readOnly,
    disabled: readOnly,
    "aria-readonly": readOnly,
  };

  return (
    <div className="manualInputField">
      <label className="manualInputLabel" htmlFor={id}>
        {label}
      </label>
      {as === "select" && options ? (
        <select {...commonProps}>
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      ) : as === "textarea" ? (
        <textarea {...commonProps} rows={2} />
      ) : (
        <input {...commonProps} type={type} />
      )}
      {hint ? <p className="manualInputHint">{hint}</p> : null}
    </div>
  );
}

function SectionCard({
  title,
  description,
  children,
  span = "half",
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  span?: "half" | "full";
}) {
  return (
    <article className={span === "full" ? "card manualInputSection manualInputSectionFull" : "card manualInputSection"}>
      <h3 className="cardTitle">{title}</h3>
      {description ? <p className="cardMeta manualInputSectionDesc">{description}</p> : null}
      {children}
    </article>
  );
}

export function CompanyManualInputsWorkspace({ model: initialModel }: CompanyManualInputsWorkspaceProps) {
  const router = useRouter();
  const [draft, setDraft] = useState(initialModel);
  const [dirty, setDirty] = useState(false);
  const [saveState, setSaveState] = useState<SaveUiState>("idle");
  const [saveErrors, setSaveErrors] = useState<string[]>([]);
  const [saveWarnings, setSaveWarnings] = useState<string[]>([]);

  const markDirty = () => {
    if (!dirty) setDirty(true);
    if (saveState !== "idle") setSaveState("idle");
  };

  type DraftSection = Exclude<
    keyof ManualInputsWorkspaceModel,
    "cleanTicker" | "dataSource" | "lastUpdated" | "persistence"
  >;

  const patch = <S extends DraftSection>(
    section: S,
    field: keyof ManualInputsWorkspaceModel[S],
    value: string,
  ) => {
    markDirty();
    setDraft((prev) => {
      const sectionValue = prev[section];
      if (typeof sectionValue !== "object" || sectionValue === null) {
        return prev;
      }
      return {
        ...prev,
        [section]: {
          ...sectionValue,
          [field]: value,
        },
      };
    });
  };

  const handleSave = async () => {
    setSaveState("saving");
    setSaveErrors([]);
    setSaveWarnings([]);

    try {
      const result = await saveManualInputsDraft(draft);

      if (!result.ok) {
        setSaveState("error");
        setSaveErrors(result.errors ?? ["Save failed."]);
        setSaveWarnings(result.warnings ?? []);
        return;
      }

      setSaveState("saved");
      setDirty(false);
      setSaveWarnings(result.warnings ?? []);

      if (result.document) {
        setDraft((prev) => ({
          ...prev,
          persistence: {
            hasPersistedOverrides: true,
            savedAt: result.document?.savedAt ?? null,
            loadSource: "memory",
            wiringStatus: result.document?.wiringStatus ?? "persistence_only",
          },
        }));
      }

      router.refresh();
    } catch (error) {
      setSaveState("error");
      setSaveErrors([
        error instanceof Error ? error.message : "Unknown error while saving manual inputs.",
      ]);
    }
  };

  const statusLine = useMemo(() => {
    const sourceLabel = draft.dataSource === "firestore" ? "Firestore" : "Mock";
    const persisted = draft.persistence;
    const persistedNote = persisted?.hasPersistedOverrides
      ? ` · Persisted overrides loaded (${persisted.loadSource}, saved ${persisted.savedAt ?? "—"}, wiring: ${persisted.wiringStatus})`
      : " · No persisted manual-input overrides";
    return `Base company source: ${sourceLabel} · Company last updated: ${draft.lastUpdated}${persistedNote}`;
  }, [draft.dataSource, draft.lastUpdated, draft.persistence]);

  return (
    <div className="manualInputsWorkspace">
      <div className="panel manualInputBanner">
        <p className="manualInputBannerTitle">Manual Inputs — save enabled</p>
        <p className="cardMeta">
          <strong>
            Current price and Required MOS are now wired to MOS / Decision Foundation only
          </strong>{" "}
          (saved documents: <code>market_overlay_wired</code>). Valuation foundation (Beta → Intrinsic)
          still uses base company data; only the market/MOS overlay recomputes when price or MOS changes.
        </p>
        <p className="cardMeta">
          <strong>All other fields:</strong> saved but not yet connected to valuation engines (WACC,
          FCFF, Terminal, DCF/PV, Bridge, Intrinsic). No Buy/Sell/Hold or official Dashboard decision.
        </p>
        <p className="cardMeta">
          Valuation tab uses base company + cached valuation bundle; benchmark and scaffold edits on
          this tab do not trigger full valuation recompute.
        </p>
        <p className="cardMeta">{statusLine}</p>
        {dirty ? (
          <p className="manualInputDirtyNotice">Unsaved local changes — use Save or refresh to discard.</p>
        ) : saveState === "saved" ? (
          <p className="manualInputSaveSuccess">Saved — inputs persisted (not wired to valuation engines).</p>
        ) : (
          <p className="cardMeta">No unsaved local changes.</p>
        )}
        {saveState === "error" && saveErrors.length > 0 ? (
          <ul className="manualInputSaveError">
            {saveErrors.map((err) => (
              <li key={err}>{err}</li>
            ))}
          </ul>
        ) : null}
        {saveWarnings.length > 0 ? (
          <ul className="cardMeta">
            {saveWarnings.map((warn) => (
              <li key={warn}>{warn}</li>
            ))}
          </ul>
        ) : null}
        <p className="cardMeta manualInputScaffoldNote">
          No Buy/Sell/Hold, gateway, hard gate, or shadow valuation on this tab.
        </p>
      </div>

      <div className="manualInputsGrid">
        <SectionCard
          title="1. Company identity"
          description="Identity scaffold from company record. Edits are local draft only."
        >
          <div className="manualInputFieldGrid">
            <DraftField
              id="identity-companyName"
              label="Company name"
              value={draft.identity.companyName}
              onChange={(v) => patch("identity", "companyName", v)}
            />
            <DraftField
              id="identity-fullTicker"
              label="Full ticker"
              value={draft.identity.fullTicker}
              onChange={(v) => patch("identity", "fullTicker", v)}
            />
            <DraftField
              id="identity-cleanTicker"
              label="Clean ticker"
              value={draft.identity.cleanTicker}
              readOnly
              hint="Read-only key for routing."
            />
            <DraftField
              id="identity-exchange"
              label="Exchange"
              value={draft.identity.exchange}
              onChange={(v) => patch("identity", "exchange", v)}
            />
            <DraftField
              id="identity-countryOfRisk"
              label="Country of risk"
              value={draft.identity.countryOfRisk}
              onChange={(v) => patch("identity", "countryOfRisk", v)}
            />
            <DraftField
              id="identity-websiteUrl"
              label="Website URL"
              value={draft.identity.websiteUrl}
              onChange={(v) => patch("identity", "websiteUrl", v)}
            />
            <DraftField
              id="identity-ismSector"
              label="ISM-sector (company record)"
              value={draft.identity.ismSector}
              readOnly
              hint="Display context on company record — not a primary valuation driver."
            />
            <DraftField
              id="companySetup-valuationDate"
              label="Valuation date (scaffold)"
              value={draft.companySetup.valuationDate}
              onChange={(v) => patch("companySetup", "valuationDate", v)}
            />
          </div>
        </SectionCard>

        <SectionCard
          title="2. Market data / price scaffold"
          description="Price and market cap placeholders. Values shown in millions where noted."
        >
          <div className="manualInputFieldGrid">
            <DraftField
              id="market-currentPrice"
              label="Current share price"
              value={draft.market.currentPrice}
              onChange={(v) => patch("market", "currentPrice", v)}
              hint={`Trading currency: ${draft.currencies.tradingCurrency}. Wired to MOS / Decision Foundation only.`}
            />
            <DraftField
              id="market-marketCap"
              label="Market cap (m)"
              value={draft.market.marketCapMillions}
              onChange={(v) => patch("market", "marketCapMillions", v)}
              hint="Stored mock uses absolute units; displayed here in millions for editing clarity."
            />
            <DraftField
              id="market-manualShares"
              label="Manual share count override"
              value={draft.market.manualShareCountOverride}
              onChange={(v) => patch("market", "manualShareCountOverride", v)}
            />
            <DraftField
              id="market-beta"
              label="Market beta (scaffold)"
              value={draft.market.beta}
              onChange={(v) => patch("market", "beta", v)}
              hint="Distinct from Damodaran beta policy on Valuation tab."
            />
          </div>
        </SectionCard>

        <SectionCard
          title="3. Currency fields"
          description="Reporting / valuation / trading currency scaffold."
        >
          <div className="manualInputFieldGrid">
            <DraftField
              id="currencies-reporting"
              label="Reporting currency"
              value={draft.currencies.reportingCurrency}
              onChange={(v) => patch("currencies", "reportingCurrency", v)}
            />
            <DraftField
              id="currencies-valuation"
              label="Valuation currency"
              value={draft.currencies.valuationCurrency}
              onChange={(v) => patch("currencies", "valuationCurrency", v)}
            />
            <DraftField
              id="currencies-trading"
              label="Trading currency"
              value={draft.currencies.tradingCurrency}
              onChange={(v) => patch("currencies", "tradingCurrency", v)}
            />
            <DraftField
              id="currencies-fxPair"
              label="FX pair to valuation"
              value={draft.currencies.fxPairToValuation}
              onChange={(v) => patch("currencies", "fxPairToValuation", v)}
            />
            <DraftField
              id="currencies-reviewStatus"
              label="Currency review status"
              value={draft.currencies.reviewStatus}
              readOnly
            />
            <DraftField
              id="currencies-note"
              label="Currency note"
              value={draft.currencies.note}
              as="textarea"
              onChange={(v) => patch("currencies", "note", v)}
            />
          </div>
        </SectionCard>

        <SectionCard
          title="4. Industry benchmark selection (display)"
          description="Primary Damodaran Industrial Benchmark — display and local draft preview only. Persistence not wired."
        >
          <div className="manualInputFieldGrid">
            <DraftField
              id="benchmark-selected"
              label="Damodaran Industrial Benchmark (primary)"
              value={draft.benchmark.selected}
              onChange={(v) => patch("benchmark", "selected", v)}
              as="select"
              options={[
                { value: "", label: "Select benchmark (draft)" },
                ...draft.benchmark.universeOptions.map((name) => ({ value: name, label: name })),
              ]}
              hint="Changing this dropdown does not update engines until save/recompute exists."
            />
            <DraftField
              id="benchmark-ism"
              label="ISM-sector (display-only)"
              value={draft.benchmark.ismSectorDisplay}
              readOnly
            />
            <DraftField
              id="benchmark-template"
              label="Template status"
              value={draft.benchmark.templateStatus}
              readOnly
            />
          </div>
        </SectionCard>

        <SectionCard
          title="5. Manual financial input placeholders"
          description="Forecast, risk/WACC, beta policy, and terminal scaffolds — not a full historical grid."
          span="full"
        >
          <p className="cardMeta manualInputSubheading">Forecast assumptions</p>
          <div className="manualInputFieldGrid">
            <DraftField
              id="fin-revenueGrowth"
              label="Revenue growth assumption (decimal)"
              value={draft.financial.revenueGrowthAssumption}
              onChange={(v) => patch("financial", "revenueGrowthAssumption", v)}
            />
            <DraftField
              id="fin-targetMargin"
              label="Target operating margin (decimal)"
              value={draft.financial.targetOperatingMargin}
              onChange={(v) => patch("financial", "targetOperatingMargin", v)}
            />
            <DraftField
              id="fin-targetTax"
              label="Target tax rate (decimal)"
              value={draft.financial.targetTaxRate}
              onChange={(v) => patch("financial", "targetTaxRate", v)}
            />
            <DraftField
              id="fin-reinvestment"
              label="Target reinvestment rate (decimal)"
              value={draft.financial.targetReinvestmentRate}
              onChange={(v) => patch("financial", "targetReinvestmentRate", v)}
            />
          </div>
          <p className="cardMeta manualInputSubheading">Risk / WACC scaffold</p>
          <div className="manualInputFieldGrid">
            <DraftField
              id="fin-riskfree"
              label="Risk-free rate (decimal)"
              value={draft.financial.riskfreeRate}
              onChange={(v) => patch("financial", "riskfreeRate", v)}
            />
            <DraftField
              id="fin-erp"
              label="Equity risk premium (decimal)"
              value={draft.financial.equityRiskPremium}
              onChange={(v) => patch("financial", "equityRiskPremium", v)}
            />
            <DraftField
              id="fin-crp"
              label="Country risk premium (decimal)"
              value={draft.financial.countryRiskPremium}
              onChange={(v) => patch("financial", "countryRiskPremium", v)}
            />
            <DraftField
              id="fin-preTaxDebt"
              label="Pre-tax cost of debt (decimal)"
              value={draft.financial.preTaxCostOfDebt}
              onChange={(v) => patch("financial", "preTaxCostOfDebt", v)}
            />
            <DraftField
              id="fin-targetDtc"
              label="Target debt to capital (decimal)"
              value={draft.financial.targetDebtToCapital}
              onChange={(v) => patch("financial", "targetDebtToCapital", v)}
            />
            <DraftField
              id="fin-marginalTax"
              label="Marginal tax rate (decimal)"
              value={draft.financial.marginalTaxRate}
              onChange={(v) => patch("financial", "marginalTaxRate", v)}
            />
          </div>
          <p className="cardMeta manualInputSubheading">Beta policy &amp; WACC foundation scaffold</p>
          <div className="manualInputFieldGrid">
            <DraftField
              id="fin-marketDe"
              label="Market D/E (beta policy)"
              value={draft.financial.marketDebtToEquity}
              onChange={(v) => patch("financial", "marketDebtToEquity", v)}
            />
            <DraftField
              id="fin-betaTax"
              label="Selected tax rate (beta policy)"
              value={draft.financial.selectedTaxRateBeta}
              onChange={(v) => patch("financial", "selectedTaxRateBeta", v)}
            />
            <DraftField
              id="fin-waccPreTax"
              label="WACC foundation pre-tax cost of debt"
              value={draft.financial.waccPreTaxCostOfDebt}
              onChange={(v) => patch("financial", "waccPreTaxCostOfDebt", v)}
            />
          </div>
          <p className="cardMeta manualInputSubheading">Terminal value scaffold</p>
          <div className="manualInputFieldGrid">
            <DraftField
              id="fin-terminalGrowth"
              label="Terminal growth rate (decimal)"
              value={draft.financial.terminalGrowthRate}
              onChange={(v) => patch("financial", "terminalGrowthRate", v)}
            />
            <DraftField
              id="fin-terminalMargin"
              label="Terminal margin (decimal)"
              value={draft.financial.terminalMargin}
              onChange={(v) => patch("financial", "terminalMargin", v)}
            />
            <DraftField
              id="fin-terminalMethod"
              label="Terminal method"
              value={draft.financial.terminalMethod}
              onChange={(v) => patch("financial", "terminalMethod", v)}
              as="select"
              options={[
                { value: "", label: "—" },
                { value: "Gordon Growth", label: "Gordon Growth" },
                { value: "Exit Multiple", label: "Exit Multiple" },
                { value: "Hybrid", label: "Hybrid" },
              ]}
            />
          </div>
          <p className="cardMeta manualInputSubheading">Historical financial placeholder (LTM only)</p>
          <div className="manualInputFieldGrid">
            <DraftField
              id="hist-ltmRevenue"
              label="LTM revenue (m)"
              value={draft.historicalPlaceholder.ltmRevenueMillions}
              onChange={(v) => patch("historicalPlaceholder", "ltmRevenueMillions", v)}
            />
            <DraftField
              id="hist-ltmFcf"
              label="LTM FCF (m)"
              value={draft.historicalPlaceholder.ltmFcfMillions}
              onChange={(v) => patch("historicalPlaceholder", "ltmFcfMillions", v)}
            />
            <DraftField
              id="hist-periods"
              label="Available periods"
              value={draft.historicalPlaceholder.periods}
              readOnly
              hint="Full period grid will be added in a later phase."
            />
          </div>
        </SectionCard>

        <SectionCard
          title="6. Bridge input placeholders"
          description="Firm-to-equity bridge scaffold amounts (millions, reporting currency context)."
          span="full"
        >
          <div className="manualInputFieldGrid">
            <DraftField
              id="bridge-cash"
              label="Cash & cash equivalents (m)"
              value={draft.bridge.cashAndCashEquivalents}
              onChange={(v) => patch("bridge", "cashAndCashEquivalents", v)}
            />
            <DraftField
              id="bridge-securities"
              label="Marketable securities (m)"
              value={draft.bridge.marketableSecurities}
              onChange={(v) => patch("bridge", "marketableSecurities", v)}
            />
            <DraftField
              id="bridge-grossDebt"
              label="Gross debt (m)"
              value={draft.bridge.grossDebt}
              onChange={(v) => patch("bridge", "grossDebt", v)}
            />
            <DraftField
              id="bridge-leases"
              label="Lease liabilities (m)"
              value={draft.bridge.leaseLiabilities}
              onChange={(v) => patch("bridge", "leaseLiabilities", v)}
            />
            <DraftField
              id="bridge-minority"
              label="Minority interest (m)"
              value={draft.bridge.minorityInterest}
              onChange={(v) => patch("bridge", "minorityInterest", v)}
            />
            <DraftField
              id="bridge-preferred"
              label="Preferred equity (m)"
              value={draft.bridge.preferredEquity}
              onChange={(v) => patch("bridge", "preferredEquity", v)}
            />
            <DraftField
              id="bridge-pension"
              label="Pension deficit (m)"
              value={draft.bridge.pensionDeficit}
              onChange={(v) => patch("bridge", "pensionDeficit", v)}
            />
            <DraftField
              id="bridge-other"
              label="Other claims (m)"
              value={draft.bridge.otherClaims}
              onChange={(v) => patch("bridge", "otherClaims", v)}
            />
          </div>
        </SectionCard>

        <SectionCard
          title="7. Shares / MOS input placeholders"
          description="Intrinsic share scaffold and MOS decision thresholds — foundation presentation only, not Buy/Sell/Hold."
          span="full"
        >
          <p className="cardMeta manualInputSubheading">Share count scaffold</p>
          <div className="manualInputFieldGrid">
            <DraftField
              id="shares-diluted"
              label="Selected diluted shares"
              value={draft.sharesAndMos.selectedDilutedShares}
              onChange={(v) => patch("sharesAndMos", "selectedDilutedShares", v)}
              hint="Unit depends on share unit field."
            />
            <DraftField
              id="shares-unit"
              label="Share unit"
              value={draft.sharesAndMos.shareUnit}
              onChange={(v) => patch("sharesAndMos", "shareUnit", v)}
              as="select"
              options={[
                { value: "millions", label: "millions" },
                { value: "absolute", label: "absolute" },
              ]}
            />
            <DraftField
              id="shares-source"
              label="Shares source label"
              value={draft.sharesAndMos.selectedSharesSource}
              onChange={(v) => patch("sharesAndMos", "selectedSharesSource", v)}
            />
            <DraftField
              id="shares-fx"
              label="FX rate to valuation currency"
              value={draft.sharesAndMos.fxRateToValuationCurrency}
              onChange={(v) => patch("sharesAndMos", "fxRateToValuationCurrency", v)}
            />
          </div>
          <p className="cardMeta manualInputSubheading">MOS / decision layer scaffold (not official decision)</p>
          <div className="manualInputFieldGrid">
            <DraftField
              id="mos-minimum"
              label="Required MOS % — minimumMOSForApprove (decimal)"
              value={draft.sharesAndMos.minimumMOSForApprove}
              onChange={(v) => patch("sharesAndMos", "minimumMOSForApprove", v)}
              hint="Wired to MOS / Decision Foundation and Dashboard presentation when saved."
            />
            <DraftField
              id="mos-watchlist"
              label="Watchlist MOS floor (decimal)"
              value={draft.sharesAndMos.watchlistMOSFloor}
              onChange={(v) => patch("sharesAndMos", "watchlistMOSFloor", v)}
            />
            <DraftField
              id="mos-note"
              label="Analyst override note"
              value={draft.sharesAndMos.analystOverrideNote}
              as="textarea"
              onChange={(v) => patch("sharesAndMos", "analystOverrideNote", v)}
            />
          </div>
        </SectionCard>
      </div>

      <ManualInputsWiringContractPanel />

      <div className="panel manualInputFooter">
        <button
          type="button"
          className={
            dirty || saveState === "saving"
              ? "manualInputSaveButton manualInputSaveButtonActive"
              : "manualInputSaveButton"
          }
          disabled={!dirty || saveState === "saving"}
          onClick={() => void handleSave()}
          title={
            dirty
              ? "Save manual inputs (persistence only — not wired to valuation engines)"
              : "No unsaved changes"
          }
        >
          {saveState === "saving"
            ? "Saving…"
            : saveState === "saved"
              ? "Saved"
              : "Save company inputs"}
        </button>
        <p className="cardMeta">
          Saved inputs reload on refresh of this tab. Valuation Engines still use base company data; use{" "}
          <code>?refresh=1</code> on the Valuation tab only to bypass foundation cache (not manual-input
          save).
        </p>
      </div>
    </div>
  );
}
