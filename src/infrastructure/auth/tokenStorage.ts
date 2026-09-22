import type { AuthTokens, AuthUser } from "@/features/auth/types/auth.types";

/**
 * Browser-side session storage.
 *
 * The access token is kept locally because the API client needs to attach it
 * to normal API requests. The refresh token is intentionally NOT read from
 * JavaScript storage: the backend owns it in an HttpOnly cookie and the
 * browser sends that cookie automatically when withCredentials is enabled.
 */
const ACCESS_TOKEN_KEY = "crm.access_token";
const USER_KEY = "crm.user";

// Cross-tab refresh coordination. The refresh token itself is an HttpOnly
// cookie the backend rotates on every call — this key just lets tabs tell
// each other "I'm already refreshing, wait for me" so two tabs never race
// to spend the same (single-use) refresh token. See client.ts.
const REFRESH_LOCK_KEY = "crm.refresh_lock";

const isBrowser = () => typeof window !== "undefined";

export const authStorage = {
  getAccessToken(): string | null {
    if (!isBrowser()) return null;
    return window.localStorage.getItem(ACCESS_TOKEN_KEY);
  },

  // Kept for compatibility with older callers. HttpOnly refresh cookies
  // cannot and should not be read by client-side JavaScript.
  getRefreshToken(): string | null {
    return null;
  },

  setTokens(tokens: AuthTokens): void {
    if (!isBrowser()) return;
    window.localStorage.setItem(ACCESS_TOKEN_KEY, tokens.access_token);
  },

  setAccessToken(accessToken: string): void {
    if (!isBrowser()) return;
    window.localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  },

  getUser(): AuthUser | null {
    if (!isBrowser()) return null;
    const raw = window.localStorage.getItem(USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as AuthUser;
    } catch {
      return null;
    }
  },

  setUser(user: AuthUser): void {
    if (!isBrowser()) return;
    window.localStorage.setItem(USER_KEY, JSON.stringify(user));
  },

  clear(): void {
    if (!isBrowser()) return;
    window.localStorage.removeItem(ACCESS_TOKEN_KEY);
    window.localStorage.removeItem(USER_KEY);
  },

  /**
   * Cross-tab refresh lock. Any tab about to call POST /auth/refresh/
   * writes its own id + a timestamp here first; other tabs that see a
   * fresh lock skip their own refresh call and instead wait for the
   * owning tab's result (see waitForAccessToken below). Writing to
   * localStorage fires a `storage` event in *other* tabs automatically,
   * which is what makes this work without any extra transport.
   */
  acquireRefreshLock(ownerId: string): void {
    if (!isBrowser()) return;
    window.localStorage.setItem(REFRESH_LOCK_KEY, JSON.stringify({ ownerId, at: Date.now() }));
  },

  releaseRefreshLock(ownerId: string): void {
    if (!isBrowser()) return;
    try {
      const raw = window.localStorage.getItem(REFRESH_LOCK_KEY);
      if (!raw) return;
      const lock = JSON.parse(raw) as { ownerId?: string };
      // Only clear a lock we own — don't clobber another tab's in-flight lock.
      if (lock.ownerId === ownerId) window.localStorage.removeItem(REFRESH_LOCK_KEY);
    } catch {
      window.localStorage.removeItem(REFRESH_LOCK_KEY);
    }
  },

  /**
   * Returns the current lock holder + age in ms, or null if no lock (or a
   * stale one, past maxAgeMs) is held. A lock older than maxAgeMs is
   * treated as abandoned — e.g. the owning tab crashed or was closed
   * mid-refresh — so a waiting tab isn't stuck forever.
   */
  getActiveRefreshLock(maxAgeMs: number): { ownerId: string; ageMs: number } | null {
    if (!isBrowser()) return null;
    const raw = window.localStorage.getItem(REFRESH_LOCK_KEY);
    if (!raw) return null;
    try {
      const lock = JSON.parse(raw) as { ownerId?: string; at?: number };
      if (!lock.ownerId || !lock.at) return null;
      const ageMs = Date.now() - lock.at;
      if (ageMs > maxAgeMs) return null;
      return { ownerId: lock.ownerId, ageMs };
    } catch {
      return null;
    }
  },
};
