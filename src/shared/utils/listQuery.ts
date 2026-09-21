import type { FilterCondition } from "@/shared/components/FilterBar";

export interface ListQueryParams {
  page?: number;
  page_size?: number;
  filters?: FilterCondition[];
}

export function toListQueryParams(params: ListQueryParams): Record<string, string | number> {
  const query: Record<string, string | number> = {
    page: params.page ?? 1,
    page_size: params.page_size ?? 10,
  };

  if (params.filters && params.filters.length > 0) {
    query.filters = JSON.stringify(params.filters);
  }

  return query;
}
