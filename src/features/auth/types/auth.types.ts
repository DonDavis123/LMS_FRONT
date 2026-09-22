/**
 * Role comes straight from the backend's `role` field (e.g. "SUPERADMIN").
 * Kept as a plain string rather than a strict union since the exact set of
 * roles/casing is defined server-side — use isSuperAdmin/isAdmin below
 * instead of comparing this directly.
 */
export type UserRole = string;

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export function isSuperAdmin(user: AuthUser | null): boolean {
  return user?.role?.replace(/[\s_-]/g, "").toUpperCase() === "SUPERADMIN";
}

export function isAdmin(user: AuthUser | null): boolean {
  const normalized = user?.role?.replace(/[\s_-]/g, "").toUpperCase();
  return normalized === "SUPERADMIN" || normalized === "ADMIN";
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
