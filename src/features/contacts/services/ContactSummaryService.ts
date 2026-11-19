import { apiClient } from "@/infrastructure/api/client";
import type { ContactSummary } from "@/features/contacts/types/contactSummary.types";

export const ContactSummaryService = {
  /**
   * GET /contacts/{id}/summary/ — the stored summary, or `null` when none was
   * generated yet (the backend answers 204). Never costs a model request.
   */
  async getLatest(contactId: string): Promise<ContactSummary | null> {
    const response = await apiClient.get<ContactSummary | "">(`/contacts/${contactId}/summary/`);
    if (response.status === 204 || !response.data) return null;
    return response.data;
  },

  /**
   * POST /contacts/{id}/summary/ — asks the backend to write a fresh summary.
   * The backend stores it and permanently deletes the previous one. Every
   * call costs one model request, so it only runs on a user click.
   */
  async generate(contactId: string): Promise<ContactSummary> {
    const { data } = await apiClient.post<ContactSummary>(`/contacts/${contactId}/summary/`, {});
    return data;
  },
};
