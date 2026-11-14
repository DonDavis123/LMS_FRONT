export type GoogleConnectionState = "connected" | "revoked";

/** GET /integrations/google/status/ */
export interface GoogleConnectionStatus {
  /** false when the server has no Google settings at all. */
  configured: boolean;
  connected: boolean;
  /** "revoked" means the token expired or was revoked: the user must reconnect. */
  status: GoogleConnectionState | null;
  google_email: string | null;
  connected_at: string | null;
}

/** `type` of the message the OAuth return page sends to the window that opened it. */
export const GOOGLE_OAUTH_MESSAGE_TYPE = "crm.google-oauth-result";
/** Same-origin BroadcastChannel used as a fallback when `window.opener` is lost. */
export const GOOGLE_OAUTH_CHANNEL = "crm.google-oauth";
/** Window event other hook instances listen to so they re-read the status. */
export const GOOGLE_CONNECTION_CHANGED_EVENT = "crm:google-connection-changed";

export interface GoogleOAuthMessage {
  type: typeof GOOGLE_OAUTH_MESSAGE_TYPE;
  status: "connected" | "error";
  message?: string;
}

export function isGoogleOAuthMessage(value: unknown): value is GoogleOAuthMessage {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return (
    record.type === GOOGLE_OAUTH_MESSAGE_TYPE &&
    (record.status === "connected" || record.status === "error") &&
    (record.message === undefined || typeof record.message === "string")
  );
}

/** True when the user's Google account is linked and usable right now. */
export function isGoogleUsable(status: GoogleConnectionStatus | null): boolean {
  return Boolean(status?.connected && status.status !== "revoked");
}
