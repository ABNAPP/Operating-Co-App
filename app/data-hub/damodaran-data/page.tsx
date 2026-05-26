import { BackLink } from "@/components/back-link";
import { DamodaranDatasetCard } from "@/components/damodaran-dataset-card";
import {
  DAMODARAN_COUNTRY_RISK_UPDATE_DATE,
  DAMODARAN_SOURCE_NAME,
  DAMODARAN_SOURCE_UPDATE_DATE,
  DAMODARAN_SOURCE_URL,
  isReadinessBlockingDataset,
} from "@/lib/data-hub/damodaranDatasetRegistry";
import { crossCheckDamodaranIndustryUniverse } from "@/lib/data-hub/damodaranIndustryUniverseCrossCheck";
import { summarizePullKeyResolutions } from "@/lib/data-hub/damodaranPullKeyResolver";
import {
  getCanonicalDamodaranIndustries,
  getDamodaranDatasetRegister,
  getDamodaranImportSummary,
  refreshCanonicalDamodaranIndustryList,
} from "@/lib/firestore/repositories/damodaranDataRepository";
import { getBenchmarkDataPullKeysTable, getDamodaranIndustryUniverse } from "@/lib/firestore/repositories/sectorIndustryMappingRepository";
import type { DamodaranDatasetRegisterRow, DamodaranImportSummary } from "@/lib/types";

export const dynamic = "force-dynamic";

function normalizeImportSummary(data: Partial<DamodaranImportSummary> | undefined): DamodaranImportSummary {
  return {
    success: data?.success ?? false,
    startedAt: data?.startedAt ?? "",
    finishedAt: data?.finishedAt ?? "",
    datasetsAttempted: data?.datasetsAttempted ?? 0,
    datasetsImported: data?.datasetsImported ?? [],
    datasetsMissing: data?.datasetsMissing ?? [],
    datasetsFailed: data?.datasetsFailed ?? [],
    rawRowsImported: data?.rawRowsImported ?? 0,
    industryCount: data?.industryCount ?? 0,
    coverageMatrixRows: data?.coverageMatrixRows ?? 0,
    extraUnregisteredFiles: data?.extraUnregisteredFiles ?? [],
    warnings: data?.warnings ?? [],
    errors: data?.errors ?? [],
  };
}

function groupDatasets(rows: DamodaranDatasetRegisterRow[]) {
  return {
    coreRequired: rows.filter((row) => row.classification === "Core Required"),
    coreSupport: rows.filter((row) => row.classification === "Core Support"),
    strongSupport: rows.filter((row) => row.classification === "Strong Support"),
    pricingSanity: rows.filter((row) => row.classification === "Pricing Sanity Only"),
    support: rows.filter((row) => row.classification === "Support"),
    optional: rows.filter((row) => row.classification === "Optional"),
    advanced: rows.filter((row) => row.classification === "Advanced"),
    deferred: rows.filter((row) => row.classification === "Missing / Deferred"),
  };
}

function renderDatasetSection(title: string, rows: DamodaranDatasetRegisterRow[]) {
  return (
    <div className="panel">
      <h3 className="cardTitle">{title}</h3>
      {rows.length === 0 ? (
        <p className="cardMeta">No datasets in this section.</p>
      ) : (
        <div className="cardGrid">
          {rows.map((row) => (
            <DamodaranDatasetCard key={row.id} row={row} />
          ))}
        </div>
      )}
    </div>
  );
}

