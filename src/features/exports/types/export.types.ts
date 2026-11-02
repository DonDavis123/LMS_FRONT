import type { FilterCondition } from "@/shared/components/FilterBar";
import type { SortState } from "@/shared/types/sort";

/** The lists the backend can export: `GET /api/exports/<entity>/`. */
export type ExportEntity = "leads" | "accounts" | "contacts" | "tasks" | "calls" | "meetings";

/** `?format=` accepted by the backend. */
export type ExportFormat = "csv" | "xlsx";

/** One export may hold at most this many rows (MAX_EXPORT_ROWS on the backend). */
export const MAX_EXPORT_ROWS = 10_000;

/** What is on screen: the export contains every row that matches it, on all pages. */
export interface ExportQuery {
  search?: string;
  filters?: FilterCondition[];
  sort?: SortState | null;
}

export interface ExportedFile {
  blob: Blob;
  fileName: string;
}
