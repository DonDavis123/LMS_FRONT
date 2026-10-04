import type { UserRole } from "@/features/auth/types/auth.types";

/**
 * Types for the Manage Users feature. They mirror the backend contract in
 * `docs/user-management-api.md` (GET/POST /users/, /users/{id}/ and the
 * block, unblock, reset-password, deletion-preview, replacement-candidates
 * and audit-logs sub-resources). Every endpoint except `/users/me/` is
 * superadmin-only.
 */

/** Every role the backend knows. Used for filtering and for labelling. */
export const USER_ROLES = ["SUPERADMIN", "ADMIN", "SALES_MANAGER", "SALES_EXECUTIVE"] as const;

/** Roles the backend lets a superadmin assign when creating or editing a user. */
export const ASSIGNABLE_USER_ROLES = ["ADMIN", "SUPERADMIN"] as const;
export type AssignableUserRole = (typeof ASSIGNABLE_USER_ROLES)[number];

/** One row of GET /users/. */
export interface ManagedUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  /** `false` means the account is blocked (or retired). */
  is_active: boolean;
  created_at: string | null;
}

/** GET /users/{id}/ and the body returned by PATCH / POST create / block / unblock. */
export interface ManagedUserDetail extends ManagedUser {
  updated_at: string | null;
}

/** POST /users/ */
export interface CreateUserPayload {
  name: string;
  email: string;
  /** At least 8 characters; sent exactly as typed (never trimmed). */
  password: string;
  role: AssignableUserRole;
}

/** PATCH /users/{id}/ — send only the fields that changed (at least one). */
export interface UpdateUserPayload {
  name?: string;
  email?: string;
  role?: AssignableUserRole;
}

/** GET /users/{id}/deletion-preview/ */
export type DeletionAction = "BLOCK" | "TRANSFER_AND_DELETE";

export interface UserDeletionPreview {
  user: { id: string; name: string; email: string };
  impact: {
    leads: number;
    contacts: number;
    accounts: number;
    tasks: number;
    /** Meetings the user hosts, not meetings they only attend. */
    meetings: number;
    reminders: number;
    notifications: number;
    /** Informational: timeline history is always kept. */
    timeline: number;
  };
  /** `true` = the user owns/hosts that kind of record, so a replacement is required. */
  transfer_required: {
    leads: boolean;
    contacts: boolean;
    accounts: boolean;
    meetings: boolean;
  };
  permanent_deletions: {
    tasks: number;
    reminders: number;
    notifications: number;
  };
  user_action: { type: string };
  can_retire: boolean;
  /** Human-readable reasons `can_retire` is false (e.g. deleting yourself). */
  blockers: string[];
  has_related_data: boolean;
  user_is_blocked: boolean;
  available_actions: DeletionAction[];
}

/** GET /users/{id}/replacement-candidates/ — plain array, not paginated. */
export interface ReplacementCandidate {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

/** DELETE /users/{id}/ */
export interface DeleteUserPayload {
  /** Required when any `transfer_required` flag is true; validated if sent. */
  replacement_user_id?: string;
}

export type UserAuditAction =
  | "USER_CREATED"
  | "USER_UPDATED"
  | "USER_ROLE_CHANGED"
  | "USER_BLOCKED"
  | "USER_UNBLOCKED"
  | "USER_PASSWORD_RESET"
  | "USER_RETIRED";

/** One row of GET /users/audit-logs/ (newest first). */
export interface UserAuditLogEntry {
  id: string;
  action: UserAuditAction | string;
  actor_id: string;
  actor_email: string;
  target_user_id: string;
  target_email: string;
  /** Never contains secrets. Shape depends on `action`. */
  metadata: Record<string, unknown>;
  created_at: string;
}

/** Query for GET /users/audit-logs/ (page and page_size follow the shared list contract). */
export interface UserAuditLogQuery {
  user_id?: string;
  action?: UserAuditAction;
  page?: number;
  page_size?: number;
}
