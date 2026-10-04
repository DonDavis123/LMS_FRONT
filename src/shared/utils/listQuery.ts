import type { FilterCondition } from "@/shared/components/FilterBar";
import type { SortState } from "@/shared/types/sort";

export interface ListQueryParams {
  page?: number;
  page_size?: number;
  filters?: FilterCondition[];
  /** Free-text search, sent as `search`. Blank/whitespace is omitted. */
  search?: string;
  /** `null`/omitted keeps the backend default: newest records first. */
  sort?: SortState | null;
}

export function toListQueryParams(params: ListQueryParams): Record<string, string | number> {
  const query: Record<string, string | number> = {
    page: params.page ?? 1,
    page_size: params.page_size ?? 10,
  };

  if (params.filters && params.filters.length > 0) {
    query.filters = JSON.stringify(params.filters);
  }

  const search = params.search?.trim();
  if (search) {
    query.search = search;
  }

  if (params.sort) {
    query.sort_by = params.sort.field;
    query.sort_direction = params.sort.direction;
  }

  return query;
}
