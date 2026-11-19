import { apiClient } from "@/infrastructure/api/client";
import type { LeadSummary } from "@/features/leads/types/leadSummary.types";

export const LeadSummaryService = {
  /**
   * GET /leads/{id}/summary/ — the stored summary, or `null` when none was
   * generated yet (the backend answers 204). Never costs a model request.
   */
  async getLatest(leadId: string): Promise<LeadSummary | null> {
    const response = await apiClient.get<LeadSummary | "">(`/leads/${leadId}/summary/`);
    if (response.status === 204 || !response.data) return null;
    return response.data;
  },

  /**
   * POST /leads/{id}/summary/ — asks the backend to write a fresh summary.
   * The backend stores it and permanently deletes the previous one. Every
   * call costs one model request, so it only runs on a user click.
   */
  async generate(leadId: string): Promise<LeadSummary> {
    const { data } = await apiClient.post<LeadSummary>(`/leads/${leadId}/summary/`, {});
    return data;
  },
};
