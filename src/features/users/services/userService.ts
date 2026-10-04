import { apiClient } from "@/infrastructure/api/client";
import type {
  CreateUserPayload,
  ManagedUser,
  ManagedUserDetail,
  UpdateUserPayload,
  User,
} from "@/features/users/types/user.types";
import type { LeadOwnerOption } from "@/features/auth/types/auth.types";
import type { PaginatedResponse } from "@/shared/types/pagination";
import { toListQueryParams, type ListQueryParams } from "@/shared/utils/listQuery";

export const userService = {
  async getUsers(): Promise<User[]> {
    const { data } = await apiClient.get<User[]>("/lead-owners/");
    return data;
  },

  /**
   * GET /users/ — superadmin-only paginated list. Accepts the same
   * page / page_size / filters / sort_by / sort_direction contract as the
   * Lead list. Filterable fields: name, email, role, is_active.
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

  /** GET /users/{id}/ — superadmin-only; 404 `{ detail: "User not found." }` if missing. */
  async getUser(id: string): Promise<ManagedUserDetail> {
    const { data } = await apiClient.get<ManagedUserDetail>(`/users/${id}/`);
    return data;
  },

  /** PATCH /users/{id}/ — partial update of name and/or email. Returns the updated user. */
  async updateUser(id: string, payload: UpdateUserPayload): Promise<ManagedUserDetail> {
    const { data } = await apiClient.patch<ManagedUserDetail>(`/users/${id}/`, payload);
    return data;
  },

  /**
   * POST /users/{id}/reset-password/ — responds 204 and signs the user out
   * everywhere. The password only ever travels in the request body.
   */
  async resetUserPassword(id: string, newPassword: string): Promise<void> {
    await apiClient.post(`/users/${id}/reset-password/`, { new_password: newPassword });
  },

  /** POST /users/{id}/block/ — returns the updated user (`is_active: false`). */
  async blockUser(id: string): Promise<ManagedUserDetail> {
    const { data } = await apiClient.post<ManagedUserDetail>(`/users/${id}/block/`);
    return data;
  },

  /** POST /users/{id}/unblock/ — returns the updated user (`is_active: true`). */
  async unblockUser(id: string): Promise<ManagedUserDetail> {
    const { data } = await apiClient.post<ManagedUserDetail>(`/users/${id}/unblock/`);
    return data;
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
