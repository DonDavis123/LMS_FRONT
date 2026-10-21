import { apiClient } from "@/infrastructure/api/client";
import type { FilterCondition } from "@/shared/components/FilterBar";
import type { PaginatedResponse } from "@/shared/types/pagination";
import type { SortState } from "@/shared/types/sort";
import { toListQueryParams } from "@/shared/utils/listQuery";
import type {
  Call,
  CallDetail,
  CallRecordHistory,
  CallRecordRow,
  CreateCallPayload,
  UpdateCallPayload,
} from "@/features/calls/types/call.types";

const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 50;

interface CallListResponse {
  results: Call[];
  pagination: PaginatedResponse<Call>["pagination"];
}

interface CallRecordListResponse {
  results: CallRecordRow[];
  pagination: PaginatedResponse<CallRecordRow>["pagination"];
}

/** Which record a call list is scoped to (a lead's or a contact's calls). */
export type CallRecordKind = "lead" | "contact";

export const CallService = {
  async getCallsPage(
    page = 1,
    pageSize = DEFAULT_PAGE_SIZE,
    sort: SortState | null = null,
    filters: FilterCondition[] = [],
  ): Promise<PaginatedResponse<Call>> {
    const { data } = await apiClient.get<CallListResponse>("/calls/", {
      params: toListQueryParams({
        page,
        page_size: Math.min(pageSize, MAX_PAGE_SIZE),
        sort,
        filters,
      }),
    });

    return { results: data.results, pagination: data.pagination };
  },

  /**
   * The Calls table: one row per lead / contact (its latest call, call count
   * and latest update). Most recently logged-or-edited record first by default.
   */
  async getCallRecordsPage(
    page = 1,
    pageSize = DEFAULT_PAGE_SIZE,
    sort: SortState | null = null,
    filters: FilterCondition[] = [],
  ): Promise<PaginatedResponse<CallRecordRow>> {
    const { data } = await apiClient.get<CallRecordListResponse>("/calls/records/", {
      params: toListQueryParams({
        page,
        page_size: Math.min(pageSize, MAX_PAGE_SIZE),
        sort,
        filters,
      }),
    });

    return { results: data.results, pagination: data.pagination };
  },

  /** Calls logged on one lead or contact, newest first by default. */
  async getCallsForRecord(
    kind: CallRecordKind,
    recordId: string,
    page = 1,
    pageSize = DEFAULT_PAGE_SIZE,
  ): Promise<PaginatedResponse<Call>> {
    return this.getCallsPage(page, pageSize, null, [
      { field: kind === "lead" ? "lead_id" : "contact_id", operator: "equals", value: recordId },
    ]);
  },

  /** Full detail: the call, its change history and the other calls on the same record. */
  async getCall(id: string): Promise<CallDetail> {
    const { data } = await apiClient.get<CallDetail>(`/calls/${id}/`);
    return data;
  },

  /** Detailed history of every call on the same lead / contact as `id`. */
  async getCallRecordHistory(id: string): Promise<CallRecordHistory> {
    const { data } = await apiClient.get<CallRecordHistory>(`/calls/${id}/history/`);
    return data;
  },

  async createCall(payload: CreateCallPayload): Promise<Call> {
    const { data } = await apiClient.post<Call>("/calls/", payload);
    return data;
  },

  async updateCall(id: string, payload: UpdateCallPayload): Promise<Call> {
    const { data } = await apiClient.patch<Call>(`/calls/${id}/`, payload);
    return data;
  },

  async deleteCall(id: string): Promise<string> {
    const { data } = await apiClient.delete<{ message?: string; detail?: string }>(`/calls/${id}/`);
    return data.message ?? data.detail ?? "Call deleted successfully";
  },
};
