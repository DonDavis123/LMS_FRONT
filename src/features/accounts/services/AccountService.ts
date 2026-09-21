import type { PaginatedResponse } from "@/shared/types/pagination";
import { toListQueryParams, type ListQueryParams } from "@/shared/utils/listQuery";
import { apiClient } from "@/infrastructure/api/client";
import type {
  CreateAccountPayload,
  Account,
  UpdateAccountPayload,
} from "@/features/accounts/types/account.types";

export const AccountService = {
  async getAccountsPage(params: ListQueryParams = {}): Promise<PaginatedResponse<Account>> {
    const { data } = await apiClient.get<PaginatedResponse<Account>>("/accounts/", {
      params: toListQueryParams(params),
    });
    return data;
  },

  // Compatibility method for existing pickers/forms that need a plain array.
  // List pages must use getAccountsPage() so pagination metadata is preserved.
  async getAccounts(): Promise<Account[]> {
    const data = await this.getAccountsPage({ page: 1, page_size: 50 });
    return data.results;
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
