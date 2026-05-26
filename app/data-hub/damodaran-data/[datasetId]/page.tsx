import Link from "next/link";
import { BackLink } from "@/components/back-link";
import { FormattedTableCell } from "@/components/formatted-table-cell";
import { getDamodaranDatasetDetailPaginated } from "@/lib/firestore/repositories/damodaranDataRepository";
import { formatColumnHeader } from "@/lib/utils/formatters";

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
        <BackLink href="/data-hub/damodaran-data" label="Back to Damodaran Data" />
        <div>
          <h2 className="sectionHeading">Damodaran Dataset Detail</h2>
          <p className="sectionSubheading">Dataset not found.</p>
        </div>
      </section>
    );
  }

  const previewRows = rawRows;
  const detectedColumns =
    dataset.detectedColumns && dataset.detectedColumns.length > 0
      ? dataset.detectedColumns
      : Array.from(new Set(rawRows.flatMap((row) => Object.keys(row.values))));

  const isRatingsDataset = dataset.id === "damodaran_ratings";
  const isDeferred = dataset.isDeferredPlaceholder || dataset.importStatus === "Missing / Deferred";

  return (
    <section className="pageSection">
      <BackLink href="/data-hub/damodaran-data" label="Back to Damodaran Data" />
      <div>
        <h2 className="sectionHeading">{dataset.workbookTableName}</h2>
        <p className="sectionSubheading">{dataset.datasetName}</p>
        <div className="damodaranBadgeRow">
          <span className="damodaranBadge damodaranBadgeCore">{dataset.classification}</span>
          {dataset.pricingSanityOnly ? (
            <span className="damodaranBadge damodaranBadgeSanity">Sanity Only</span>
          ) : null}
          {isDeferred ? (
            <span className="damodaranBadge damodaranBadgeDeferred">Missing / Deferred</span>
          ) : null}
        </div>
        <p className="cardMeta">
          Updated: {dataset.sourceUpdateDate} | Status: {dataset.importStatus} | Rows:{" "}
          {dataset.rowCount} | Industries: {dataset.industryCount}
        </p>
        <p className="cardMeta">
          Data Source: {detailResult.source === "firestore" ? "Firestore" : "Local Cache Fallback"}
        </p>
        {dataset.roicSupportNote ? <p className="cardMeta">{dataset.roicSupportNote}</p> : null}
      </div>

      {isRatingsDataset ? (
        <div className="panel">
          <h3 className="cardTitle">Synthetic Rating / ICR Reference (tblRatingsSpreadsICR)</h3>
          <p className="cardMeta">
            Semantic table: tblSyntheticRatingSpreads / tblRatingsSpreadsICR. Reference table for
            future Cost of Debt / synthetic rating support. No WACC math is calculated here.
          </p>
          <p className="cardMeta">
            Detected columns ({detectedColumns.length}):{" "}
            {detectedColumns.length > 0 ? detectedColumns.join(", ") : "Run import to detect columns"}
          </p>
        </div>
      ) : null}

      {isDeferred ? (
        <div className="panel">
          <h3 className="cardTitle">Deferred Dataset</h3>
          <p className="cardMeta">
            {dataset.notes} Required action: add {dataset.fileName} to data/damodaran/raw/ when
            available. This dataset does not block core Beta/WACC readiness.
          </p>
        </div>
      ) : (
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
            Showing page {currentPage} / {totalPages} ({previewRows.length} rows on page, {totalRows}{" "}
            matching rows).
          </p>
          <div className="tableWrap" style={{ marginTop: "0.65rem" }}>
            <table>
              <thead>
                <tr>
                  <th>Industry Name</th>
                  {detectedColumns.map((column) => (
                    <th key={column}>
                      {formatColumnHeader(column, {
                        currency: dataset.dataCategory.toLowerCase().includes("us")
                          ? "USD"
                          : undefined,
                      })}
                    </th>
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
                        <FormattedTableCell
                          value={row.values[column]}
                          columnName={column}
                          datasetContext={`${dataset.datasetName} ${dataset.workbookTableName}`}
                        />
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
      )}

      <div className="panel">
        <details open={isRatingsDataset}>
          <summary className="cardMeta">Show Source Metadata</summary>
          <p className="cardMeta" style={{ marginTop: "0.6rem" }}>
            Workbook Table: {dataset.workbookTableName}
          </p>
          <p className="cardMeta">File Name: {dataset.fileName}</p>
          <p className="cardMeta">Data Category: {dataset.dataCategory}</p>
          <p className="cardMeta">Classification: {dataset.classification}</p>
          <p className="cardMeta">Priority: {dataset.priority}</p>
          <p className="cardMeta">Blocks core readiness: {dataset.blocksCoreReadiness ? "Yes" : "No"}</p>
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
          {dataset.pricingSanityOnly ? (
            <p className="cardMeta">
              Pricing sanity only — must not feed official intrinsic value outputs.
            </p>
          ) : null}
        </details>
      </div>
    </section>
  );
}