export default async function DamodaranDataPage() {
  const registerResult = await getDamodaranDatasetRegister();
  const importSummaryResult = await getDamodaranImportSummary();
  const importSummary = normalizeImportSummary(importSummaryResult.data);
  let canonicalResult = await getCanonicalDamodaranIndustries();
  if (canonicalResult.data.length === 0) {
    await refreshCanonicalDamodaranIndustryList();
    canonicalResult = await getCanonicalDamodaranIndustries();
  }

  const [pullKeyRows, universeRows] = await Promise.all([
    getBenchmarkDataPullKeysTable(),
    getDamodaranIndustryUniverse(),
  ]);

  const pullKeySummary = summarizePullKeyResolutions(pullKeyRows.data);
  const universeCrossCheck = crossCheckDamodaranIndustryUniverse({
    universeNames: universeRows.data.map((row) => row.damodaranIndustrialBenchmark),
    canonicalRows: canonicalResult.data,
  });

  const dataSource =
    registerResult.source === "firestore" || importSummaryResult.source === "firestore"
      ? "firestore"
      : "mock";

  const allRows = registerResult.data;
  const grouped = groupDatasets(allRows);

  const readinessBlockingRows = allRows.filter(isReadinessBlockingDataset);
  const importedReadinessRows = readinessBlockingRows.filter((row) => row.importStatus === "Imported");
  const missingReadinessRows = readinessBlockingRows.filter((row) => row.importStatus !== "Imported");

  const hasMissingLocalFiles = allRows.some((row) => row.importStatus === "Missing Local File");
  const readinessStatus = hasMissingLocalFiles
    ? "No / Missing Local Files"
    : importedReadinessRows.length === readinessBlockingRows.length && importSummary.industryCount > 0
      ? "Yes"
      : importSummary.industryCount > 0
        ? "Review"
        : "No";

  const canonicalRows = canonicalResult.data;
  const canonicalCount = canonicalRows.filter((row) => row.isCanonical).length;
  const variantCount = canonicalRows.filter((row) => row.canonicalStatus === "Duplicate / Variant").length;
  const excludedCount = canonicalRows.filter(
    (row) => row.canonicalStatus === "Excluded Non-Industry",
  ).length;
  const canonicalReadiness =
    canonicalCount >= 90 && canonicalCount <= 110 ? "Ready" : "Review (outside expected range)";

  const previewCanonicalRows = canonicalRows.slice(0, 25);

  return (
    <section className="pageSection">
      <BackLink href="/data-hub" label="Back to Data Hub" />
      <div>
        <h2 className="sectionHeading">Damodaran Industry Data Vault / Source Register</h2>
        <p className="sectionSubheading">
          v1.5 bridge-ready reference vault. Damodaran Data feeds Industry Benchmark Config pull keys
          and later Beta/WACC engine support. ISM-sector is not part of Damodaran Data logic.
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
          Imported / Last Updated: {importSummary.finishedAt || "Not imported"}
        </p>
        <p className="cardMeta">Status: {importSummary.success ? "Imported" : "Review"}</p>
        <p className="cardMeta">
          Notes: Open a dataset card to inspect stored raw rows. No valuation math is calculated in
          this module.
        </p>
        <p className="cardMeta">
          Pricing multiples datasets are sanity-only and must not drive official intrinsic value
          outputs.
        </p>
      </div>

      <div className="panel">
        <h3 className="cardTitle">Industry Benchmark Config Linkage</h3>
        <p className="cardMeta">
          Pull-key resolver maps Industry Benchmark Config key types to Damodaran dataset registry IDs.
          Benchmark row matching and numeric extraction are pending Beta/WACC phases.
        </p>
        <p className="cardMeta">Pull-key mappings evaluated: {pullKeySummary.totalMappings}</p>
        <p className="cardMeta">Ready: {pullKeySummary.readyCount}</p>
        <p className="cardMeta">Partial: {pullKeySummary.partialCount}</p>
        <p className="cardMeta">Review: {pullKeySummary.reviewCount}</p>
        <p className="cardMeta">Missing: {pullKeySummary.missingCount}</p>
        <p className="cardMeta">Sanity only: {pullKeySummary.sanityOnlyCount}</p>
        <p className="cardMeta">
          Universe cross-check — exact matches: {universeCrossCheck.exactMatches.length} /{" "}
          {universeCrossCheck.universeCount}; missing in canonical:{" "}
          {universeCrossCheck.missingInCanonical.length}; extra in canonical:{" "}
          {universeCrossCheck.extraInCanonical.length}; naming variants:{" "}
          {universeCrossCheck.namingVariants.length}
        </p>
        <p className="cardMeta">
          No valuation math (Cost of Equity, WACC, FCFF, Terminal Value, Intrinsic Value) is
          calculated here.
        </p>
      </div>

      <div className="panel">
        <h3 className="cardTitle">Readiness Summary</h3>
        <p className="cardMeta">
          Engine-support datasets imported: {missingReadinessRows.length === 0 ? "Yes" : "No"}
        </p>
        <p className="cardMeta">
          Industry master list generated: {importSummary.industryCount > 0 ? "Yes" : "No"}
        </p>
        <p className="cardMeta">Industry count: {importSummary.industryCount}</p>
        <p className="cardMeta">Coverage matrix rows: {importSummary.coverageMatrixRows}</p>
        <p className="cardMeta">Ready for Industry Benchmark Config: {readinessStatus}</p>
        {missingReadinessRows.length > 0 ? (
          <p className="cardMeta">
            Blocking core readiness (Core Required datasets):{" "}
            {missingReadinessRows.map((row) => row.fileName).join(", ")}
          </p>
        ) : (
          <p className="cardMeta">Blocking core readiness: None (all Core Required datasets imported).</p>
        )}
        <p className="cardMeta">
          Pricing sanity datasets do not block Beta/WACC readiness.
        </p>
      </div>

      {renderDatasetSection("Core Required", grouped.coreRequired)}
      {renderDatasetSection("Core Support", grouped.coreSupport)}
      {renderDatasetSection("Strong Support", grouped.strongSupport)}
      {renderDatasetSection("Pricing Sanity Only", grouped.pricingSanity)}
      {renderDatasetSection("Support", grouped.support)}
      {renderDatasetSection("Optional", grouped.optional)}
      {renderDatasetSection("Advanced", grouped.advanced)}
      {renderDatasetSection("Missing / Deferred", grouped.deferred)}

      <div className="panel">
        <h3 className="cardTitle">Industry Summary</h3>
        <p className="cardMeta">Industry Master List rows: {importSummary.industryCount}</p>
        <p className="cardMeta">Coverage Matrix rows: {importSummary.coverageMatrixRows}</p>
      </div>

      <div className="panel">
        <h3 className="cardTitle">Canonical Damodaran Industry Master List</h3>
        <p className="cardMeta">Canonical industry count: {canonicalCount}</p>
        <p className="cardMeta">Review / variant count: {variantCount}</p>
        <p className="cardMeta">Excluded non-industry count: {excludedCount}</p>
        <p className="cardMeta">Coverage status: {canonicalReadiness}</p>
        <p className="cardMeta">Readiness for Industry Benchmark Config: {canonicalReadiness}</p>
        <details>
          <summary className="cardMeta">
            Open canonical detail table (preview {previewCanonicalRows.length} of {canonicalRows.length})
          </summary>
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
                {previewCanonicalRows.map((row) => (
                  <tr key={row.id}>
                    <td>{row.industryName}</td>
                    <td>{row.coverageStatus}</td>
                    <td>{(row.sourceDatasets ?? []).join(", ") || "None"}</td>
                    <td>{(row.missingCoreDatasets ?? []).join(", ") || "None"}</td>
                    <td>{row.canonicalStatus}</td>
                    <td>{row.notes ?? ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
        <details style={{ marginTop: "0.75rem" }}>
          <summary className="cardMeta">Universe cross-check detail</summary>
          <p className="cardMeta" style={{ marginTop: "0.6rem" }}>
            Missing in canonical ({universeCrossCheck.missingInCanonical.length}):{" "}
            {universeCrossCheck.missingInCanonical.slice(0, 12).join(", ") || "None"}
            {universeCrossCheck.missingInCanonical.length > 12 ? " …" : ""}
          </p>
          <p className="cardMeta">
            Extra in canonical ({universeCrossCheck.extraInCanonical.length}):{" "}
            {universeCrossCheck.extraInCanonical.slice(0, 12).join(", ") || "None"}
            {universeCrossCheck.extraInCanonical.length > 12 ? " …" : ""}
          </p>
          <p className="cardMeta">
            Naming variants ({universeCrossCheck.namingVariants.length}):{" "}
            {universeCrossCheck.namingVariants
              .slice(0, 5)
              .map((item) => `${item.universeName} → ${item.canonicalName}`)
              .join("; ") || "None"}
          </p>
        </details>
      </div>

      <div className="panel">
        <h3 className="cardTitle">Import Details (Collapsed)</h3>
        <details>
          <summary className="cardMeta">Open import details</summary>
          <p className="cardMeta" style={{ marginTop: "0.6rem" }}>
            Import summary: Attempted {importSummary.datasetsAttempted}, imported{" "}
            {importSummary.datasetsImported.length}, missing {importSummary.datasetsMissing.length},
            failed {importSummary.datasetsFailed.length}.
          </p>
          <p className="cardMeta">Raw rows imported: {importSummary.rawRowsImported}</p>
          <p className="cardMeta">
            Extra / unregistered local files:{" "}
            {importSummary.extraUnregisteredFiles.length > 0
              ? importSummary.extraUnregisteredFiles.join(", ")
              : "None"}
          </p>
        </details>
      </div>
    </section>
  );
}
