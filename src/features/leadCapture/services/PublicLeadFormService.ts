import { publicClient } from "@/infrastructure/api/client";
import type {
  PublicLeadFormInfo,
  PublicLeadSubmission,
  PublicLeadSubmitResponse,
} from "@/features/leadCapture/types/publicLeadForm.types";

function path(token: string): string {
  return `/public/lead-forms/${encodeURIComponent(token)}/`;
}

/**
 * Public (unauthenticated) lead form API. Uses `publicClient`, never
 * `apiClient`, so no token is attached and nothing redirects to /login.
 * Errors propagate; the component maps the HTTP status to a message.
 */
export const PublicLeadFormService = {
  /** GET /public/lead-forms/<token>/ — 404 for an unknown token. */
  async getForm(token: string): Promise<PublicLeadFormInfo> {
    const { data } = await publicClient.get<PublicLeadFormInfo>(path(token));
    if (!data || typeof data.accepting_responses !== "boolean") {
      throw new Error("Invalid lead form response from the server.");
    }
    return data;
  },

  /** POST /public/lead-forms/<token>/ — 201 on success; 400/404/410/429 otherwise. */
  async submit(token: string, payload: PublicLeadSubmission): Promise<PublicLeadSubmitResponse> {
    const { data } = await publicClient.post<PublicLeadSubmitResponse>(path(token), payload);
    return data;
  },
};
