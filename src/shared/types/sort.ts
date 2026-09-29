export type SortDirection = "asc" | "desc";

export interface SortState {
  /** Backend sort key for the column — never the UI label. */
  field: string;
  direction: SortDirection;
}
