import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";
import { authStorage } from "@/features/auth/services/authStorage";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000/api";

export const apiClient = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
    "ngrok-skip-browser-warning": "true",
  },
});

apiClient.interceptors.request.use((config) => {
  const token = authStorage.getAccessToken();
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

type RetriableConfig = InternalAxiosRequestConfig & { _retried?: boolean };

// Refresh is deliberately made with a separate axios instance so a failed
// refresh cannot recursively trigger the 401 interceptor. The refresh token
// is an HttpOnly cookie; withCredentials makes the browser send it.
const rawClient = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
    "ngrok-skip-browser-warning": "true",
  },
});

// A per-tab id, used only to tell "my lock" apart from "some other tab's
// lock" in localStorage — never sent to the server.
const TAB_ID = typeof crypto !== "undefined" && crypto.randomUUID
  ? crypto.randomUUID()
  : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const REFRESH_LOCK_TTL_MS = 8000; // an abandoned lock (crashed/closed tab) is ignored after this
const REFRESH_WAIT_TIMEOUT_MS = 5000; // how long a waiting tab gives the owning tab to finish

let refreshPromise: Promise<string | null> | null = null;

/**
 * The refresh token is single-use: the backend rotates (and blacklists the
 * old value) on every call to /auth/refresh/. If two tabs from the same
 * login both hit a 401 around the same time — very plausible, since both
 * tabs' access tokens expire at the same moment — and both send the
 * now-shared refresh cookie at once, the second request arrives after the
 * first has already rotated it and gets a 401 back, which used to force
 * that tab to log out even though the session was perfectly valid in the
 * other tab.
 *
 * This waits for a `storage` event announcing a token another tab already
 * fetched, rather than spending the refresh token twice.
 */
function waitForAccessTokenFromOtherTab(timeoutMs: number): Promise<string | null> {
  if (typeof window === "undefined") return Promise.resolve(null);

  // Only a token that's actually different from what we had before we
  // started waiting counts as "the other tab refreshed" — otherwise a
  // timeout would resolve with the same stale token we already know is
  // being rejected, instead of correctly falling back to our own refresh.
  const tokenBeforeWaiting = authStorage.getAccessToken();

  return new Promise((resolve) => {
    let settled = false;

    function finish(token: string | null) {
      if (settled) return;
      settled = true;
      window.removeEventListener("storage", onStorage);
      clearTimeout(timer);
      resolve(token && token !== tokenBeforeWaiting ? token : null);
    }

    function onStorage(event: StorageEvent) {
      if (event.key === "crm.access_token" && event.newValue) {
        finish(event.newValue);
      }
      // The owning tab releasing its lock without ever setting a new
      // token means its refresh attempt failed — stop waiting and let
      // the caller try its own refresh instead of hanging.
      if (event.key === "crm.refresh_lock" && event.newValue === null) {
        finish(authStorage.getAccessToken());
      }
    }

    const timer = setTimeout(() => finish(authStorage.getAccessToken()), timeoutMs);
    window.addEventListener("storage", onStorage);
  });
}

async function performRefresh(): Promise<string | null> {
  try {
    const { data } = await rawClient.post<{ access_token: string }>("/auth/refresh/");
    if (!data?.access_token) return null;
    authStorage.setAccessToken(data.access_token);
    return data.access_token;
  } catch {
    return null;
  }
}

/**
 * Coordinates a token refresh both within this tab (via the shared
 * `refreshPromise`, unchanged from before) and across tabs (via the
 * localStorage lock above). Exported so callers outside the interceptor
 * (the root page and the dashboard layout's auth guard) can proactively
 * try to restore a session from the HttpOnly refresh cookie when there's
 * no access token cached locally yet — e.g. a fresh tab, or localStorage
 * having been cleared while the cookie is still valid. Safe to call
 * speculatively: it just resolves to null on any failure.
 */
export async function refreshAccessToken(): Promise<string | null> {
  const activeLock = authStorage.getActiveRefreshLock(REFRESH_LOCK_TTL_MS);

  if (activeLock && activeLock.ownerId !== TAB_ID) {
    // Another tab is already refreshing — wait for it instead of racing
    // it for the same single-use refresh token.
    const token = await waitForAccessTokenFromOtherTab(REFRESH_WAIT_TIMEOUT_MS);
    if (token) return token;
    // The other tab didn't come through in time (crashed, closed, or its
    // own refresh genuinely failed) — fall through and try ourselves.
  }

  authStorage.acquireRefreshLock(TAB_ID);
  try {
    return await performRefresh();
  } finally {
    authStorage.releaseRefreshLock(TAB_ID);
  }
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetriableConfig | undefined;

    if (error.response?.status !== 401 || !originalRequest || originalRequest._retried) {
      return Promise.reject(error);
    }

    // Never try to refresh the refresh endpoint itself.
    if (originalRequest.url?.includes("/auth/refresh/")) {
      return Promise.reject(error);
    }

    originalRequest._retried = true;
    refreshPromise = refreshPromise ?? refreshAccessToken();
    const newAccessToken = await refreshPromise;
    refreshPromise = null;

    if (!newAccessToken) {
      authStorage.clear();
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
      return Promise.reject(error);
    }

    originalRequest.headers = originalRequest.headers ?? {};
    originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
    return apiClient(originalRequest);
  }
);
