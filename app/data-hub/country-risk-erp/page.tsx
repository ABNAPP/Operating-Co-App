import { BackLink } from "@/components/back-link";
import {
  getCountryRegionalGroupMap,
  getCountryErpRows,
  getCountryRiskErpImportStatus,
  getCountryRiskErpSourceNotes,
  getErpUsageRules,
  getRegionalErpRows,
  getWeightedErpFormulaGuide,
} from "@/lib/firestore/repositories/countryRiskErpRepository";
import { formatPercent } from "@/lib/utils/formatters";

export const dynamic = "force-dynamic";

interface CountryRiskErpPageProps {
  searchParams?: Promise<{
    q?: string;
    status?: string;
    view?: string;
    region?: string;
  }>;
}

export default async function CountryRiskErpPage({ searchParams }: CountryRiskErpPageProps) {
  const params = (await searchParams) ?? {};
  const query = params.q?.trim().toLowerCase() ?? "";
  const statusFilter = params.status?.trim() ?? "all";
  const view = params.view?.trim() ?? "country";
  const selectedRegion = params.region?.trim() ?? "all";

  const countryRowsResult = await getCountryErpRows();
  const mapRowsResult = await getCountryRegionalGroupMap();
  const regionalRowsResult = await getRegionalErpRows();
  const sourceNotesResult = await getCountryRiskErpSourceNotes();
  const usageRulesResult = await getErpUsageRules();
  const weightedGuideResult = await getWeightedErpFormulaGuide();
  const importStatusResult = await getCountryRiskErpImportStatus();

  const sourceNote = sourceNotesResult.data[0];
  const importStatus = importStatusResult.data;

  const filteredCountryRows = countryRowsResult.data.filter((row) => {
    const matchesQuery =
      query.length === 0 ||
      row.countryName.toLowerCase().includes(query) ||
      (row.countryCode?.toLowerCase().includes(query) ?? false);
    const matchesStatus = statusFilter === "all" || row.status === statusFilter;
    return matchesQuery && matchesStatus;
  });

  const countryStatuses = Array.from(
    new Set(countryRowsResult.data.map((row) => row.status).filter(Boolean)),
  );
  const regionOptions = Array.from(
    new Set(
      [
        ...regionalRowsResult.data.map((row) => row.regionName),
        ...mapRowsResult.data.map((row) => row.regionalGroup),
      ].filter(Boolean),
    ),
  ).sort((a, b) => a.localeCompare(b));

  const filteredMapRows = mapRowsResult.data.filter((row) => {
    const matchesRegion = selectedRegion === "all" || row.regionalGroup === selectedRegion;
    const matchesQuery =
      query.length === 0 ||
      row.countryName.toLowerCase().includes(query) ||
      (row.countryCode?.toLowerCase().includes(query) ?? false) ||
      row.regionalGroup.toLowerCase().includes(query);
    return matchesRegion && matchesQuery;
  });

  return (
    <section className="pageSection">
      <BackLink href="/data-hub" label="Back to Data Hub" />
      <div>
        <h2 className="sectionHeading">Country Risk / ERP</h2>
        <p className="sectionSubheading">
          Country ERP reference data module. Revenue geography drives Weighted ERP while
          valuation currency drives Riskfree Rate.
        </p>
      </div>

      <div className="panel">
        <h3 className="cardTitle">Source & Methodology</h3>
        <p className="cardMeta">Source Name: {sourceNote?.sourceName ?? "Damodaran dataset"}</p>
        <p className="cardMeta">
          Source URL:{" "}
          <a href={sourceNote?.sourceUrl ?? "#"} target="_blank" rel="noreferrer">
            {sourceNote?.sourceUrl ?? "N/A"}
          </a>
        </p>
        <p className="cardMeta">
          Download URL:{" "}
          <a href={sourceNote?.downloadUrl ?? "#"} target="_blank" rel="noreferrer">
            {sourceNote?.downloadUrl ?? "N/A"}
          </a>
        </p>
        <p className="cardMeta">Source Update Date: {importStatus.sourceUpdateDate}</p>
        <p className="cardMeta">
          Imported Last Updated: {importStatus.importedLastUpdated ?? "Not imported"}
        </p>
        <p className="cardMeta">Import Status: {importStatus.status}</p>
        <p className="cardMeta">
          Purpose: Damodaran estimates mature market ERP and adds country risk premium from
          spreads/rating/CDS where available.
        </p>
        <p className="cardMeta">
          Revenue geography drives Weighted ERP. Valuation currency drives Riskfree Rate.
        </p>
        <p className="cardMeta">
          Regional ERP is calculated from active country-to-region mappings. One country can
          belong to multiple regional groups.
        </p>
      </div>

      <div className="panel">
        <h3 className="cardTitle">Import / Refresh</h3>
        <p className="cardMeta">
          Manual protected endpoint: <code>/api/data-hub/country-risk-erp/refresh</code> (POST +
          Bearer CRON_SECRET).
        </p>
        <p className="cardMeta">Country Risk / ERP refresh is not part of daily cron.</p>
        <p className="cardMeta">Stale review threshold: 180 days.</p>
        <p className="cardMeta">
          Rows imported/skipped: {importStatus.rowsImported} / {importStatus.rowsSkipped}
        </p>
      </div>

      <div className="panel">
        <h3 className="cardTitle">Country ERP Filters</h3>
        <form method="GET" style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <input
            type="text"
            name="q"
            defaultValue={params.q ?? ""}
            placeholder="Search country or code"
          />
          <select name="status" defaultValue={statusFilter}>
            <option value="all">All status</option>
            {countryStatuses.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
          <select name="view" defaultValue={view}>
            <option value="country">Country table</option>
            <option value="regional">Regional table</option>
            <option value="mapping">Country-region map</option>
            <option value="all">Country + Regional</option>
          </select>
          <select name="region" defaultValue={selectedRegion}>
            <option value="all">All regions</option>
            {regionOptions.map((region) => (
              <option key={region} value={region}>
                {region}
              </option>
            ))}
          </select>
          <button type="submit" className="navLink">
            Apply
          </button>
        </form>
      </div>

      {view !== "regional" ? (
        <div className="tableWrap">
          <table>
            <thead>
              <tr>
                <th>Country / Region</th>
                <th>Country Code</th>
                <th>Moody&apos;s Rating</th>
                <th>Adjusted Default Spread</th>
                <th>Country Risk Premium</th>
                <th>Total Equity Risk Premium</th>
                <th>Corporate Tax Rate</th>
                <th>Sovereign CDS</th>
                <th>ERP Based on Sovereign CDS</th>
                <th>Source / Update Date</th>
                <th>Imported / Last Updated</th>
                <th>Status</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {filteredCountryRows.map((row) => (
                <tr key={row.id}>
                  <td>{row.countryName}</td>
                  <td>{row.countryCode ?? "N/A"}</td>
                  <td>{row.moodysRating || "N/A"}</td>
                  <td>{formatPercent(row.adjustedDefaultSpread)}</td>
                  <td>{formatPercent(row.countryRiskPremium)}</td>
                  <td>{formatPercent(row.totalEquityRiskPremium)}</td>
                  <td>{formatPercent(row.corporateTaxRate)}</td>
                  <td>{formatPercent(row.sovereignCds)}</td>
                  <td>{formatPercent(row.erpBasedOnSovereignCds)}</td>
                  <td>
                    {row.sourceName} ({row.sourceUpdateDate})
                  </td>
                  <td>{row.importedLastUpdated ?? "N/A"}</td>
                  <td>{row.status}</td>
                  <td>{row.notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {view !== "country" && view !== "mapping" ? (
        <div className="tableWrap">
          <table>
            <thead>
              <tr>
                <th>Region</th>
                <th>Region Type</th>
                <th>ERP</th>
                <th>Default Spread</th>
                <th>Country Risk Premium</th>
                <th>Corporate Tax Rate</th>
                <th>Country Count</th>
                <th>Active Mapping Count</th>
                <th>Data Coverage %</th>
                <th>Status</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {regionalRowsResult.data.map((row) => (
                <tr key={row.id}>
                  <td>{row.regionName}</td>
                  <td>{row.regionType}</td>
                  <td>{formatPercent(row.totalEquityRiskPremium)}</td>
                  <td>{formatPercent(row.adjustedDefaultSpread)}</td>
                  <td>{formatPercent(row.countryRiskPremium)}</td>
                  <td>{formatPercent(row.corporateTaxRate)}</td>
                  <td>{row.countryCount}</td>
                  <td>{row.activeMappingCount}</td>
                  <td>{formatPercent(row.dataCoveragePct)}</td>
                  <td>{row.status}</td>
                  <td>{row.notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {view !== "country" && view !== "regional" ? (
        <div className="tableWrap">
          <table>
            <thead>
              <tr>
                <th>Country</th>
                <th>Country Code</th>
                <th>Regional Group</th>
                <th>Region Type</th>
                <th>Active</th>
                <th>Source / Method</th>
                <th>Status</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {filteredMapRows.map((row) => (
                <tr key={row.id}>
                  <td>{row.countryName}</td>
                  <td>{row.countryCode ?? "N/A"}</td>
                  <td>{row.regionalGroup}</td>
                  <td>{row.regionType}</td>
                  <td>{row.active ? "Yes" : "No"}</td>
                  <td>{row.sourceMethod}</td>
                  <td>{row.status}</td>
                  <td>{row.notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      <div className="panel">
        <h3 className="cardTitle">Usage Rules</h3>
        <p className="cardMeta">
          Country-level ERP is primary. Regional ERP is fallback/reference when revenue exposure
          is provided at region level.
        </p>
        <p className="cardMeta">
          Weighted ERP later = SUM(Revenue Weight x Country/Region ERP). No WACC/valuation math is
          implemented in this phase.
        </p>
        {usageRulesResult.data.map((rule) => (
          <p key={rule.id} className="cardMeta">
            {rule.ruleId}: {rule.rule}
          </p>
        ))}
      </div>

      <div className="panel">
        <h3 className="cardTitle">Future Company Connection</h3>
        <p className="cardMeta">
          Company Workspace will later capture Revenue Exposure inputs by country/region.
        </p>
        {weightedGuideResult.data.map((item) => (
          <p key={item.id} className="cardMeta">
            {item.formulaComponent}: {item.formulaLogic}
          </p>
        ))}
        <p className="cardMeta">
          Selected ERP will feed Risk/WACC Engine later. No WACC or valuation math is implemented
          in this phase.
        </p>
      </div>
    </section>
  );
}
