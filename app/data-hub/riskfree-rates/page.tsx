import { BackLink } from "@/components/back-link";
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
import { formatPercent } from "@/lib/utils/formatters";

export const dynamic = "force-dynamic";

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

  return (
    <section className="pageSection">
      <BackLink href="/data-hub" label="Back to Data Hub" />
      <div>
        <h2 className="sectionHeading">Riskfree Rates</h2>
        <p className="sectionSubheading">
          Riskfree data source mode:{" "}
          {source === "firestore" ? "Firestore / FRED refreshed" : "Mock fallback"}. Rates
          are stored internally as decimals and displayed as percentages.
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
        <h3 className="cardTitle">Manual Server Refresh Endpoint</h3>
        <p className="cardMeta">
          Daily cron refresh now supports FRED riskfree updates server-side. For manual
          refresh, use protected endpoint:
          {" "}
          <code>/api/data-hub/riskfree-rates/refresh</code> (POST + Bearer CRON_SECRET).
        </p>
        <p className="cardMeta">
          No frontend secret injection is used. Manual override values remain authoritative.
        </p>
        <p className="cardMeta">
          Live rows should show Source as FRED after successful refresh. Mock fallback appears
          only when Firestore data is unavailable.
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
