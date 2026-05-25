import { revalidatePath } from "next/cache";
import {
  getRiskfreeRateByCurrency,
  getRiskfreeRates,
  seedDefaultRiskfreeRates,
} from "@/lib/firestore/repositories/referenceDataRepository";
import {
  getRiskfreeRateForValuationCurrency,
  getSelectedRiskfreeRate,
} from "@/lib/data-hub/rateSelectors";

export default async function RiskfreeRatesPage() {
  const { data: riskfreeRows, source } = await getRiskfreeRates();
  const usdRiskfree = getRiskfreeRateForValuationCurrency("USD", riskfreeRows);
  const eurRiskfree = await getRiskfreeRateByCurrency("EUR");
  const sekRiskfree = await getRiskfreeRateByCurrency("SEK");

  async function seedDefaultRiskfreeRatesAction() {
    "use server";
    await seedDefaultRiskfreeRates();
    revalidatePath("/data-hub/riskfree-rates");
    revalidatePath("/data-hub");
  }

  const formatPercent = (value: number | null) =>
    value === null ? "N/A" : `${(value * 100).toFixed(2)}%`;

  return (
    <section className="pageSection">
      <div>
        <h2 className="sectionHeading">Riskfree Rates</h2>
        <p className="sectionSubheading">
          Riskfree data source mode: {source === "firestore" ? "Firestore" : "Mock"}.
          Rates are stored internally as decimals and displayed as percentages.
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

      <div className="panel">
        <h3 className="cardTitle">Phase 4B Refresh Note</h3>
        <p className="cardMeta">
          Live FRED refresh is not active yet. Phase 4A keeps scaffold-only refresh status.
        </p>
        <form action={seedDefaultRiskfreeRatesAction} style={{ marginTop: "0.75rem" }}>
          <button type="submit" className="navLink">
            Seed Default Riskfree Rates
          </button>
        </form>
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
    </section>
  );
}
