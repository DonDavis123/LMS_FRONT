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
    const { data } = await apiClient.get<PaginatedResponse<Contact> | Contact[]>("/contacts/", {
      params: toListQueryParams(params),
    });

    if (Array.isArray(data)) {
      const page = params.page ?? 1;
      const pageSize = params.page_size ?? 10;
      const total = data.length;
      return {
        results: data,
        pagination: {
          page,
          page_size: pageSize,
          total,
          total_pages: total === 0 ? 0 : Math.ceil(total / pageSize),
        },
      };
    }

    if (data && Array.isArray(data.results) && data.pagination) {
      return data;
    }

    throw new Error("Invalid contacts response from the server.");
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
