/**
 * Types for the transcript + summary of a call recording. They mirror the
 * backend `/calls/<call_id>/recordings/<recording_id>/transcript/` API
 * (see docs/call-transcription-api.md).
 */

export type TranscriptStatus = "NOT_REQUESTED" | "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";

/** One speaker turn. `timestamp` is `MM:SS` from the start of the audio, or null. */
export interface TranscriptSegment {
  speaker: string;
  timestamp: string | null;
  text: string;
}

/** `GET` / `POST /calls/<call_id>/recordings/<recording_id>/transcript/` */
export interface RecordingTranscript {
  recording_id: string;
  call_id: string;
  status: TranscriptStatus;
  /** Main spoken language, in English ("Malayalam"). */
  language: string | null;
  summary: string;
  key_points: string[];
  action_items: string[];
  /** The whole transcript as one copy-ready text block. */
  transcript: string;
  segments: TranscriptSegment[];
  model: string | null;
  /** Safe to show to a user. Only set when `status` is FAILED. */
  error_message: string | null;
  requested_by_id: string | null;
  started_at: string | null;
  completed_at: string | null;
  updated_at: string | null;
}

/** A run that is still PENDING / PROCESSING. */
export function isTranscriptActive(status: TranscriptStatus): boolean {
  return status === "PENDING" || status === "PROCESSING";
}

/**
 * The backend treats an unfinished run older than this as abandoned (the
 * server restarted mid-run) and lets a new request queue it again. Mirrors
 * `CALL_TRANSCRIPTION_STALE_MINUTES`.
 */
export const TRANSCRIPT_STALE_MINUTES = 15;
