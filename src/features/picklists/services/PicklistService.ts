import { apiClient } from "@/infrastructure/api/client";
import {
  type DeletePicklistOptionResult,
  type PicklistFieldKey,
  type PicklistModule,
  type PicklistField,
  type PicklistModuleResponse,
  type PicklistOption,
  type UpdatePicklistOptionPayload,
} from "@/features/picklists/types/picklist.types";

const base = (module: PicklistModule) => `/picklists/${module}`;

export const PicklistService = {
  /**
   * GET /picklists/leads/ — every dropdown of the Leads module.
   * Without `includeInactive` only active options come back (any company user).
   * With it, hidden options and usage counts are included (superadmin only).
   */
  async getLeadPicklists(includeInactive = false): Promise<PicklistField[]> {
    return this.getPicklists("leads", includeInactive);
  },

  /**
   * GET /picklists/{module}/ — every dropdown of Leads, Contacts or Accounts.
   * Same rules as above: hidden options + usage counts are superadmin-only.
   */
  async getPicklists(module: PicklistModule, includeInactive = false): Promise<PicklistField[]> {
    const { data } = await apiClient.get<PicklistModuleResponse>(`${base(module)}/`, {
      params: includeInactive ? { include_inactive: true } : undefined,
    });

    if (!data || !Array.isArray(data.fields)) {
      throw new Error("Invalid dropdown options response from the server.");
    }
    return data.fields;
  },

  /** POST /picklists/{module}/{field}/create/ — appended after the existing options. */
  async createOption(
    field: PicklistFieldKey,
    value: string,
    module: PicklistModule = "leads",
  ): Promise<PicklistOption> {
    const { data } = await apiClient.post<PicklistOption>(`${base(module)}/${field}/create/`, { value });
    return data;
  },

  /**
   * PATCH /picklists/options/{id}/update/ — rename and/or show/hide.
   * Renaming also moves every record that uses the option to the new text.
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
   * An option that records still use is refused with 409 `OPTION_IN_USE`
   * unless a replacement is given; those records are then moved to it.
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
   * PUT /picklists/{module}/{field}/reorder/ — the body must list EVERY option of
   * the field (hidden ones and the built-in "None" included) exactly once.
   */
  async reorderOptions(
    field: PicklistFieldKey,
    orderedIds: string[],
    module: PicklistModule = "leads",
  ): Promise<void> {
    await apiClient.put(`${base(module)}/${field}/reorder/`, { ordered_ids: orderedIds });
  },
};
