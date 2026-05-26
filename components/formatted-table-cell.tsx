import { formatTableCell } from "@/lib/utils/formatters";

type FormattedTableCellProps = {
  value: unknown;
  columnName: string;
  datasetContext?: string;
};

export function FormattedTableCell({
  value,
  columnName,
  datasetContext,
}: FormattedTableCellProps) {
  return <>{formatTableCell(value, columnName, datasetContext)}</>;
}
