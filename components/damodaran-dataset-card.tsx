import { ClickableCardLink } from "@/components/clickable-card";
import type { DamodaranDatasetRegisterRow } from "@/lib/types";

function badgeClassName(classification: DamodaranDatasetRegisterRow["classification"]) {
  if (classification === "Pricing Sanity Only") {
    return "damodaranBadge damodaranBadgeSanity";
  }
  if (classification === "Missing / Deferred") {
    return "damodaranBadge damodaranBadgeDeferred";
  }
  if (
    classification === "Core Required" ||
    classification === "Core Support" ||
    classification === "Strong Support"
  ) {
    return "damodaranBadge damodaranBadgeCore";
  }
  return "damodaranBadge";
}

export function DamodaranDatasetCard({ row }: { row: DamodaranDatasetRegisterRow }) {
  return (
    <ClickableCardLink
      key={row.id}
      href={`/data-hub/damodaran-data/${row.id}`}
      title={`${row.workbookTableName} — ${row.datasetName}`}
    >
      <h3 className="cardTitle">{row.workbookTableName}</h3>
      <p className="cardMeta">{row.datasetName}</p>
      <div className="damodaranBadgeRow">
        <span className={badgeClassName(row.classification)}>{row.classification}</span>
        {row.pricingSanityOnly ? (
          <span className="damodaranBadge damodaranBadgeSanity">Sanity Only</span>
        ) : null}
      </div>
      <p className="cardMeta">File: {row.fileName}</p>
      <p className="cardMeta">Source updated: {row.sourceUpdateDate}</p>
      <p className="cardMeta">
        Imported: {row.importedLastUpdated ? row.importedLastUpdated : "Not imported"}
      </p>
      <p className="cardMeta">Status: {row.importStatus}</p>
      <p className="cardMeta">Rows: {row.rowCount > 0 ? row.rowCount : "No rows imported"}</p>
      {row.roicSupportNote ? <p className="cardMeta">{row.roicSupportNote}</p> : null}
    </ClickableCardLink>
  );
}
