import { revalidatePath } from "next/cache";
import {
  getCurrencyMap,
  getFxPairRates,
  seedDefaultCurrencyMap,
  seedDefaultFxPairsFromCurrencyMap,
} from "@/lib/firestore/repositories/referenceDataRepository";
import { getSelectedFxRate } from "@/lib/data-hub/rateSelectors";

export default async function FxRatesPage() {
  const { data: currencyMapRows, source: mapSource } = await getCurrencyMap();
  const { data: fxRows, source: fxSource } = await getFxPairRates();

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

  const formatFx = (value: number | null) => (value === null ? "N/A" : value.toFixed(4));

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
