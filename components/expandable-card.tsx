"use client";

type ExpandableCardProps = {
  id: string;
  title: string;
  purpose: string;
  rowCount: number;
  isSelected: boolean;
  onSelect: (id: string) => void;
  statusLabel?: string;
  extraMeta?: string;
};

/** Expandable summary card (button); toggles table detail via parent state. */
export function ExpandableCard({
  id,
  title,
  purpose,
  rowCount,
  isSelected,
  onSelect,
  statusLabel,
  extraMeta,
}: ExpandableCardProps) {
  const hasRows = rowCount > 0;
  const status = statusLabel ?? (hasRows ? "Rows loaded" : "No rows");

  return (
    <button
      type="button"
      className={`clickableCard ${isSelected ? "clickableCardSelected" : ""}`.trim()}
      onClick={() => onSelect(isSelected ? "" : id)}
      aria-expanded={isSelected}
      aria-controls={`table-panel-${id}`}
    >
      <h3 className="cardTitle">{title}</h3>
      <p className="cardMeta">{purpose}</p>
      {extraMeta ? <p className="cardMeta">{extraMeta}</p> : null}
      <p className="cardMeta">Rows: {rowCount}</p>
      <p className="cardMeta">
        <span className={hasRows ? "badge badgeGreen" : "badge badgeRed"}>{status}</span>
      </p>
    </button>
  );
}
