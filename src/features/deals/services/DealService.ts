import type { PaginatedResponse } from "@/shared/types/pagination";
import { toListQueryParams, type ListQueryParams } from "@/shared/utils/listQuery";
import { apiClient } from "@/infrastructure/api/client";
import type {
  BoardColumn,
  BoardParams,
  BoardResponse,
  CreateDealPayload,
  Deal,
  Forecast,
  ForecastParams,
  MoveDealPayload,
  UpdateDealPayload,
} from "@/features/deals/types/deal.types";
import { DEAL_STAGES, STAGE_META } from "@/features/deals/utils/dealStages";

/** Drops blank values so they never reach the query string. */
function cleanParams(params: object): Record<string, string | number> {
  const out: Record<string, string | number> = {};
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    out[key] = value as string | number;
  }
  return out;
}

/** Always returns the five stages, in pipeline order, even if one is missing from the response. */
function normalizeBoard(data: BoardResponse): BoardColumn[] {
  const byStage = new Map((data?.stages ?? []).map((column) => [column.stage, column]));
  return DEAL_STAGES.map(
    (stage): BoardColumn =>
      byStage.get(stage) ?? {
        stage,
        default_probability: STAGE_META[stage].defaultProbability,
        count: 0,
        total_amount: "0.00",
        weighted_amount: "0.00",
        has_more: false,
        deals: [],
      },
  );
}

/**
 * Backend endpoints (all under /api/deals/):
 *   GET  /deals/            list   (page, page_size, filters, sort)
 *   POST /deals/            create
 *   GET/PATCH/DELETE /deals/{id}/
 *   POST /deals/{id}/move/  change stage (lost_reason required for "Lost")
 *   GET  /deals/board/      Kanban columns
 *   GET  /deals/forecast/   pipeline + weighted forecast
 * Paths are built inline per call, same convention as TaskService.
 */
export const DealService = {
  async getDealsPage(params: ListQueryParams = {}): Promise<PaginatedResponse<Deal>> {
    const { data } = await apiClient.get<PaginatedResponse<Deal>>("/deals/", {
      params: toListQueryParams(params),
    });
    return data;
  },

  async getDeal(id: string): Promise<Deal> {
    const { data } = await apiClient.get<Deal>(`/deals/${id}/`);
    return data;
  },

  async createDeal(payload: CreateDealPayload): Promise<Deal> {
    const { data } = await apiClient.post<Deal>("/deals/", payload);
    return data;
  },

  async updateDeal(id: string, payload: UpdateDealPayload): Promise<Deal> {
    const { data } = await apiClient.patch<Deal>(`/deals/${id}/`, payload);
    return data;
  },

  /** Returns the backend's own confirmation message when it sends one. */
  async deleteDeal(id: string): Promise<string> {
    const { data } = await apiClient.delete<{ message?: string; detail?: string } | undefined>(
      `/deals/${id}/`,
    );
    return data?.message ?? data?.detail ?? "Deal deleted successfully";
  },

  async moveDeal(id: string, payload: MoveDealPayload): Promise<Deal> {
    const { data } = await apiClient.post<Deal>(`/deals/${id}/move/`, payload);
    return data;
  },

  async getBoard(params: BoardParams = {}): Promise<BoardColumn[]> {
    const { data } = await apiClient.get<BoardResponse>("/deals/board/", {
      params: cleanParams(params),
    });
    return normalizeBoard(data);
  },

  async getForecast(params: ForecastParams = {}): Promise<Forecast> {
    const { data } = await apiClient.get<Forecast>("/deals/forecast/", {
      params: cleanParams(params),
    });
    return data;
  },
};
