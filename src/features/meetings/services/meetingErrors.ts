import type {
  ConferenceProvider,
  ConferenceStatus,
  MeetingConferenceFields,
} from "@/features/meetings/types/meeting.types";

/** `code` the backend sends when the meeting host has not connected Google. */
export const GOOGLE_NOT_CONNECTED_CODE = "google_not_connected";

/**
 * Error thrown by MeetingService for failed writes. Keeps the HTTP status, the
 * backend's machine-readable `code` and — for the conference endpoint's 400/502
 * bodies — the conference fields the server saved on the meeting.
 */
export class MeetingApiError extends Error {
  readonly status: number | null;
  readonly code: string | null;
  readonly conference: MeetingConferenceFields | null;

  constructor(
    message: string,
    options: {
      status?: number | null;
      code?: string | null;
      conference?: MeetingConferenceFields | null;
    } = {},
  ) {
    super(message);
    this.name = "MeetingApiError";
    this.status = options.status ?? null;
    this.code = options.code ?? null;
    this.conference = options.conference ?? null;
  }

  get isGoogleNotConnected(): boolean {
    return this.code === GOOGLE_NOT_CONNECTED_CODE;
  }
}

const STATUSES: ConferenceStatus[] = ["none", "created", "failed"];

function readConference(body: Record<string, unknown>): MeetingConferenceFields | null {
  const status = body.conference_status;
  if (typeof status !== "string" || !STATUSES.includes(status as ConferenceStatus)) {
    return null;
  }
  return {
    meet_link: typeof body.meet_link === "string" ? body.meet_link : null,
    conference_provider:
      body.conference_provider === "google_meet"
        ? ("google_meet" as ConferenceProvider)
        : null,
    conference_status: status as ConferenceStatus,
    conference_error:
      typeof body.conference_error === "string" ? body.conference_error : null,
  };
}

function firstFieldMessage(body: Record<string, unknown>): string | null {
  for (const value of Object.values(body)) {
    if (typeof value === "string") return value;
    if (Array.isArray(value) && typeof value[0] === "string") return value[0];
  }
  return null;
}

/** Turns any thrown value (usually an axios error) into a MeetingApiError. */
export function toMeetingApiError(error: unknown, fallback: string): MeetingApiError {
  if (error instanceof MeetingApiError) return error;

  const response = (
    error as { response?: { status?: number; data?: unknown } } | null
  )?.response;
  const data = response?.data;

  if (data && typeof data === "object" && !Array.isArray(data)) {
    const body = data as Record<string, unknown>;
    const message =
      (typeof body.detail === "string" && body.detail) ||
      (typeof body.message === "string" && body.message) ||
      firstFieldMessage(body) ||
      fallback;
    return new MeetingApiError(message, {
      status: response?.status ?? null,
      code: typeof body.code === "string" ? body.code : null,
      conference: readConference(body),
    });
  }

  return new MeetingApiError(fallback, { status: response?.status ?? null });
}
