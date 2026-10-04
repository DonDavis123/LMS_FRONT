import { apiClient } from "@/infrastructure/api/client";
import type { CreateUserPayload, ManagedUser, User } from "@/features/users/types/user.types";
import type { LeadOwnerOption } from "@/features/auth/types/auth.types";
import type { PaginatedResponse } from "@/shared/types/pagination";
import { toListQueryParams, type ListQueryParams } from "@/shared/utils/listQuery";

export const userService = {
  async getUsers(): Promise<User[]> {
    const { data } = await apiClient.get<User[]>("/lead-owners/");
    return data;
  },

  /**
   * GET /users/ — superadmin-only paginated list for "Manage Users".
   * Supports page, page_size, filters (role / is_active), search
   * (name + email) and sort_by/sort_direction. Soft-deleted users are
   * never returned by the backend.
   */
  async getUsersPage(params: ListQueryParams = {}): Promise<PaginatedResponse<ManagedUser>> {
    const { data } = await apiClient.get<PaginatedResponse<ManagedUser>>("/users/", {
      params: toListQueryParams(params),
    });

    if (data && Array.isArray(data.results) && data.pagination) {
      return data;
    }

    throw new Error("Invalid users response from the server.");
  },

  async createUser(payload: CreateUserPayload): Promise<User> {
    const { data } = await apiClient.post<User>("/users/", payload);
    return data;
  },

  async deactivateUser(id: string): Promise<User> {
    const { data } = await apiClient.patch<User>(`/users/${id}/`, { status: "Inactive" });
    return data;
  },

  async deleteUser(id: string): Promise<void> {
    await apiClient.delete(`/users/${id}/`);
  },

  /**
   * GET /lead-owners/ — list of { id, name, email } used to populate the
   * "Lead Owner" picker on the create/edit lead forms.
   */
  async getLeadOwners(): Promise<LeadOwnerOption[]> {
    const { data } = await apiClient.get<LeadOwnerOption[]>("/lead-owners/");
    return data;
  },
};
