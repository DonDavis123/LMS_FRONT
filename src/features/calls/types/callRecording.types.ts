/**
 * Types for call recordings. They mirror the backend
 * `/calls/<call_id>/recordings/` API (see docs/call-recordings-api.md).
 */

/** One recording attached to a completed call. */
export interface CallRecording {
  id: string;
  call_id: string;
  file_name: string;
  content_type: string;
  size_bytes: number;
  /** Null when the length could not be read from the audio. */
  duration_seconds: number | null;
  uploaded_by_id: string | null;
  uploaded_by_name: string | null;
  created_at: string;
  /** Authenticated stream endpoint. It needs the bearer token, so it is never used as an `<audio src>`. */
  file_path: string;
}

/** `GET /calls/<call_id>/recordings/` */
export interface CallRecordingListResponse {
  results: CallRecording[];
}

/**
 * Limits enforced by the backend (configurable there through
 * `CALL_RECORDING_MAX_MB` / `CALL_RECORDING_MAX_PER_CALL`). They are mirrored
 * only to refuse an obviously bad file before uploading; the backend's own
 * message is always what the user sees when it disagrees.
 */
export const MAX_RECORDING_MB = 25;
export const MAX_RECORDING_BYTES = MAX_RECORDING_MB * 1024 * 1024;
export const MAX_RECORDINGS_PER_CALL = 10;
export const MAX_RECORDING_DURATION_SECONDS = 86400;

/** Audio formats the backend accepts. */
export const RECORDING_EXTENSIONS = [
  "mp3",
  "m4a",
  "mp4",
  "aac",
  "wav",
  "ogg",
  "oga",
  "opus",
  "webm",
  "amr",
  "3gp",
  "flac",
] as const;

/** A recording chosen (or recorded) in the browser, waiting to be uploaded. */
export interface PendingRecording {
  file: File | Blob;
  name: string;
  /** Null when the length could not be read from the audio. */
  durationSeconds: number | null;
}
