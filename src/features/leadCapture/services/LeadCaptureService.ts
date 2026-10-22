import { apiClient } from "@/infrastructure/api/client";
import type { LeadForm, UpdateLeadFormPayload } from "@/features/leadCapture/types/leadCapture.types";

const BASE = "/lead-capture/form/";

/**
 * The backend builds `public_url` as `{FRONTEND_URL}/lead/{token}`. If that
 * environment variable is not set on the server the value is only
 * `/lead/{token}`, which is useless in a QR code or a shared link — so a
 * relative value is resolved against this site's own origin.
 */
export function resolvePublicUrl(publicUrl: string): string {
  if (/^https?:\/\//i.test(publicUrl)) return publicUrl;
  if (typeof window === "undefined") return publicUrl;
  try {
    return new URL(publicUrl, window.location.origin).toString();
  } catch {
    return publicUrl;
  }
}

function toLeadForm(data: LeadForm | undefined): LeadForm {
  if (
    !data ||
    typeof data.id !== "string" ||
    typeof data.public_url !== "string" ||
    !Array.isArray(data.rotation_owners)
  ) {
    throw new Error("Invalid lead form response from the server.");
  }
  return {
    ...data,
    public_url: resolvePublicUrl(data.public_url),
    rotation_owners: [...data.rotation_owners].sort((a, b) => a.position - b.position),
  };
}

/**
 * Lead Form API (superadmin only; the backend enforces it and every rule).
 * Errors propagate so callers can show the server's own `detail` message via
 * `extractApiError` (business-rule errors are `400 { detail }`).
 */
export const LeadCaptureService = {
  /** GET /lead-capture/form/ */
  async getForm(): Promise<LeadForm> {
    const { data } = await apiClient.get<LeadForm>(BASE);
    return toLeadForm(data);
  },

  /**
   * PATCH /lead-capture/form/ — send only the changed fields. Editing a LIVE
   * form so that it ends up without a lead source or eligible owner is refused
   * with 400 (block the form first).
   */
  async updateForm(payload: UpdateLeadFormPayload): Promise<LeadForm> {
    const { data } = await apiClient.patch<LeadForm>(BASE, payload);
    return toLeadForm(data);
  },

  /** POST /lead-capture/form/block/ — the public link answers "closed" right away. */
  async blockForm(): Promise<LeadForm> {
    const { data } = await apiClient.post<LeadForm>(`${BASE}block/`);
    return toLeadForm(data);
  },

  /** POST /lead-capture/form/unblock/ — 400 while there is no lead source or eligible owner. */
  async unblockForm(): Promise<LeadForm> {
    const { data } = await apiClient.post<LeadForm>(`${BASE}unblock/`);
    return toLeadForm(data);
  },

  /** POST /lead-capture/form/regenerate-link/ — the old link and every printed QR stop working at once. */
  async regenerateLink(): Promise<LeadForm> {
    const { data } = await apiClient.post<LeadForm>(`${BASE}regenerate-link/`);
    return toLeadForm(data);
  },
};
