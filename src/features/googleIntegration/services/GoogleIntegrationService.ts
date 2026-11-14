import { apiClient } from "@/infrastructure/api/client";
import { extractApiError } from "@/shared/utils/apiError";
import type { GoogleConnectionStatus } from "@/features/googleIntegration/types/google.types";

export const GoogleIntegrationService = {
  async getStatus(): Promise<GoogleConnectionStatus> {
    try {
      const { data } = await apiClient.get<GoogleConnectionStatus>(
        "/integrations/google/status/",
      );
      return {
        configured: Boolean(data.configured),
        connected: Boolean(data.connected),
        status: data.status ?? null,
        google_email: data.google_email ?? null,
        connected_at: data.connected_at ?? null,
      };
    } catch (error) {
      throw new Error(extractApiError(error, "Couldn't check the Google connection."));
    }
  },

  /** Returns the Google consent URL to load in the popup. */
  async startConnect(): Promise<string> {
    try {
      const { data } = await apiClient.post<{ authorization_url?: string }>(
        "/integrations/google/connect/",
      );
      const url = data.authorization_url;
      if (typeof url !== "string" || !/^https:\/\//i.test(url)) {
        throw new Error("The server did not return a valid Google sign-in address.");
      }
      return url;
    } catch (error) {
      if (error instanceof Error && !("response" in error)) throw error;
      throw new Error(extractApiError(error, "Couldn't start the Google connection."));
    }
  },

  async disconnect(): Promise<void> {
    try {
      await apiClient.delete("/integrations/google/disconnect/");
    } catch (error) {
      throw new Error(extractApiError(error, "Couldn't disconnect Google. Try again."));
    }
  },
};
