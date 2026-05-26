import { ClickableCardLink } from "@/components/clickable-card";
import {
  DAMODARAN_COUNTRY_RISK_UPDATE_DATE,
  DAMODARAN_SOURCE_NAME,
  DAMODARAN_SOURCE_UPDATE_DATE,
  DAMODARAN_SOURCE_URL,
} from "@/lib/data-hub/damodaranDatasetRegistry";
import {
  getCanonicalDamodaranIndustries,
  getDamodaranDatasetRegister,
  getDamodaranImportSummary,
  refreshCanonicalDamodaranIndustryList,
} from "@/lib/firestore/repositories/damodaranDataRepository";

export const dynamic = "force-dynamic";

export default async function DamodaranDataPage() {

  const registerResult = await getDamodaranDatasetRegister();
  const importSummaryResult = await getDamodaranImportSummary();
  let canonicalResult = await getCanonicalDamodaranIndustries();
  if (canonicalResult.data.length === 0) {
    await refreshCanonicalDamodaranIndustryList();
    canonicalResult = await getCanonicalDamodaranIndustries();
  }
  const dataSource =
    registerResult.source === "firestore" || importSummaryResult.source === "firestore"
      ? "firestore"
      : "mock";

  const allRows = registerResult.data;

  const coreRows = registerResult.data.filter((row) => row.priority === "Core");
  const importedCoreRows = coreRows.filter((row) => row.importStatus === "Imported");
  const missingCoreDatasets = coreRows.filter((row) => row.importStatus !== "Imported");
  const hasMissingLocalFiles = registerResult.data.some(
    (row) => row.importStatus === "Missing Local File",
  );
  const readinessStatus = hasMissingLocalFiles
    ? "No / Missing Local Files"
    : importedCoreRows.length === coreRows.length && importSummaryResult.data.industryCount > 0
      ? "Yes"
      : importSummaryResult.data.industryCount > 0
        ? "Review"
        : "No";

  const priorityRank: Record<string, number> = {
    Core: 0,
    Support: 1,
    Optional: 2,
    Advanced: 3,
  };

  const groupedRows = {
    core: allRows
      .filter((row) => row.priority === "Core")
      .sort((a, b) => a.datasetName.localeCompare(b.datasetName)),
    support: allRows
      .filter((row) => row.priority === "Support")
      .sort((a, b) => a.datasetName.localeCompare(b.datasetName)),
    optionalAdvanced: allRows
      .filter((row) => row.priority === "Optional" || row.priority === "Advanced")
      .sort((a, b) => {
        const priorityCompare = priorityRank[a.priority] - priorityRank[b.priority];
        return priorityCompare !== 0 ? priorityCompare : a.datasetName.localeCompare(b.datasetName);
      }),
  };
  const canonicalRows = canonicalResult.data;
  const canonicalCount = canonicalRows.filter((row) => row.isCanonical).length;
  const variantCount = canonicalRows.filter((row) => row.canonicalStatus === "Duplicate / Variant").length;
  const excludedCount = canonicalRows.filter(
    (row) => row.canonicalStatus === "Excluded Non-Industry",
  ).length;
  const canonicalReadiness =
    canonicalCount >= 90 && canonicalCount <= 110 ? "Ready" : "Review (outside expected range)";

  const renderDatasetCards = (rows: typeof allRows) => {
    if (rows.length === 0) {
      return <p className="cardMeta">No datasets available in this section.</p>;
    }

    return (
      <div className="cardGrid">
        {rows.map((row) => (
          <ClickableCardLink
            key={row.id}
            href={`/data-hub/damodaran-data/${row.id}`}
            title={row.datasetName}
          >
            <h3 className="cardTitle">{row.datasetName}</h3>
            <p className="cardMeta">Updated: {row.sourceUpdateDate}</p>
            <p className="cardMeta">Status: {row.importStatus}</p>
            <p className="cardMeta">Rows: {row.rowCount > 0 ? row.rowCount : "No rows imported"}</p>
            <p className="cardMeta">Priority: {row.priority}</p>
          </ClickableCardLink>
        ))}
      </div>
    );
  };

  return (
    <section className="pageSection">
      <div>
        <h2 className="sectionHeading">Damodaran Industry Data Vault / Source Register</h2>
        <p className="sectionSubheading">
          Card-based Data Vault navigation for Damodaran benchmark datasets and readiness checks
          before Industry Benchmark Config.
        </p>
      </div>

      <div className="panel">
        <h3 className="cardTitle">Source Summary</h3>
        <p className="cardMeta">Source Name: {DAMODARAN_SOURCE_NAME}</p>
        <p className="cardMeta">
          Data Source: {dataSource === "firestore" ? "Firestore / Local Cache Fallback" : "Mock"}
        </p>
        <p className="cardMeta">
          Source URL:{" "}
          <a href={DAMODARAN_SOURCE_URL} target="_blank" rel="noreferrer">
            {DAMODARAN_SOURCE_URL}
          </a>
        </p>
        <p className="cardMeta">Source Update Date: {DAMODARAN_SOURCE_UPDATE_DATE}</p>
        <p className="cardMeta">Country Risk Update Date: {DAMODARAN_COUNTRY_RISK_UPDATE_DATE}</p>
        <p className="cardMeta">
          Imported / Last Updated: {importSummaryResult.data.finishedAt || "Not imported"}
        </p>
        <p className="cardMeta">
          Status: {importSummaryResult.data.success ? "Imported" : "Review"}
        </p>
        <p className="cardMeta">
          Notes: Main page is compact navigation only. Open a dataset card to inspect stored raw
          table rows.
        </p>
        <p className="cardMeta">
          Linkage: Damodaran Data Vault feeds Industry Benchmark Config using the canonical
          industry benchmark universe.
        </p>
        <p className="cardMeta">
          Pricing multiples datasets are sanity-only and must not drive official intrinsic value
          outputs.
        </p>
      </div>

      <div className="panel">
        <h3 className="cardTitle">Readiness Summary</h3>
        <p className="cardMeta">
          Core datasets imported: {missingCoreDatasets.length === 0 ? "Yes" : "No"}
        </p>
        <p className="cardMeta">
          Industry master list generated: {importSummaryResult.data.industryCount > 0 ? "Yes" : "No"}
        </p>
        <p className="cardMeta">Industry count: {importSummaryResult.data.industryCount}</p>
        <p className="cardMeta">Coverage matrix rows: {importSummaryResult.data.coverageMatrixRows}</p>
        <p className="cardMeta">Ready for Industry Benchmark Config: {readinessStatus}</p>
        <p className="cardMeta">
          Missing core datasets:{" "}
          {missingCoreDatasets.length > 0
            ? missingCoreDatasets.map((row) => row.fileName).join(", ")
            : "None"}
        </p>
      </div>

      <div className="panel">
        <h3 className="cardTitle">Core Reference</h3>
        {renderDatasetCards(groupedRows.core)}
      </div>

      <div className="panel">
        <h3 className="cardTitle">Support</h3>
        {renderDatasetCards(groupedRows.support)}
      </div>

      <div className="panel">
        <h3 className="cardTitle">Optional / Advanced</h3>
        {renderDatasetCards(groupedRows.optionalAdvanced)}
      </div>

      <div className="panel">
        <h3 className="cardTitle">Industry Summary Cards</h3>
        <p className="cardMeta">Industry Master List rows: {importSummaryResult.data.industryCount}</p>
        <p className="cardMeta">Coverage Matrix rows: {importSummaryResult.data.coverageMatrixRows}</p>
      </div>

      <div className="panel">
        <h3 className="cardTitle">Canonical Industry Master List</h3>
        <p className="cardMeta">Canonical industry count: {canonicalCount}</p>
        <p className="cardMeta">Review / variant count: {variantCount}</p>
        <p className="cardMeta">Excluded non-industry count: {excludedCount}</p>
        <p className="cardMeta">Coverage status: {canonicalReadiness}</p>
        <p className="cardMeta">Readiness for Sector Mapping: {canonicalReadiness}</p>
        <details>
          <summary className="cardMeta">Open canonical detail table</summary>
          <div className="tableWrap" style={{ marginTop: "0.6rem" }}>
            <table>
              <thead>
                <tr>
                  <th>Industry Name</th>
                  <th>Coverage Status</th>
                  <th>Source Datasets</th>
                  <th>Missing Core Datasets</th>
                  <th>Canonical Status</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {canonicalRows.map((row) => (
                  <tr key={row.id}>
                    <td>{row.industryName}</td>
                    <td>{row.coverageStatus}</td>
                    <td>{row.sourceDatasets.join(", ") || "None"}</td>
                    <td>{row.missingCoreDatasets.join(", ") || "None"}</td>
                    <td>{row.canonicalStatus}</td>
                    <td>{row.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      </div>

      <div className="panel">
        <h3 className="cardTitle">Advanced (Collapsed)</h3>
        <details>
          <summary className="cardMeta">Open import details</summary>
          <p className="cardMeta" style={{ marginTop: "0.6rem" }}>
            Import summary: Attempted {importSummaryResult.data.datasetsAttempted}, imported{" "}
            {importSummaryResult.data.datasetsImported.length}, missing{" "}
            {importSummaryResult.data.datasetsMissing.length}, failed{" "}
            {importSummaryResult.data.datasetsFailed.length}.
          </p>
          <p className="cardMeta">Raw rows imported: {importSummaryResult.data.rawRowsImported}</p>
          <p className="cardMeta">
            Extra / unregistered local files:{" "}
            {importSummaryResult.data.extraUnregisteredFiles.length > 0
              ? importSummaryResult.data.extraUnregisteredFiles.join(", ")
              : "None"}
          </p>
        </details>
      </div>
    </section>
  );
}
