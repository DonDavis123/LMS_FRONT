export type MeetingRelatedRecordType = "LEAD" | "CONTACT";
export type MeetingParticipantType = "user" | "lead" | "contact";

export interface MeetingParticipant {
  id: string;
  name: string;
  type: MeetingParticipantType;
}

export interface MeetingRelatedRecord {
  id: string;
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
  contact_names: string[];
  host_id: string;
  host_name: string;
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
}

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
  related_to?: RelatedToPayload | null;
  participants?: MeetingParticipantPayload;
}

export type UpdateMeetingPayload = Partial<CreateMeetingPayload>;

export interface MeetingWriteResponse {
  id: string;
  message: string;
}
