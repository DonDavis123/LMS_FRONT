import type { UserRole } from "@/features/auth/types/auth.types";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: "Active" | "Inactive";
  last_login: string | null;
  created_at: string;
}

export interface CreateUserPayload {
  name: string;
  email: string;
  password: string;
  role: UserRole;
}

/**
 * One row of GET /users/ (superadmin-only "Manage Users" list).
 * Distinct from `User` above, which mirrors the older lead-owners shape.
 */
export interface ManagedUser {
  id: string;
  name: string;
  email: string;
  /** Backend role, e.g. "ADMIN" | "SUPERADMIN". */
  role: UserRole;
  is_active: boolean;
  created_at: string;
}

/** Backend sort keys accepted by GET /users/. */
export type ManagedUserSortField = "name" | "email" | "role" | "is_active" | "created_at";

export const MANAGED_USER_ROLES = ["ADMIN", "SUPERADMIN"] as const;

