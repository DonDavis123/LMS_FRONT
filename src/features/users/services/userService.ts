import { apiClient } from "@/infrastructure/api/client";
import type { CreateUserPayload, User } from "@/features/users/types/user.types";
import type { LeadOwnerOption } from "@/features/auth/types/auth.types";

export const userService = {
  async getUsers(): Promise<User[]> {
    const { data } = await apiClient.get<User[]>("/lead-owners/");
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
