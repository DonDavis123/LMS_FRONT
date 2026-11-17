import { apiClient } from "@/infrastructure/api/client";
import type { RecordingTranscript } from "@/features/calls/types/callTranscript.types";

const transcriptUrl = (callId: string, recordingId: string) =>
  `/calls/${callId}/recordings/${recordingId}/transcript/`;

export const CallTranscriptService = {
  /** Current state. Always answers for an existing recording, so one URL can be polled. */
  async getTranscript(callId: string, recordingId: string): Promise<RecordingTranscript> {
    const { data } = await apiClient.get<RecordingTranscript>(transcriptUrl(callId, recordingId));
    return data;
  },

  /**
   * Starts a transcription, retries a failed one, or (with `regenerate`) runs a
   * finished one again, which costs another model request. A run that is
   * already active is not duplicated; the current state comes back instead.
   */
  async requestTranscript(callId: string, recordingId: string, regenerate = false): Promise<RecordingTranscript> {
    const { data } = await apiClient.post<RecordingTranscript>(
      transcriptUrl(callId, recordingId),
      regenerate ? { regenerate: true } : {},
    );
    return data;
  },
};
