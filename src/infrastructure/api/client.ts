import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";
import { authStorage } from "@/infrastructure/auth/tokenStorage";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000/api";

const commonConfig = {
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
    "ngrok-skip-browser-warning": "true",
  },
};

/**
 * Authenticated API client.
 *
 * The access token is sent in the Authorization header.
 * The refresh token is NEVER read by JavaScript; it is an HttpOnly cookie
 * and is sent automatically by the browser because withCredentials=true.
 */
export const apiClient = axios.create(commonConfig);

/**
 * Public/auth client.
 *
 * This intentionally has no response interceptor, so a failed login or
 * refresh request can never recursively trigger another refresh attempt.
 * withCredentials remains enabled because login sets the HttpOnly refresh
 * cookie and logout clears it.
 */
export const authClient = axios.create(commonConfig);

apiClient.interceptors.request.use((config) => {
  const token = authStorage.getAccessToken();

  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

type RetriableConfig = InternalAxiosRequestConfig & {
  _retried?: boolean;
};

const TAB_ID =
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const REFRESH_LOCK_TTL_MS = 8000;
const REFRESH_WAIT_TIMEOUT_MS = 5000;

/**
 * One refresh request per browser tab.
 *
 * This is important because refresh-token rotation makes the refresh token
 * effectively single-use. Every caller in this tab shares the same promise.
 */
let refreshPromise: Promise<string | null> | null = null;

function waitForAccessTokenFromOtherTab(
  timeoutMs: number,
): Promise<string | null> {
  if (typeof window === "undefined") {
    return Promise.resolve(null);
  }

  const tokenBeforeWaiting = authStorage.getAccessToken();

  return new Promise((resolve) => {
    let settled = false;

    const finish = (token: string | null) => {
      if (settled) return;

      settled = true;
      window.removeEventListener("storage", onStorage);
      clearTimeout(timer);

      resolve(
        token && token !== tokenBeforeWaiting
          ? token
          : null,
      );
    };

    const onStorage = (event: StorageEvent) => {
      if (event.key === "crm.access_token" && event.newValue) {
        finish(event.newValue);
        return;
      }

      if (
        event.key === "crm.refresh_lock" &&
        event.newValue === null
      ) {
        // The other tab finished without publishing a new access token.
        // Let this tab decide whether it should attempt the refresh itself.
        finish(null);
      }
    };

    const timer = window.setTimeout(
      () => finish(null),
      timeoutMs,
    );

    window.addEventListener("storage", onStorage);
  });
}

async function performRefresh(): Promise<string | null> {
  try {
    const { data } = await authClient.post<{
      access_token?: string;
    }>("/auth/refresh/");

    if (!data?.access_token) {
      return null;
    }

    authStorage.setAccessToken(data.access_token);
    return data.access_token;
  } catch {
    return null;
  }
}

async function refreshAccessTokenInternal(): Promise<string | null> {
  const activeLock = authStorage.getActiveRefreshLock(
    REFRESH_LOCK_TTL_MS,
  );

  if (
    activeLock &&
    activeLock.ownerId !== TAB_ID
  ) {
    const tokenFromOtherTab =
      await waitForAccessTokenFromOtherTab(
        REFRESH_WAIT_TIMEOUT_MS,
      );

    if (tokenFromOtherTab) {
      return tokenFromOtherTab;
    }
  }

  authStorage.acquireRefreshLock(TAB_ID);

  try {
    return await performRefresh();
  } finally {
    authStorage.releaseRefreshLock(TAB_ID);
  }
}

/**
 * Public refresh entry point.
 *
 * All callers in this tab share one promise. This covers both:
 * - concurrent 401 responses
 * - restoreSession() running at the same time as an API request
 */
export function refreshAccessToken(): Promise<string | null> {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = refreshAccessTokenInternal().finally(() => {
    refreshPromise = null;
  });

  return refreshPromise;
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest =
      error.config as RetriableConfig | undefined;

    if (
      error.response?.status !== 401 ||
      !originalRequest ||
      originalRequest._retried
    ) {
      return Promise.reject(error);
    }

    // Never refresh in response to the refresh endpoint itself.
    if (
      originalRequest.url?.includes("/auth/refresh/")
    ) {
      return Promise.reject(error);
    }

    originalRequest._retried = true;

    const newAccessToken =
      await refreshAccessToken();

    if (!newAccessToken) {
      authStorage.clear();

      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }

      return Promise.reject(error);
    }

    originalRequest.headers =
      originalRequest.headers ?? {};

    originalRequest.headers.Authorization =
      `Bearer ${newAccessToken}`;

    return apiClient(originalRequest);
  },
);
