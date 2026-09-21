import type { PaginatedResponse } from "@/shared/types/pagination";
import { toListQueryParams, type ListQueryParams } from "@/shared/utils/listQuery";
import { apiClient } from "@/infrastructure/api/client";
import type {
  ConversionCheckResponse,
  ConvertLeadPayload,
  CreateLeadPayload,
  Lead,
  UpdateLeadPayload,
} from "@/features/leads/types/lead.types";

export const LeadService = {
  async getLeadsPage(params: ListQueryParams = {}): Promise<PaginatedResponse<Lead>> {
    const { data } = await apiClient.get<PaginatedResponse<Lead>>("/leads/", {
      params: toListQueryParams(params),
    });
    return data;
  },

  // Compatibility method for existing pickers/forms that need a plain array.
  // List pages must use getLeadsPage() so pagination metadata is preserved.
  async getLeads(): Promise<Lead[]> {
    const data = await this.getLeadsPage({ page: 1, page_size: 50 });
    return data.results;
  },

  async getLead(id: string): Promise<Lead> {
    const { data } = await apiClient.get<Lead>(`/leads/${id}/`);
    return data;
  },

  async createLead(payload: CreateLeadPayload): Promise<Lead> {
    const { data } = await apiClient.post<Lead>("/leads/create/", payload);
    return data;
  },

  async updateLead(id: string, payload: UpdateLeadPayload): Promise<Lead> {
    const { data } = await apiClient.patch<Lead>(`/leads/${id}/update/`, payload);
    return data;
  },

  /**
   * GET /leads/{id}/conversion-check/ — looks for existing Accounts/Contacts
   * that match this lead (by name/email) so the Convert screen can offer
   * "use existing" instead of always creating a duplicate.
   */
  async checkConversion(id: string): Promise<ConversionCheckResponse> {
    const { data } = await apiClient.get<ConversionCheckResponse>(
      `/leads/${id}/conversion-check/`
    );
    return data;
  },

  /**
   * POST /leads/{id}/convert/. Returns the backend's own confirmation
   * message when it sends one.
   */
  async convertLead(id: string, payload: ConvertLeadPayload): Promise<string> {
    const { data } = await apiClient.post<{ message?: string; detail?: string } | undefined>(
      `/leads/${id}/convert/`,
      payload
    );
    return data?.message ?? data?.detail ?? "Lead converted successfully";
  },

  /**
   * Returns the backend's own confirmation message when it sends one
   * (e.g. `{ "message": "Lead deleted successfully" }` or
   * `{ "detail": "..." }`). Falls back to a sensible default only if the
   * backend responds with no body (e.g. a bare 204 No Content).
   */
  async deleteLead(id: string): Promise<string> {
    const { data } = await apiClient.delete<{ message?: string; detail?: string } | undefined>(
      `/leads/${id}/delete/`
    );
    return data?.message ?? data?.detail ?? "Lead deleted successfully";
  },
};
