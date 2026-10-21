/**
 * Types for the Calls module. They mirror the backend `/calls/` API:
 * a call is logged against exactly one Lead or Contact (an Account can be
 * attached only to a Contact call), with an outcome, a duration in seconds
 * and free-text notes (`description`).
 */
export const CALL_TYPES = ["Outbound", "Inbound"] as const;
export type CallType = (typeof CALL_TYPES)[number];
export const DEFAULT_CALL_TYPE: CallType = "Outbound";

export const CALL_OUTCOMES = [
  "Connected",
  "Not Attended",
  "Busy",
  "Voicemail",
  "Wrong Number",
  "Callback Requested",
] as const;
export type CallOutcome = (typeof CALL_OUTCOMES)[number];
export const DEFAULT_CALL_OUTCOME: CallOutcome = "Connected";

export const CALL_ENTRY_METHODS = ["MANUAL", "TIMER"] as const;
export type CallEntryMethod = (typeof CALL_ENTRY_METHODS)[number];

/** Limits enforced by the backend. */
export const MAX_CALL_DURATION_SECONDS = 86400;
export const MAX_CALL_NOTES_LENGTH = 1000;
/** The backend rejects start times more than 5 minutes in the future. */
export const CALL_FUTURE_TOLERANCE_MS = 5 * 60 * 1000;

export type CallRecordType = "LEAD" | "CONTACT";

/** One row of `GET /calls/` (also the base of the detail response). */
export interface Call {
  id: string;
  lead_id: string | null;
  lead_name: string | null;
  contact_id: string | null;
  contact_name: string | null;
  account_id: string | null;
  account_name: string | null;
  owner_id: string;
  owner_name: string | null;
  call_type: CallType;
  outcome: CallOutcome;
  call_start_time: string; // ISO datetime
  duration_seconds: number;
  duration_label: string;
  description: string | null;
  entry_method: CallEntryMethod;
  created_by_id: string;
  created_at: string;
  updated_at: string;
}

export interface CallRelatedRecord {
  type: CallRecordType;
  id: string;
  name: string | null;
}

export interface CallChange {
  old_value: unknown;
  new_value: unknown;
}

/** One entry of a call's change history (logged / updated). */
export interface CallHistoryEvent {
  id: string;
  event_type: string; // CALL_LOGGED | CALL_UPDATED | ...
  actor: { id: string; name: string };
  message: string;
  /** field -> { old_value, new_value }. Empty for CALL_LOGGED. */
  changes: Record<string, CallChange>;
  created_at: string;
}

/** Another call logged on the same lead / contact. */
export interface RelatedCall {
  id: string;
  call_start_time: string;
  duration_seconds: number;
  duration_label: string;
  outcome: CallOutcome;
  call_type: CallType;
  description: string | null;
  owner_name: string | null;
}

/** `GET /calls/{id}/` */
export interface CallDetail extends Call {
  related_record: CallRelatedRecord;
  change_history: CallHistoryEvent[];
  related_calls: RelatedCall[];
  total_calls_for_record: number;
}

/** `POST /calls/` */
export interface CreateCallPayload {
  lead_id?: string | null;
  contact_id?: string | null;
  account_id?: string | null;
  owner_id?: string | null;
  call_type?: CallType;
  outcome: CallOutcome;
  call_start_time: string; // ISO datetime
  duration_seconds?: number;
  description?: string | null;
  entry_method?: CallEntryMethod;
}

/**
 * `PATCH /calls/{id}/` — only these fields are editable; the lead / contact /
 * account / owner / entry method are fixed once a call is logged (the backend
 * rejects them).
 */
export interface UpdateCallPayload {
  call_start_time?: string;
  duration_seconds?: number;
  call_type?: CallType;
  outcome?: CallOutcome;
  description?: string | null;
}

/** The newest call event on a lead / contact (call logged, edited or deleted). */
export interface CallLatestUpdate {
  id: string;
  event_type: string; // CALL_LOGGED | CALL_UPDATED | CALL_DELETED
  actor: { id: string; name: string };
  message: string;
  call_id: string | null;
  /** field -> { old_value, new_value }. Empty unless the event is CALL_UPDATED. */
  changes: Record<string, CallChange>;
  created_at: string;
}

/**
 * One row of `GET /calls/records/`: a lead or contact listed ONCE, however
 * many calls were logged on it.
 */
export interface CallRecordRow {
  record_type: CallRecordType;
  record_id: string;
  record_name: string | null;
  /** Active calls on this lead / contact. */
  call_count: number;
  /** Last time any call on the record was logged or edited. */
  last_updated_at: string;
  /** The record's most recent call (by start time). */
  latest_call: Call;
  latest_update: CallLatestUpdate | null;
}

/** A call as it was when a history event happened. Any field can be null. */
export interface CallHistorySnapshot {
  call_start_time: string | null;
  call_type: CallType | null;
  outcome: CallOutcome | null;
  duration_seconds: number | null;
  duration_label: string | null;
  description: string | null;
  owner_name: string | null;
}

export interface CallRecordHistoryEvent {
  id: string;
  event_type: string; // CALL_LOGGED | CALL_UPDATED | CALL_DELETED
  call_id: string | null;
  actor: { id: string; name: string };
  message: string;
  changes: Record<string, CallChange>;
  created_at: string;
  call: CallHistorySnapshot;
}

/** `GET /calls/{id}/history/` — every call event on the call's lead / contact. */
export interface CallRecordHistory {
  related_record: CallRelatedRecord;
  total_calls_for_record: number;
  events: CallRecordHistoryEvent[];
}
