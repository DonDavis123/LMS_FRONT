import { apiClient } from "@/infrastructure/api/client";
import type {
  CreateAccountPayload,
  Account,
  UpdateAccountPayload,
} from "@/features/accounts/types/account.types";

export const AccountService = {
  async getAccounts(): Promise<Account[]> {
    type PaginatedResponse = {
      results: Account[];
      pagination?: {
        page: number;
        page_size: number;
        total: number;
        total_pages: number;
      };
    };

    const { data } = await apiClient.get<
      Account[] | PaginatedResponse
    >("/accounts/", {
      params: {
        page: 1,
        page_size: 50,
      },
    });

    // The backend now returns { results, pagination }.
    // Keep the service API as an array so existing pages/components
    // remain compatible.
    return Array.isArray(data) ? data : data.results;
  },

  async getAccount(id: string): Promise<Account> {
    const { data } = await apiClient.get<Account>(`/accounts/${id}/`);
    return data;
  },

  async createAccount(payload: CreateAccountPayload): Promise<Account> {
    const { data } = await apiClient.post<Account>("/accounts/create/", payload);
    return data;
  },

  // Confirmed via Postman: PUT, no trailing slash after "update".
  async updateAccount(id: string, payload: UpdateAccountPayload): Promise<Account> {
    const { data } = await apiClient.put<Account>(`/accounts/${id}/update`, payload);
    return data;
  },

  /**
   * Returns the backend's own confirmation message when it sends one
   * (e.g. `{ "message": "Account deleted successfully" }` or
   * `{ "detail": "..." }`). Falls back to a sensible default only if the
   * backend responds with no body (e.g. a bare 204 No Content).
   */
  async deleteAccount(id: string): Promise<string> {
    const { data } = await apiClient.delete<{ message?: string; detail?: string } | undefined>(
      `/accounts/${id}/delete/`
    );
    return data?.message ?? data?.detail ?? "Account deleted successfully";
  },
};
