import { apiClient } from "@/infrastructure/api/client";
import type { AccountSummary } from "@/features/accounts/types/accountSummary.types";

export const AccountSummaryService = {
  /**
   * GET /accounts/{id}/summary/ — the stored summary, or `null` when none was
   * generated yet (the backend answers 204). Never costs a model request.
   */
  async getLatest(accountId: string): Promise<AccountSummary | null> {
    const response = await apiClient.get<AccountSummary | "">(`/accounts/${accountId}/summary/`);
    if (response.status === 204 || !response.data) return null;
    return response.data;
  },

  /**
   * POST /accounts/{id}/summary/ — asks the backend to write a fresh summary.
   * The backend stores it and permanently deletes the previous one. Every
   * call costs one model request, so it only runs on a user click.
   */
  async generate(accountId: string): Promise<AccountSummary> {
    const { data } = await apiClient.post<AccountSummary>(`/accounts/${accountId}/summary/`, {});
    return data;
  },
};
