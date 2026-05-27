import Link from "next/link";
import { FoundationStatusBadge } from "@/components/foundation-status-badge";
import { prepareDashboardTableRows } from "@/lib/dashboard/valuationDashboardRows";
import { getValuationDashboardSnapshots } from "@/lib/firestore/repositories/valuationDashboardRepository";
import {
  formatPercent,
  formatPerShare,
} from "@/lib/utils/formatters";

export default async function Home() {
  const { data: snapshots, source, error } = await getValuationDashboardSnapshots();
  const rows = prepareDashboardTableRows(snapshots);

  return (
    <section className="pageSection">
      <div>
        <h2 className="sectionHeading">Dashboard</h2>
        <p className="sectionSubheading">
          Read-only view from Firestore <code>dashboardRows</code> (persisted valuation snapshots).
          Data source: {source === "firestore" ? "Firestore" : "none"}.
          {error ? ` Warning: ${error}` : null}
        </p>
      </div>

      <div className="panel">
        <p className="cardMeta">
          The Dashboard does not run valuation engines on page load. Run the local batch script to
          refresh persisted results:{" "}
          <code>node scripts/run-all-valuations-batch.mjs</code>
        </p>
        <p className="cardMeta">
          Official Intrinsic Value / Share comes from{" "}
          <code>officialIntrinsicValuePerShare</code> on each snapshot document.
        </p>
        <p className="cardMeta">No Buy/Sell/Hold logic is implemented.</p>
        <p className="cardMeta">
          Foundation outcome (Above Required MOS / Below Required MOS / N/A) is not an official
          investment decision.
        </p>
        <p className="cardMeta">
          Legacy mock decision values (if shown) are separate scaffold data — not connected to
          foundation valuation.
        </p>
      </div>

      <div className="panel">
        <h3 className="cardTitle">Foundation decision integration</h3>
        {rows.length === 0 ? (
          <p className="cardMeta">
            No persisted dashboard snapshots found. Seed at least one company, e.g.{" "}
            <code>node scripts/seed-valuation-result-dev.mjs MSFT</code>, or run the full batch.
          </p>
        ) : (
          <div className="tableWrap">
            <table>
              <thead>
                <tr>
                  <th>Company</th>
                  <th>Ticker</th>
                  <th>Damodaran Industrial Benchmark</th>
                  <th>Valuation Currency</th>
                  <th>Intrinsic Value / Share</th>
                  <th>Current Price</th>
                  <th>Upside / Downside %</th>
                  <th>Margin of Safety %</th>
                  <th>Required MOS %</th>
                  <th>Entry Price</th>
                  <th>Foundation Outcome</th>
                  <th>Foundation Status</th>
                  <th>Dashboard Decision Integration</th>
                  <th>Calculated at</th>
                  <th>Legacy mock decision</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((item) => {
                  const valuationCurrency = item.valuationCurrency ?? undefined;

                  return (
                    <tr key={item.cleanTicker}>
                      <td>
                        <Link href={item.openCompanyUrl}>{item.companyName}</Link>
                      </td>
                      <td>{item.cleanTicker}</td>
                      <td>{item.damodaranIndustrialBenchmark || "—"}</td>
                      <td>{item.valuationCurrency ?? "—"}</td>
                      <td>
                        {formatPerShare(item.officialIntrinsicValuePerShare, {
                          decimals: 2,
                          currency: valuationCurrency,
                        })}
                      </td>
                      <td>
                        {formatPerShare(item.currentSharePrice, {
                          decimals: 2,
                          currency: item.priceCurrency ?? valuationCurrency,
                        })}
                      </td>
                      <td>{formatPercent(item.upsideDownsidePercent, { decimals: 2 })}</td>
                      <td>{formatPercent(item.marginOfSafetyPercent, { decimals: 2 })}</td>
                      <td>{formatPercent(item.requiredMosPercent, { decimals: 2 })}</td>
                      <td>
                        {formatPerShare(item.entryPrice, {
                          decimals: 2,
                          currency: valuationCurrency,
                        })}
                      </td>
                      <td>{item.foundationDecisionOutcome}</td>
                      <td>
                        <FoundationStatusBadge
                          displayStatus={item.foundationReadinessStatus}
                        />
                      </td>
                      <td>{item.dashboardDecisionIntegrationStatus}</td>
                      <td>{item.calculatedAt ?? "—"}</td>
                      <td
                        title="Legacy mock decision — not connected to foundation valuation"
                        className="cardMeta"
                      >
                        {item.legacyMockDecisionStatus
                          ? `Legacy mock: ${item.legacyMockDecisionStatus} (not foundation)`
                          : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
