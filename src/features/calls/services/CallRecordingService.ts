import type { AxiosProgressEvent } from "axios";
import { apiClient } from "@/infrastructure/api/client";
import type {
  CallRecording,
  CallRecordingListResponse,
} from "@/features/calls/types/callRecording.types";

const recordingsUrl = (callId: string) => `/calls/${callId}/recordings/`;

export interface UploadRecordingOptions {
  /** Length of the audio in whole seconds, when the client could read it. */
  durationSeconds?: number | null;
  onProgress?: (event: AxiosProgressEvent) => void;
  signal?: AbortSignal;
}

export const CallRecordingService = {
  /** Recordings of a call, newest first. */
  async getRecordings(callId: string): Promise<CallRecording[]> {
    const { data } = await apiClient.get<CallRecordingListResponse>(recordingsUrl(callId));
    return data.results;
  },

  /** `POST` multipart. Only a completed call accepts recordings. */
  async uploadRecording(
    callId: string,
    file: File | Blob,
    fileName: string,
    { durationSeconds, onProgress, signal }: UploadRecordingOptions = {},
  ): Promise<CallRecording> {
    const form = new FormData();
    form.append("file", file, fileName);
    if (typeof durationSeconds === "number" && Number.isFinite(durationSeconds) && durationSeconds >= 0) {
      form.append("duration_seconds", String(Math.round(durationSeconds)));
    }

    const { data } = await apiClient.post<CallRecording>(recordingsUrl(callId), form, {
      // The client defaults to JSON; overriding it lets the browser add the
      // multipart boundary for FormData.
      headers: { "Content-Type": "multipart/form-data" },
      onUploadProgress: onProgress,
      signal,
    });
    return data;
  },

  /** Deletes the recording and its audio file; returns the backend's confirmation. */
  async deleteRecording(callId: string, recordingId: string): Promise<string> {
    const { data } = await apiClient.delete<{ message?: string; detail?: string }>(
      `${recordingsUrl(callId)}${recordingId}/`,
    );
    return data?.message ?? data?.detail ?? "Recording deleted successfully.";
  },

  /**
   * The audio itself. It has no public URL, so it is fetched with the bearer
   * token as a Blob (callers play an object URL made from it).
   */
  async getRecordingBlob(callId: string, recordingId: string, download = false): Promise<Blob> {
    const { data } = await apiClient.get<Blob>(`${recordingsUrl(callId)}${recordingId}/file/`, {
      responseType: "blob",
      params: download ? { download: 1 } : undefined,
    });
    return data;
  },
};
