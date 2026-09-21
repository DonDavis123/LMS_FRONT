/**
 * There's no `/calls/` endpoint on the backend yet (only Tasks was
 * confirmed), so this module is client-side (localStorage) for now — see
 * CallService.ts.
 */
export const CALL_TYPES = ["Outbound", "Inbound"] as const;
export type CallType = (typeof CALL_TYPES)[number];
export const DEFAULT_CALL_TYPE: CallType = "Outbound";

export const CALL_STATUSES = ["Scheduled", "Completed", "Not Attended", "Cancelled"] as const;
export type CallStatus = (typeof CALL_STATUSES)[number];
export const DEFAULT_CALL_STATUS: CallStatus = "Scheduled";

export interface Call {
  id: string;
  subject: string;
  owner_id: string;
  owner_name?: string | null;
  call_type: CallType;
  call_status: CallStatus;
  call_start_time: string | null; // ISO datetime
  call_duration_minutes: number | null;
  description: string | null;
  lead_id: string | null;
  lead_name?: string | null;
  contact_id: string | null;
  contact_name?: string | null;
  account_id: string | null;
  account_name?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateCallPayload {
  subject: string;
  owner_id: string;
  owner_name?: string | null;
  call_type?: CallType;
  call_status?: CallStatus;
  call_start_time?: string | null;
  call_duration_minutes?: number | null;
  description?: string | null;
  lead_id?: string | null;
  lead_name?: string | null;
  contact_id?: string | null;
  contact_name?: string | null;
  account_id?: string | null;
  account_name?: string | null;
}

export type UpdateCallPayload = Partial<CreateCallPayload>;
