import Link from "next/link";
import { getDamodaranDatasetDetailPaginated } from "@/lib/firestore/repositories/damodaranDataRepository";

export const dynamic = "force-dynamic";

interface DamodaranDatasetDetailPageProps {
  params: Promise<{
    datasetId: string;
  }>;
  searchParams?: Promise<{
    q?: string;
    page?: string;
    pageSize?: string;
  }>;
}

export default async function DamodaranDatasetDetailPage({
  params,
  searchParams,
}: DamodaranDatasetDetailPageProps) {
  const { datasetId } = await params;
  const detailParams = (await searchParams) ?? {};
  const query = (detailParams.q ?? "").trim().toLowerCase();
  const page = Math.max(1, Number(detailParams.page ?? "1") || 1);
  const requestedPageSize = Math.max(1, Number(detailParams.pageSize ?? "50") || 50);
  const pageSize = Math.min(100, requestedPageSize);
  const detailResult = await getDamodaranDatasetDetailPaginated(datasetId, {
    q: query,
    page,
    pageSize,
  });
  const dataset = detailResult.data.dataset;
  const rawRows = detailResult.data.rawRows;
  const totalRows = detailResult.data.totalRows;
  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));
  const currentPage = Math.min(page, totalPages);

  if (!dataset) {
    return (
      <section className="pageSection">
        <div>
          <h2 className="sectionHeading">Damodaran Dataset Detail</h2>
          <p className="sectionSubheading">Dataset not found.</p>
          <p>
            <Link href="/data-hub/damodaran-data">Back to Damodaran Data Vault</Link>
          </p>
        </div>
      </section>
    );
  }

  const previewRows = rawRows;
  const detectedColumns =
    dataset.detectedColumns && dataset.detectedColumns.length > 0
      ? dataset.detectedColumns
      : Array.from(new Set(rawRows.flatMap((row) => Object.keys(row.values))));

  return (
    <section className="pageSection">
      <div>
        <p>
          <Link href="/data-hub/damodaran-data">Back to Damodaran Data Vault</Link>
        </p>
        <h2 className="sectionHeading">{dataset.datasetName}</h2>
        <p className="sectionSubheading">
          Updated: {dataset.sourceUpdateDate} | Status: {dataset.importStatus} | Rows:{" "}
          {dataset.rowCount} | Industries: {dataset.industryCount}
        </p>
        <p className="cardMeta">
          Data Source: {detailResult.source === "firestore" ? "Firestore" : "Local Cache Fallback"}
        </p>
      </div>

      <div className="panel">
        <h3 className="cardTitle">Raw Damodaran Table</h3>
        <form method="GET" style={{ marginBottom: "0.6rem" }}>
          <input
            type="text"
            name="q"
            defaultValue={detailParams.q ?? ""}
            placeholder="Search industry name"
          />
          <button type="submit" className="navLink" style={{ marginLeft: "0.5rem" }}>
            Apply
          </button>
        </form>
        <p className="cardMeta">
          Showing page {currentPage} / {totalPages} ({previewRows.length} rows on page, {totalRows} matching rows).
        </p>
        <div className="tableWrap" style={{ marginTop: "0.65rem" }}>
          <table>
            <thead>
              <tr>
                <th>Industry Name</th>
                {detectedColumns.map((column) => (
                  <th key={column}>{column}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {previewRows.length === 0 ? (
                <tr>
                  <td colSpan={detectedColumns.length + 1}>
                    No rows imported for this dataset. Run Damodaran Data refresh.
                  </td>
                </tr>
              ) : (
                previewRows.map((row) => (
                  <tr key={row.id}>
                    <td>{row.industryName}</td>
                    {detectedColumns.map((column) => (
                      <td key={`${row.id}-${column}`}>
                        {row.values[column] === null || row.values[column] === undefined
                          ? ""
                          : String(row.values[column])}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div style={{ marginTop: "0.65rem", display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
          {currentPage > 1 ? (
            <Link
              href={`/data-hub/damodaran-data/${datasetId}?q=${encodeURIComponent(query)}&page=${currentPage - 1}&pageSize=${pageSize}`}
            >
              Previous
            </Link>
          ) : null}
          {currentPage < totalPages ? (
            <Link
              href={`/data-hub/damodaran-data/${datasetId}?q=${encodeURIComponent(query)}&page=${currentPage + 1}&pageSize=${pageSize}`}
            >
              Next
            </Link>
          ) : null}
        </div>
      </div>

      <div className="panel">
        <details>
          <summary className="cardMeta">Show Source Metadata</summary>
          <p className="cardMeta" style={{ marginTop: "0.6rem" }}>
            File Name: {dataset.fileName}
          </p>
          <p className="cardMeta">Data Category: {dataset.dataCategory}</p>
          <p className="cardMeta">Priority: {dataset.priority}</p>
          <p className="cardMeta">Used By: {dataset.usedBy}</p>
          <p className="cardMeta">
            Source URL:{" "}
            <a href={dataset.sourceUrl} target="_blank" rel="noreferrer">
              {dataset.sourceUrl}
            </a>
          </p>
          <p className="cardMeta">
            Download URL:{" "}
            <a href={dataset.downloadUrl} target="_blank" rel="noreferrer">
              {dataset.downloadUrl}
            </a>
          </p>
          <p className="cardMeta">Source / Update Date: {dataset.sourceUpdateDate}</p>
          <p className="cardMeta">
            Imported / Last Updated: {dataset.importedLastUpdated ?? "Not imported"}
          </p>
          <p className="cardMeta">
            Detected Columns: {detectedColumns.length > 0 ? detectedColumns.join(", ") : "None"}
          </p>
          <p className="cardMeta">Notes: {dataset.notes}</p>
        </details>
      </div>
    </section>
  );
}
