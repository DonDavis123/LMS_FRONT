import { apiClient, authClient, refreshAccessToken } from "@/infrastructure/api/client";
import { authStorage } from "@/infrastructure/auth/tokenStorage";
import type {
  AuthUser,
  LoginCredentials,
  LoginResponse,
} from "@/features/auth/types/auth.types";

/**
 * Decodes the payload of a JWT without verifying its signature.
 * Used only as a fallback to populate a display name / role when
 * GET /users/me/ is unreachable for some reason.
 */
function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const payload = token.split(".")[1];
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(
      atob(normalized)
        .split("")
        .map((c) => "%" + c.charCodeAt(0).toString(16).padStart(2, "0"))
        .join("")
    );
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function userFromToken(accessToken: string): AuthUser {
  const claims = decodeJwtPayload(accessToken) ?? {};
  return {
    id: String(claims.user_id ?? claims.sub ?? ""),
    name: String(claims.name ?? claims.email ?? "User"),
    email: String(claims.email ?? ""),
    role: String(claims.role ?? "SALES_USER"),
  };
}

export const authService = {
  async login(credentials: LoginCredentials): Promise<AuthUser> {
    const { data } = await authClient.post<LoginResponse>(
      "/auth/login/",
      credentials,
    );

    authStorage.setAccessToken(data.access_token);

    const user = data.user ?? (await this.fetchCurrentUser()) ?? userFromToken(data.access_token);
    authStorage.setUser(user);
    return user;
  },

  /**
   * GET /users/me/ — confirmed in Postman to return
   * { id, name, email, role }. Falls back to decoding the JWT if the
   * endpoint is briefly unreachable, so login still succeeds.
   */
  async fetchCurrentUser(): Promise<AuthUser | null> {
    try {
      const { data } = await apiClient.get<AuthUser>("/users/me/");
      return data;
    } catch {
      return null;
    }
  },

  async logout(): Promise<void> {
    try {
      // The backend reads the refresh token from its HttpOnly cookie.
      await apiClient.post("/auth/logout/");
    } catch {
      // Best effort — clear the local session regardless.
    } finally {
      authStorage.clear();
    }
  },

  getSessionUser(): AuthUser | null {
    return authStorage.getUser();
  },

  isAuthenticated(): boolean {
    return Boolean(authStorage.getAccessToken());
  },

  /**
   * The routing guards (root page, dashboard layout) need an async,
   * cookie-aware answer to "is there a session?" — `isAuthenticated()`
   * only checks the locally cached access token, which misses the case
   * where that's gone but the HttpOnly refresh cookie is still valid
   * (e.g. localStorage was cleared, or this is a fresh tab after the
   * access token's short lifetime already ran out). This tries the cheap
   * local check first, then falls back to a silent refresh attempt
   * before giving up — so a valid cookie session is never lost just
   * because nothing was cached in the browser yet.
   */
  async restoreSession(): Promise<AuthUser | null> {
    if (authStorage.getAccessToken()) {
      return authStorage.getUser() ?? (await this.fetchCurrentUser());
    }

    const token = await refreshAccessToken();
    if (!token) return null;

    const user = authStorage.getUser() ?? (await this.fetchCurrentUser());
    if (user) authStorage.setUser(user);
    return user;
  },

  /**
   * POST /auth/forgot-password/ — always returns the same generic
   * "if an account exists..." message regardless of whether the email is
   * registered, so the UI never reveals which emails have accounts.
   */
  async forgotPassword(email: string): Promise<string> {
    const { data } = await apiClient.post<{ detail?: string }>("/auth/forgot-password/", {
      email,
    });
    return data.detail ?? "If an account exists with this email, a password reset link has been sent.";
  },

  /**
   * POST /auth/reset-password/ with the token from the emailed link and
   * the new password.
   */
  async resetPassword(token: string, newPassword: string): Promise<string> {
    const { data } = await apiClient.post<{ detail?: string }>("/auth/reset-password/", {
      token,
      new_password: newPassword,
    });
    return data.detail ?? "Password has been reset successfully.";
  },
};
