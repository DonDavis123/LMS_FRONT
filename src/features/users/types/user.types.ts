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

/** One row of GET /users/ (superadmin-only users list). */
export interface ManagedUser {
  id: string;
  name: string;
  email: string;
  /** Backend role, e.g. "ADMIN" | "SUPERADMIN". */
  role: UserRole;
  /** `false` means the account is blocked. */
  is_active: boolean;
  created_at: string | null;
}

/** Roles the backend accepts for the `role` filter. */
export const MANAGED_USER_ROLES = ["ADMIN", "SUPERADMIN"] as const;

