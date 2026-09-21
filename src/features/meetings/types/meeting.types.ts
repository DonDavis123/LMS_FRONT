export const MEETING_VENUES = ["In-office", "Client location", "Online"] as const;
export type MeetingVenue = (typeof MEETING_VENUES)[number];
export const MEETING_REPEAT_TYPES = ["None", "Daily", "Weekly", "Monthly", "Yearly"] as const;
export type MeetingRepeatType = (typeof MEETING_REPEAT_TYPES)[number];

export type MeetingParticipantType = "user" | "lead" | "contact" | "email";

export interface MeetingParticipant {
  id: string;
  name: string;
  email?: string | null;
  /**
   * Identifies the source record so User/Lead/Contact IDs are never
   * treated as interchangeable participant identities.
   *
   * Optional for backwards compatibility with meetings saved before
   * participant types were introduced. Legacy participants are normalized
   * as users when loaded by MeetingForm.
   */
  type?: MeetingParticipantType;
}

export interface Meeting {
  id: string; title: string; owner_id: string; owner_name?: string | null;
  meeting_venue?: MeetingVenue; location: string | null;
  from_datetime: string; to_datetime: string | null; all_day: boolean;
  participants?: MeetingParticipant[]; repeat_type?: MeetingRepeatType;
  description: string | null;
  lead_id: string | null; lead_name?: string | null;
  contact_id: string | null; contact_name?: string | null;
  account_id: string | null; account_name?: string | null;
  created_at: string; updated_at: string;
}

export interface CreateMeetingPayload {
  title: string; owner_id: string; owner_name?: string | null;
  meeting_venue?: MeetingVenue; location?: string | null;
  from_datetime: string; to_datetime?: string | null; all_day?: boolean;
  participants?: MeetingParticipant[]; repeat_type?: MeetingRepeatType;
  description?: string | null;
  lead_id?: string | null; lead_name?: string | null;
  contact_id?: string | null; contact_name?: string | null;
  account_id?: string | null; account_name?: string | null;
}
export type UpdateMeetingPayload = Partial<CreateMeetingPayload>;
