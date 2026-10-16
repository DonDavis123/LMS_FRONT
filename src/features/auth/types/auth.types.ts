import { normalizeEnumValue } from "@/shared/utils/enumValue";

/**
 * Role comes straight from the backend's `role` field (e.g. "SUPERADMIN").
 * Kept as a plain string rather than a strict union since the exact set of
 * roles/casing is defined server-side — use isSuperAdmin/isAdmin below
 * instead of comparing this directly.
 */
export type UserRole = string;

/**
 * Company summary returned by GET /users/me/. It is `null` for platform
 * admins (they belong to no company) and may be missing on older cached
 * sessions, so treat it as optional.
 */
export interface AuthUserCompany {
  id: string;
  name: string;
  status: string;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  company?: AuthUserCompany | null;
}

function normalizeRole(role: string | null | undefined): string {
  // Also tolerates the "UserRole.ADMIN" shape the backend can emit for enums.
  return normalizeEnumValue(role).replace(/[\s_-]/g, "");
}

export function isSuperAdmin(user: AuthUser | null): boolean {
  return normalizeRole(user?.role) === "SUPERADMIN";
}

export function isAdmin(user: AuthUser | null): boolean {
  const normalized = normalizeRole(user?.role);
  return normalized === "SUPERADMIN" || normalized === "ADMIN";
}

/**
 * Platform superadmins run the whole product (companies, their users, the
 * audit trail) and belong to no company, so they use the separate
 * `/platform` area instead of `/dashboard`. Deliberately NOT part of
 * `isSuperAdmin()` / `isAdmin()`, which describe roles *inside* a company.
 */
export function isPlatformAdmin(user: AuthUser | null): boolean {
  return normalizeRole(user?.role) === "PLATFORMSUPERADMIN";
}

/** Landing page after sign-in: one login for everyone, two separate workspaces. */
export function getHomePath(user: AuthUser | null): string {
  return isPlatformAdmin(user) ? "/platform" : "/dashboard";
}

export interface LoginCredentials {
  email: string;
  password: string;
}

/**
 * Shape returned by POST /auth/login/ on the Django backend.
 * The refresh token is intentionally NOT included in JSON; it is set as
 * an HttpOnly cookie by Django.
 */
export interface AuthTokens {
  access_token: string;
  token_type: string;
}

export interface LoginResponse extends AuthTokens {
  user?: AuthUser;
}

/** GET /lead-owners/ — used to populate the Lead Owner picker. */
export interface LeadOwnerOption {
  id: string;
  name: string;
  email: string;
}
