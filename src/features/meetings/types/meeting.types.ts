export type MeetingRelatedRecordType = "LEAD" | "CONTACT";
export type MeetingParticipantType = "user" | "lead" | "contact";

export type ConferenceStatus = "none" | "created" | "failed";
export type ConferenceProvider = "google_meet";

export interface MeetingParticipant {
  id: string;
  name: string;
  email?: string | null;
  /** Secondary line shown in pickers (company, account…); never sent to the API. */
  detail?: string | null;
  type: MeetingParticipantType;
}

export interface MeetingRelatedRecord {
  id: string;
  type: MeetingRelatedRecordType;
  name: string;
  email?: string | null;
}

/** Someone who should be emailed about a meeting but has no usable address. */
export interface EmailSkippedRecipient {
  name: string;
  type: "USER" | "LEAD" | "CONTACT";
  role: "host" | "participant" | "related";
  reason: "no_email" | "invalid_email";
}

export interface MeetingListRelatedItem {
  type: MeetingRelatedRecordType;
  name: string;
}

export interface MeetingListItem {
  id: string;
  title: string;
  start_at: string;
  end_at: string;
  related_to_type: MeetingRelatedRecordType | null;
  related_to_names: string[];
  /** Every related lead/contact with its type (a meeting can have both). */
  related_to: MeetingListRelatedItem[];
  contact_names: string[];
  host_id: string;
  host_name: string;
  meet_link: string | null;
  conference_status: ConferenceStatus;
}

export interface Meeting {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  is_all_day: boolean;
  start_at: string;
  end_at: string;
  host_id: string;
  host_name: string;
  created_by_id: string;
  created_by_name: string;
  created_at: string;
  updated_at: string;
  related_to: MeetingRelatedRecord[];
  participants: MeetingParticipant[];
  meet_link: string | null;
  conference_provider: ConferenceProvider | null;
  conference_status: ConferenceStatus;
  conference_error: string | null;
  /** Invitations, updates and reminders are emailed (with or without Meet). */
  send_email_notifications: boolean;
  /** Only on the result of a save: who could not be emailed. */
  email_skipped?: EmailSkippedRecipient[];
}

/** The conference-related fields shared by Meeting and the conference endpoint. */
export type MeetingConferenceFields = Pick<
  Meeting,
  "meet_link" | "conference_provider" | "conference_status" | "conference_error"
>;

export interface MeetingParticipantPayload {
  leads?: string[];
  contacts?: string[];
  users?: string[];
}

export interface RelatedToPayload {
  type: MeetingRelatedRecordType;
  ids: string[];
}

export interface CreateMeetingPayload {
  title: string;
  description?: string | null;
  location?: string | null;
  is_all_day?: boolean;
  start_at: string;
  end_at: string;
  host_id: string;
  /** One group per record type, e.g. leads and contacts together. `null`/`[]` clears it. */
  related_to?: RelatedToPayload[] | null;
  participants?: MeetingParticipantPayload;
  /** Create only: also create a Google Meet link + Calendar invite. */
  add_google_meet?: boolean;
  /** Email everyone (host, participants, Related To) invites, updates and a reminder. */
  send_email_notifications?: boolean;
}

export type UpdateMeetingPayload = Partial<
  Omit<CreateMeetingPayload, "add_google_meet">
>;

export interface MeetingWriteResponse {
  id: string;
  message: string;
  meet_link?: string | null;
  conference_status?: ConferenceStatus;
  conference_error?: string | null;
  send_email_notifications?: boolean;
  email_skipped?: EmailSkippedRecipient[];
}

/** Result of creating a meeting. `warning` is set when it saved but Meet failed. */
export interface MeetingCreateResult extends MeetingWriteResponse {
  warning: string | null;
}

/** Response of POST /meetings/{id}/conference/. */
export interface MeetingConferenceResponse extends MeetingConferenceFields {
  id: string;
  message?: string;
}
