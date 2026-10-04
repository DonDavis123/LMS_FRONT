import { apiClient } from "@/infrastructure/api/client";
import type {
  CreateUserPayload,
  DeleteUserPayload,
  ManagedUser,
  ManagedUserDetail,
  ReplacementCandidate,
  UpdateUserPayload,
  UserAuditLogEntry,
  UserAuditLogQuery,
  UserDeletionPreview,
} from "@/features/users/types/user.types";
import type { LeadOwnerOption } from "@/features/auth/types/auth.types";
import type { PaginatedResponse } from "@/shared/types/pagination";
import { toListQueryParams, type ListQueryParams } from "@/shared/utils/listQuery";

/**
 * Manage Users API (see the backend's docs/user-management-api.md).
 *
 * Everything here is superadmin-only except `getLeadOwners`. The backend owns
 * every rule (self-protection, role limits, transfer requirements); this layer
 * only sends requests and returns typed bodies. Errors are left to propagate
 * so callers can show the server's own `detail` message via `extractApiError`.
 */
function assertPaginated<T>(data: PaginatedResponse<T> | undefined, what: string): PaginatedResponse<T> {
  if (data && Array.isArray(data.results) && data.pagination) return data;
  throw new Error(`Invalid ${what} response from the server.`);
}

export const userService = {
  /**
   * GET /users/ — paginated list. Supports `search` (name or email),
   * `filters` (name, email, role, is_active), `sort_by` (name, email, role,
   * is_active, created_at), `page` and `page_size` (max 50).
   */
  async getUsersPage(params: ListQueryParams = {}): Promise<PaginatedResponse<ManagedUser>> {
    const { data } = await apiClient.get<PaginatedResponse<ManagedUser>>("/users/", {
      params: toListQueryParams(params),
    });
    return assertPaginated(data, "users");
  },

  /** GET /users/{id}/ — 404 `{ detail: "User not found." }` if missing. */
  async getUser(id: string): Promise<ManagedUserDetail> {
    const { data } = await apiClient.get<ManagedUserDetail>(`/users/${id}/`);
    return data;
  },

  /** POST /users/ — returns the created user (201). */
  async createUser(payload: CreateUserPayload): Promise<ManagedUserDetail> {
    const { data } = await apiClient.post<ManagedUserDetail>("/users/", payload);
    return data;
  },

  /**
   * PATCH /users/{id}/ — partial update of name, email and/or role. Unknown
   * fields are rejected by the backend. Changing the role signs the user out
   * everywhere.
   */
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

  /** GET /users/{id}/deletion-preview/ — read-only summary of what deleting would do. */
  async getDeletionPreview(id: string): Promise<UserDeletionPreview> {
    const { data } = await apiClient.get<UserDeletionPreview>(`/users/${id}/deletion-preview/`);
    return data;
  },

  /** GET /users/{id}/replacement-candidates/ — active Admin/Superadmin users, excluding `id`. */
  async getReplacementCandidates(id: string): Promise<ReplacementCandidate[]> {
    const { data } = await apiClient.get<ReplacementCandidate[]>(`/users/${id}/replacement-candidates/`);
    if (!Array.isArray(data)) throw new Error("Invalid replacement candidates response from the server.");
    return data;
  },

  /**
   * DELETE /users/{id}/ — retires the user (204). Pass a replacement only
   * when the preview says records must be transferred; with nothing to
   * transfer the request is sent without a body.
   */
  async deleteUser(id: string, payload?: DeleteUserPayload): Promise<void> {
    await apiClient.delete(`/users/${id}/`, payload?.replacement_user_id ? { data: payload } : undefined);
  },

  /** GET /users/audit-logs/ — newest first; filter by `user_id` and/or `action`. */
  async getAuditLogs(query: UserAuditLogQuery = {}): Promise<PaginatedResponse<UserAuditLogEntry>> {
    const params: Record<string, string | number> = {
      page: query.page ?? 1,
      page_size: query.page_size ?? 10,
    };
    if (query.user_id) params.user_id = query.user_id;
    if (query.action) params.action = query.action;

    const { data } = await apiClient.get<PaginatedResponse<UserAuditLogEntry>>("/users/audit-logs/", { params });
    return assertPaginated(data, "audit log");
  },

  /**
   * GET /lead-owners/ — `{ id, name, email }` of active Admin/Superadmin users,
   * open to any signed-in user. Feeds the owner pickers on Lead / Contact /
   * Account / Task / Meeting forms.
   */
  async getLeadOwners(): Promise<LeadOwnerOption[]> {
    const { data } = await apiClient.get<LeadOwnerOption[]>("/lead-owners/");
    return data;
  },
};
