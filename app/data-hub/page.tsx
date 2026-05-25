import {
  getCurrencyMap,
  getDailyRefreshStatus,
  getFxPairRates,
  getReferenceDataSummary,
  getRiskfreeRateByCurrency,
  getRiskfreeRates,
  seedDefaultCurrencyMap,
  seedDefaultFxPairsFromCurrencyMap,
  seedDefaultRiskfreeRates,
} from "@/lib/firestore/repositories/referenceDataRepository";
import { getFirestoreStatusSummary } from "@/lib/firestore/status";
import {
  getRiskfreeRateForValuationCurrency,
  getSelectedFxRate,
  getSelectedRiskfreeRate,
} from "@/lib/data-hub/rateSelectors";
import { revalidatePath } from "next/cache";

export default async function DataHubPage() {
  const { data: referenceSummary, source } = await getReferenceDataSummary();
  const firestoreStatus = getFirestoreStatusSummary();
  const { data: dailyRefreshStatus } = await getDailyRefreshStatus();
  const { data: riskfreeRows } = await getRiskfreeRates();
  const { data: currencyMapRows } = await getCurrencyMap();
  const { data: fxRows } = await getFxPairRates();
  const usdRiskfree = getRiskfreeRateForValuationCurrency("USD", riskfreeRows);
  const eurRiskfree = await getRiskfreeRateByCurrency("EUR");
  const sekRiskfree = await getRiskfreeRateByCurrency("SEK");

  async function seedDefaultRiskfreeRatesAction() {
    "use server";
    await seedDefaultRiskfreeRates();
    revalidatePath("/data-hub");
  }

  async function seedDefaultCurrencyMapAction() {
    "use server";
    await seedDefaultCurrencyMap();
    revalidatePath("/data-hub");
  }

  async function generateSeedFxPairsAction() {
    "use server";
    await seedDefaultFxPairsFromCurrencyMap();
    revalidatePath("/data-hub");
  }

  const formatPercent = (value: number | null) =>
    value === null ? "N/A" : `${(value * 100).toFixed(2)}%`;

  const formatFx = (value: number | null) => (value === null ? "N/A" : value.toFixed(4));

  return (
    <section className="pageSection">
      <div>
        <h2 className="sectionHeading">Data Hub</h2>
        <p className="sectionSubheading">
          Central place for shared reference data, API readiness, and configuration.
        </p>
      </div>

      <div className="panel">
        <h3 className="cardTitle">Firestore / Data Hub Status</h3>
        <p className="cardMeta">Firebase Config: {firestoreStatus.firebaseConfig}</p>
        <p className="cardMeta">Firestore Client: {firestoreStatus.firestoreClient}</p>
        <p className="cardMeta">
          Reference Data Mode: {source === "firestore" ? "Firestore" : "Mock"}
        </p>
        <p className="cardMeta">Riskfree Rates: Placeholder</p>
        <p className="cardMeta">FX Rates: Placeholder</p>
        <p className="cardMeta">Damodaran Data: Placeholder</p>
        <p className="cardMeta">Sector Mapping: Placeholder</p>
        {firestoreStatus.lastReadAttempt ? (
          <p className="cardMeta">
            Last Firestore Read: {firestoreStatus.lastReadAttempt.collection} (
            {firestoreStatus.lastReadAttempt.ok ? "OK" : "Failed"})
          </p>
        ) : null}
      </div>

      <div className="panel">
        <h3 className="cardTitle">Daily Refresh Status</h3>
        <p className="cardMeta">Last daily refresh attempt: {dailyRefreshStatus.finishedAt}</p>
        <p className="cardMeta">
          Last successful refresh: {dailyRefreshStatus.lastSuccessfulRefreshAt ?? "N/A"}
        </p>
        <p className="cardMeta">Next scheduled refresh: Daily via Vercel Cron at 06:00 UTC</p>
        <p className="cardMeta">
          Riskfree refresh status: {dailyRefreshStatus.riskfreeRefreshStatus}
        </p>
        <p className="cardMeta">FX refresh status: {dailyRefreshStatus.fxRefreshStatus}</p>
        <p className="cardMeta">
          Last warning/error:{" "}
          {dailyRefreshStatus.errors[0] ??
            dailyRefreshStatus.warnings[0] ??
            "No recent warnings/errors."}
        </p>
      </div>

      <div className="panel">
        <h3 className="cardTitle">Riskfree by Valuation Currency</h3>
        <p className="cardMeta">
          Riskfree Rate is selected by Valuation Currency. For example:
        </p>
        <p className="cardMeta">
          USD - {usdRiskfree?.riskfreeProxy ?? "US 10Y Treasury"} /{" "}
          {usdRiskfree?.fredSeriesId ?? "DGS10"}
        </p>
        <p className="cardMeta">
          EUR - {eurRiskfree.data?.riskfreeProxy ?? "German 10Y Bund proxy"} /{" "}
          {eurRiskfree.data?.fredSeriesId ?? "IRLTLT01DEM156N"}
        </p>
        <p className="cardMeta">
          SEK - {sekRiskfree.data?.riskfreeProxy ?? "Sweden 10Y Government Bond"} /{" "}
          {sekRiskfree.data?.fredSeriesId ?? "IRLTLT01SEM156N"}
        </p>
      </div>

      <div className="cardGrid">
        <article className="card">
          <h3 className="cardTitle">Riskfree Rates</h3>
          <p className="cardMeta">Entries: {referenceSummary.riskfreeRates}</p>
          <form action={seedDefaultRiskfreeRatesAction} style={{ marginTop: "0.5rem" }}>
            <button type="submit" className="navLink">
              Seed Default Riskfree Rates
            </button>
          </form>
        </article>
        <article className="card">
          <h3 className="cardTitle">Currency Map</h3>
          <p className="cardMeta">Rows: {referenceSummary.currencyMap}</p>
          <form action={seedDefaultCurrencyMapAction} style={{ marginTop: "0.5rem" }}>
            <button type="submit" className="navLink">
              Seed Default Currency Map
            </button>
          </form>
        </article>
        <article className="card">
          <h3 className="cardTitle">FX Pair Rates</h3>
          <p className="cardMeta">Pairs: {referenceSummary.fxRates}</p>
          <form action={generateSeedFxPairsAction} style={{ marginTop: "0.5rem" }}>
            <button type="submit" className="navLink">
              Generate / Seed FX Pairs from Currency Map
            </button>
          </form>
        </article>
        <article className="card">
          <h3 className="cardTitle">Damodaran Data</h3>
          <p className="cardMeta">Sections: {referenceSummary.damodaranData}</p>
        </article>
        <article className="card">
          <h3 className="cardTitle">Country Risk / ERP</h3>
          <p className="cardMeta">Placeholder dataset (no external import yet).</p>
        </article>
        <article className="card">
          <h3 className="cardTitle">Sector / Industry Mapping</h3>
          <p className="cardMeta">Mappings: {referenceSummary.sectorIndustryMapping}</p>
        </article>
        <article className="card">
          <h3 className="cardTitle">Beta Reference</h3>
          <p className="cardMeta">Entries: {referenceSummary.betaReferenceData}</p>
        </article>
        <article className="card">
          <h3 className="cardTitle">Forecast & Fade Rules</h3>
          <p className="cardMeta">Rule sets: {referenceSummary.forecastFadeRules}</p>
        </article>
        <article className="card">
          <h3 className="cardTitle">API Integrations</h3>
          <p className="cardMeta">Providers: {referenceSummary.apiProviderConfigs}</p>
          <p className="cardMeta">No live provider API calls in this phase.</p>
        </article>
        <article className="card">
          <h3 className="cardTitle">Settings</h3>
          <p className="cardMeta">Environment templates prepared, no live keys in repo.</p>
        </article>
      </div>

      <div className="tableWrap">
        <table>
          <thead>
            <tr>
              <th>Currency Code</th>
              <th>Currency Name</th>
              <th>Riskfree Proxy</th>
              <th>FRED Series ID</th>
              <th>Live Riskfree Rate</th>
              <th>Manual Override Rate</th>
              <th>Selected Riskfree Rate</th>
              <th>Source</th>
              <th>Last Updated</th>
              <th>Status</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            {riskfreeRows.map((row) => (
              <tr key={row.id}>
                <td>{row.currencyCode}</td>
                <td>{row.currencyName}</td>
                <td>{row.riskfreeProxy}</td>
                <td>{row.fredSeriesId}</td>
                <td>{formatPercent(row.liveRiskfreeRate)}</td>
                <td>{formatPercent(row.manualOverrideRate)}</td>
                <td>{formatPercent(getSelectedRiskfreeRate(row))}</td>
                <td>{row.sourceName}</td>
                <td>{row.importedLastUpdated ?? row.sourceUpdateDate}</td>
                <td>{row.status}</td>
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
