import { apiClient } from "@/infrastructure/api/client";
import {
  PICKLIST_MODULE,
  type DeletePicklistOptionResult,
  type LeadPicklistField,
  type PicklistField,
  type PicklistModuleResponse,
  type PicklistOption,
  type UpdatePicklistOptionPayload,
} from "@/features/picklists/types/picklist.types";

const BASE = `/picklists/${PICKLIST_MODULE}`;

export const PicklistService = {
  /**
   * GET /picklists/leads/ — every dropdown of the Leads module.
   * Without `includeInactive` only active options come back (any company user).
   * With it, hidden options and usage counts are included (superadmin only).
   */
  async getLeadPicklists(includeInactive = false): Promise<PicklistField[]> {
    const { data } = await apiClient.get<PicklistModuleResponse>(`${BASE}/`, {
      params: includeInactive ? { include_inactive: true } : undefined,
    });

    if (!data || !Array.isArray(data.fields)) {
      throw new Error("Invalid dropdown options response from the server.");
    }
    return data.fields;
  },

  /** POST /picklists/leads/{field}/create/ — appended after the existing options. */
  async createOption(field: LeadPicklistField, value: string): Promise<PicklistOption> {
    const { data } = await apiClient.post<PicklistOption>(`${BASE}/${field}/create/`, { value });
    return data;
  },

  /**
   * PATCH /picklists/options/{id}/update/ — rename and/or show/hide.
   * Renaming also moves every lead that uses the option to the new text.
   * The response has `usage_count: null`, so callers keep the count they had.
   */
  async updateOption(id: string, payload: UpdatePicklistOptionPayload): Promise<PicklistOption> {
    const { data } = await apiClient.patch<PicklistOption>(
      `/picklists/options/${id}/update/`,
      payload,
    );
    return data;
  },

  /**
   * DELETE /picklists/options/{id}/delete/[?replace_with=<option id>].
   * An option that leads still use is refused with 409 `OPTION_IN_USE`
   * unless a replacement is given; those leads are then moved to it.
   */
  async deleteOption(id: string, replaceWith?: string): Promise<DeletePicklistOptionResult> {
    const { data } = await apiClient.delete<Partial<DeletePicklistOptionResult> | undefined>(
      `/picklists/options/${id}/delete/`,
      { params: replaceWith ? { replace_with: replaceWith } : undefined },
    );
    return {
      message: data?.message ?? "Option deleted successfully.",
      records_updated: data?.records_updated ?? 0,
    };
  },

  /**
   * PUT /picklists/leads/{field}/reorder/ — the body must list EVERY option of
   * the field (hidden ones and the built-in "None" included) exactly once.
   */
  async reorderOptions(field: LeadPicklistField, orderedIds: string[]): Promise<void> {
    await apiClient.put(`${BASE}/${field}/reorder/`, { ordered_ids: orderedIds });
  },
};
