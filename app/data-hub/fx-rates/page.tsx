import { revalidatePath } from "next/cache";
import {
  ensureFxPairsRequiredByCompanies,
  getCurrencyMap,
  getFxPairRates,
  seedDefaultCurrencyMap,
  seedDefaultFxPairsFromCurrencyMap,
} from "@/lib/firestore/repositories/referenceDataRepository";
import { getSelectedFxRate } from "@/lib/data-hub/rateSelectors";
import { runFxRefreshBucketQaCheck } from "@/lib/data-hub/fxRefreshService";
import { runRequiredFxPairQaCheck } from "@/lib/data-hub/requiredFxPairs";

export const dynamic = "force-dynamic";

export default async function FxRatesPage() {
  const { data: currencyMapRows, source: mapSource } = await getCurrencyMap();
  const { data: fxRows, source: fxSource } = await getFxPairRates();
  const qaCheck = runRequiredFxPairQaCheck();
  const refreshQaCheck = runFxRefreshBucketQaCheck();

  async function seedDefaultCurrencyMapAction() {
    "use server";
    await seedDefaultCurrencyMap();
    revalidatePath("/data-hub/fx-rates");
    revalidatePath("/data-hub");
  }

  async function generateSeedFxPairsAction() {
    "use server";
    await seedDefaultFxPairsFromCurrencyMap();
    revalidatePath("/data-hub/fx-rates");
    revalidatePath("/data-hub");
  }

  async function ensureRequiredFxPairsAction() {
    "use server";
    await ensureFxPairsRequiredByCompanies();
    revalidatePath("/data-hub/fx-rates");
    revalidatePath("/data-hub/refresh-status");
    revalidatePath("/data-hub");
  }

  const formatFx = (value: number | null) => (value === null ? "N/A" : value.toFixed(4));
  const requiredPairs = fxRows.filter((row) => row.requiredByCompany);
  const inverseDerivedPairs = fxRows.filter((row) => row.isInverseDerived);
  const sameCurrencyPairs = fxRows.filter((row) => row.fromCurrency === row.toCurrency);
  const referencePairs = fxRows.filter(
    (row) => !row.requiredByCompany && !row.isInverseDerived && row.fromCurrency !== row.toCurrency,
  );
  const missingRatePairs = fxRows.filter(
    (row) =>
      row.fromCurrency !== row.toCurrency &&
      row.manualOverride === null &&
      row.liveFxRate === null &&
      row.selectedFxRate === null,
  );

  return (
    <section className="pageSection">
      <div>
        <h2 className="sectionHeading">FX Rates</h2>
        <p className="sectionSubheading">
          FX rates are separate from riskfree rates and do not set riskfree values. Currency
          map source: {mapSource === "firestore" ? "Firestore" : "Mock"}; FX pair source:{" "}
          {fxSource === "firestore" ? "Firestore" : "Mock"}.
        </p>
      </div>

      <div className="panel">
        <h3 className="cardTitle">FX Refresh Rules</h3>
        <p className="cardMeta">FX rates are global reference data only.</p>
        <p className="cardMeta">Same-currency pairs use selected FX rate = 1.</p>
        <p className="cardMeta">Manual override remains authoritative over live provider values.</p>
        <p className="cardMeta">
          Company currency requirements create required FX pairs in both directions.
        </p>
        <p className="cardMeta">
          Example: valuation USD + trading CHF requires CHF-&gt;USD and USD-&gt;CHF.
        </p>
        <p className="cardMeta">
          Reporting currency mismatch is tracked as Currency Review until full financial conversion
          is implemented.
        </p>
        <p className="cardMeta">
          Inverse rates may be derived from a successful direct pair refresh to reduce API calls.
        </p>
        <p className="cardMeta">
          Manual server refresh endpoint: <code>/api/data-hub/fx-rates/refresh</code> (POST +
          Bearer CRON_SECRET).
        </p>
      </div>

      <div className="panel">
        <h3 className="cardTitle">Currency Map Actions</h3>
        <form action={seedDefaultCurrencyMapAction}>
          <button type="submit" className="navLink">
            Seed Default Currency Map
          </button>
        </form>
      </div>

      <div className="panel">
        <h3 className="cardTitle">FX Pair Actions</h3>
        <form action={generateSeedFxPairsAction}>
          <button type="submit" className="navLink">
            Generate / Seed FX Pairs from Currency Map
          </button>
        </form>
        <form action={ensureRequiredFxPairsAction} style={{ marginTop: "0.75rem" }}>
          <button type="submit" className="navLink">
            Ensure Required FX Pairs from Companies
          </button>
        </form>
      </div>

      <div className="panel">
        <h3 className="cardTitle">FX Pair Grouping</h3>
        <p className="cardMeta">Required pairs: {requiredPairs.length}</p>
        <p className="cardMeta">Inverse-derived pairs: {inverseDerivedPairs.length}</p>
        <p className="cardMeta">Same-currency pairs: {sameCurrencyPairs.length}</p>
        <p className="cardMeta">Other reference pairs: {referencePairs.length}</p>
        <p className="cardMeta">
          Missing rates: {missingRatePairs.length}{" "}
          {missingRatePairs.length > 0
            ? "(run FX refresh; existing stored rates should remain persisted)"
            : ""}
        </p>
      </div>

      <div className="panel">
        <h3 className="cardTitle">QA Helper (Derivation)</h3>
        <p className="cardMeta">
          CHF-&gt;USD: {qaCheck.hasChfUsd ? "Yes" : "No"} | USD-&gt;CHF:{" "}
          {qaCheck.hasUsdChf ? "Yes" : "No"}
        </p>
        <p className="cardMeta">
          SEK-&gt;USD: {qaCheck.hasSekUsd ? "Yes" : "No"} | USD-&gt;SEK:{" "}
          {qaCheck.hasUsdSek ? "Yes" : "No"}
        </p>
        <p className="cardMeta">
          Same-currency external pairs omitted:{" "}
          {qaCheck.hasNoSameCurrencyExternalPair ? "Yes" : "No"}
        </p>
        <p className="cardMeta">
          Required-before-reference bucket ordering:{" "}
          {refreshQaCheck.requiredBeforeReference ? "Yes" : "No"}
        </p>
        <p className="cardMeta">
          Bidirectional required pair example in policy check:{" "}
          {refreshQaCheck.hasBidirectionalRequiredExample ? "Yes" : "No"}
        </p>
      </div>

      <div className="tableWrap">
        <table>
          <thead>
            <tr>
              <th>Currency Code</th>
              <th>Currency Name</th>
              <th>Active?</th>
              <th>Used As Reporting?</th>
              <th>Used As Valuation?</th>
              <th>Used As Trading?</th>
              <th>Riskfree Required?</th>
              <th>Default Riskfree Proxy</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            {currencyMapRows.map((row) => (
              <tr key={row.id}>
                <td>{row.currencyCode}</td>
                <td>{row.currencyName}</td>
                <td>{row.active ? "Yes" : "No"}</td>
                <td>{row.usedAsReporting ? "Yes" : "No"}</td>
                <td>{row.usedAsValuation ? "Yes" : "No"}</td>
                <td>{row.usedAsTrading ? "Yes" : "No"}</td>
                <td>{row.riskfreeRequired ? "Yes" : "No"}</td>
                <td>{row.defaultRiskfreeProxy}</td>
                <td>{row.notes}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="tableWrap">
        <table>
          <thead>
            <tr>
              <th>From Currency</th>
              <th>To Currency</th>
              <th>FX Pair</th>
              <th>Live FX Rate</th>
              <th>Manual Override</th>
              <th>Selected FX Rate</th>
              <th>Required by Company?</th>
              <th>Required By Tickers</th>
              <th>Purpose</th>
              <th>Derived From Pair</th>
              <th>Source</th>
              <th>Last Updated</th>
              <th>Status</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            {fxRows.map((row) => (
              <tr key={row.id}>
                <td>{row.fromCurrency}</td>
                <td>{row.toCurrency}</td>
                <td>{row.fxPair}</td>
                <td>{formatFx(row.liveFxRate)}</td>
                <td>{formatFx(row.manualOverride)}</td>
                <td>{formatFx(getSelectedFxRate(row))}</td>
                <td>{row.requiredByCompany ? "Yes" : "No"}</td>
                <td>{row.requiredByTickers?.join(", ") || "N/A"}</td>
                <td>{row.purpose ?? "Reference Pair"}</td>
                <td>{row.derivedFromPair ?? "N/A"}</td>
                <td>{row.source}</td>
                <td>{row.lastUpdated}</td>
                <td>{row.status}</td>
                <td>{row.notes}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
