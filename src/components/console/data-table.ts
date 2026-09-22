/** Column definition shared by the demo's tables — mirrors the real console's ColumnDef shape. */
export interface Column<Row> {
  key: string;
  title: string;
  sortable?: boolean;
  align?: "start" | "end";
  class?: string;
  /** Value used for sorting and for the default cell rendering. */
  value?: (row: Row) => string | number;
}
