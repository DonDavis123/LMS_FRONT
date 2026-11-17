import { apiClient } from "@/infrastructure/api/client";
import type { LeadSummary } from "@/features/leads/types/leadSummary.types";

export const LeadSummaryService = {
  /**
   * POST /leads/{id}/summary/ — asks the backend to write a fresh summary.
   * Every call costs one model request, so it only runs on a user click.
   */
  async generate(leadId: string): Promise<LeadSummary> {
    const { data } = await apiClient.post<LeadSummary>(`/leads/${leadId}/summary/`, {});
    return data;
  },
};
