import { apiClient } from "@/infrastructure/api/client";
import type { AuthUser } from "@/features/auth/types/auth.types";
import type {
  LogComposeRequest,
  LogComposeResponse,
  ResolveRecipientsRequest,
  ResolveRecipientsResponse,
} from "@/features/mailing/types/mail.types";

export const MailService = {
  /**
   * POST /mail/recipients/resolve/ — turns a selection (ids, or "everything
   * matching the list's search and filters") into a clean recipient list:
   * no missing/invalid addresses, no opted-out contacts, no duplicates.
   */
  async resolveRecipients(request: ResolveRecipientsRequest): Promise<ResolveRecipientsResponse> {
    const { data } = await apiClient.post<ResolveRecipientsResponse>("/mail/recipients/resolve/", request);
    return data;
  },

  /**
   * POST /email-activity/compose/ — records "email opened in Gmail" on each
   * lead/contact timeline. Idempotent per (client_ref, record), so a retry
   * never writes a second entry.
   */
  async logCompose(request: LogComposeRequest): Promise<LogComposeResponse> {
    const { data } = await apiClient.post<LogComposeResponse>("/email-activity/compose/", request);
    return data;
  },

  /**
   * PATCH /users/me/google-email/ — the Google account Gmail should open
   * with. `null` clears it (the login email is used again).
   */
  async setOwnGoogleEmail(googleEmail: string | null): Promise<AuthUser> {
    const { data } = await apiClient.patch<AuthUser>("/users/me/google-email/", {
      google_email: googleEmail,
    });
    return data;
  },
};
