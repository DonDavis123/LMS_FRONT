import type { PaginatedResponse } from "@/shared/types/pagination";
import { toListQueryParams, type ListQueryParams } from "@/shared/utils/listQuery";
import { apiClient } from "@/infrastructure/api/client";
import type {
  CreateContactPayload,
  Contact,
  UpdateContactPayload,
} from "@/features/contacts/types/contact.types";

export const ContactService = {
  async getContactsPage(params: ListQueryParams = {}): Promise<PaginatedResponse<Contact>> {
    const { data } = await apiClient.get<PaginatedResponse<Contact>>("/contacts/", {
      params: toListQueryParams(params),
    });
    return data;
  },

  // Compatibility method for existing pickers/forms that need a plain array.
  // List pages must use getContactsPage() so pagination metadata is preserved.
  async getContacts(): Promise<Contact[]> {
    const data = await this.getContactsPage({ page: 1, page_size: 50 });
    return data.results;
  },

  async getContact(id: string): Promise<Contact> {
    const { data } = await apiClient.get<Contact>(`/contacts/${id}/`);
    return data;
  },

  async createContact(payload: CreateContactPayload): Promise<Contact> {
    const { data } = await apiClient.post<Contact>("/contacts/create/", payload);
    return data;
  },

  async updateContact(id: string, payload: UpdateContactPayload): Promise<Contact> {
    const { data } = await apiClient.patch<Contact>(`/contacts/${id}/update/`, payload);
    return data;
  },

  /**
   * Returns the backend's own confirmation message when it sends one
   * (e.g. `{ "message": "Contact deleted successfully" }` or
   * `{ "detail": "..." }`). Falls back to a sensible default only if the
   * backend responds with no body (e.g. a bare 204 No Content).
   */
  async deleteContact(id: string): Promise<string> {
    const { data } = await apiClient.delete<{ message?: string; detail?: string } | undefined>(
      `/contacts/${id}/delete/`
    );
    return data?.message ?? data?.detail ?? "Contact deleted successfully";
  },
};
