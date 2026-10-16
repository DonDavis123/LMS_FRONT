import type {
  ManagedUser,
  ManagedUserDetail,
} from "@/features/users/types/user.types";
import type { SortState } from "@/shared/types/sort";

/**
 * Types for the Platform Admin area. They mirror the backend contract in
 * `docs/platform-companies-api.md` and `docs/platform-admin-api.md`
 * (`/api/platform/...`). Every endpoint needs a PLATFORM_SUPERADMIN token.
 */

/* ── Companies ─────────────────────────────────────────────────────────── */

export const COMPANY_STATUSES = ["ONBOARDING", "ACTIVE", "SUSPENDED"] as const;
export type CompanyStatus = (typeof COMPANY_STATUSES)[number];

/** One row of GET /platform/companies/. */
export interface CompanySummary {
  id: string;
  name: string;
  slug: string;
  website: string | null;
  status: CompanyStatus;
  created_at: string;
  /** Excludes retired (deleted) users. */
  users_count: number;
}

/** Company as returned by create / update / suspend / activate. */
export interface Company {
  id: string;
  name: string;
  slug: string;
  website: string | null;
  status: CompanyStatus;
  /** Set while suspended; empty otherwise. */
  status_reason: string;
  status_changed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CompanySuperadmin {
  id: string;
  name: string;
  email: string;
  is_active: boolean;
}

/** GET /platform/companies/{id}/ */
export interface CompanyDetail extends Company {
  users_count: number;
  superadmins: CompanySuperadmin[];
}

/** POST /platform/companies/ — creates the company and its first SUPERADMIN. */
export interface CreateCompanyPayload {
  company_name: string;
  /** Optional; omitted when blank. */
  website?: string;
  admin_name: string;
  admin_email: string;
  /** At least 8 characters; sent exactly as typed (never trimmed). */
  admin_password: string;
}

export interface CreateCompanyResult {
  company: Company;
  admin: ManagedUserDetail;
}

/** PATCH /platform/companies/{id}/ — at least one field. `website: null` clears it. */
export interface UpdateCompanyPayload {
  name?: string;
  website?: string | null;
}

/** Sort keys the backend accepts on the company list. */
export type CompanySortField = "name" | "slug" | "status" | "created_at" | "users_count";

export interface CompanyListQuery {
  page?: number;
  page_size?: number;
  /** Matches name or slug. */
  search?: string;
  status?: CompanyStatus | "";
  sort?: SortState | null;
}

/* ── Company users ─────────────────────────────────────────────────────── */

/** Roles a platform admin may assign when adding a user to a company. */
export const COMPANY_USER_ROLES = ["ADMIN", "SUPERADMIN"] as const;
export type CompanyUserRole = (typeof COMPANY_USER_ROLES)[number];

/** A company user row is the same shape the company's own user list uses. */
export type CompanyUser = ManagedUser;

export interface CompanyUserListQuery {
  page?: number;
  page_size?: number;
  /** Matches name or email. */
  search?: string;
  role?: string;
  /** `null` = both active and blocked users. */
  is_active?: boolean | null;
  sort?: SortState | null;
}

/** POST /platform/companies/{id}/users/ */
export interface CreateCompanyUserPayload {
  name: string;
  email: string;
  password: string;
  role: CompanyUserRole;
}

/* ── Audit trail ───────────────────────────────────────────────────────── */

export const PLATFORM_AUDIT_ACTIONS = [
  "COMPANY_CREATED",
  "COMPANY_UPDATED",
  "COMPANY_SUSPENDED",
  "COMPANY_ACTIVATED",
  "COMPANY_USER_CREATED",
  "COMPANY_USER_PASSWORD_RESET",
  "COMPANY_USER_BLOCKED",
  "COMPANY_USER_UNBLOCKED",
] as const;
export type PlatformAuditAction = (typeof PLATFORM_AUDIT_ACTIONS)[number];

/** One row of GET /platform/audit-logs/ (newest first). */
export interface PlatformAuditLogEntry {
  id: string;
  action: PlatformAuditAction | string;
  actor_id: string;
  actor_email: string;
  company_id: string | null;
  target_user_id: string | null;
  target_email: string;
  /** Never contains secrets. Shape depends on `action`. */
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface PlatformAuditLogQuery {
  company_id?: string;
  action?: PlatformAuditAction | "";
  page?: number;
  page_size?: number;
}

/* ── Overview ──────────────────────────────────────────────────────────── */

export interface RecentCompany {
  id: string;
  name: string;
  status: CompanyStatus;
  created_at: string;
}

/** GET /platform/overview/ */
export interface PlatformOverview {
  companies: {
    total: number;
    active: number;
    onboarding: number;
    suspended: number;
  };
  /** Company users only (platform admins and retired users excluded). */
  users: {
    total: number;
    active: number;
  };
  recent_companies: RecentCompany[];
}
