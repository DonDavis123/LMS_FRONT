import { apiClient } from "@/infrastructure/api/client";
import type { PaginatedResponse } from "@/shared/types/pagination";
import type { SortState } from "@/shared/types/sort";
import {
  toMeetingApiError,
} from "@/features/meetings/services/meetingErrors";
import type {
  ConferenceProvider,
  ConferenceStatus,
  CreateMeetingPayload,
  Meeting,
  MeetingConferenceResponse,
  MeetingCreateResult,
  MeetingListItem,
  MeetingParticipant,
  MeetingRelatedRecord,
  MeetingWriteResponse,
  UpdateMeetingPayload,
} from "@/features/meetings/types/meeting.types";

const DEFAULT_PAGE_SIZE = 10;

interface BackendMeetingListItem {
  id: string;
  title: string;
  start_at: string;
  end_at: string;
  related_to_type: "LEAD" | "CONTACT" | null;
  related_to_names: string[];
  contact_names: string[];
  host_id: string;
  host_name: string;
  meet_link?: string | null;
  conference_status?: ConferenceStatus;
}

interface BackendMeetingDetail {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  is_all_day: boolean;
  start_at: string;
  end_at: string;
  host: {
    id: string;
    name: string;
  };
  created_by: {
    id: string;
    name: string;
  };
  created_at: string;
  updated_at: string;
  related_to: Array<{
    id: string;
    record_type: "LEAD" | "CONTACT";
    name: string;
  }>;
  participants: Array<{
    id: string;
    participant_type: "LEAD" | "USER" | "CONTACT";
    name: string;
  }>;
  meet_link?: string | null;
  conference_provider?: ConferenceProvider | null;
  conference_status?: ConferenceStatus;
  conference_error?: string | null;
}

function mapListItem(item: BackendMeetingListItem): MeetingListItem {
  return {
    ...item,
    meet_link: item.meet_link ?? null,
    conference_status: item.conference_status ?? "none",
  };
}

function mapParticipant(
  participant: BackendMeetingDetail["participants"][number],
): MeetingParticipant {
  const typeMap = {
    LEAD: "lead",
    USER: "user",
    CONTACT: "contact",
  } as const;

  return {
    id: participant.id,
    name: participant.name,
    type: typeMap[participant.participant_type],
  };
}

function mapRelatedRecord(
  record: BackendMeetingDetail["related_to"][number],
): MeetingRelatedRecord {
  return {
    id: record.id,
    name: record.name,
    type: record.record_type,
  };
}

function mapDetail(data: BackendMeetingDetail): Meeting {
  return {
    id: data.id,
    title: data.title,
    description: data.description,
    location: data.location,
    is_all_day: data.is_all_day,
    start_at: data.start_at,
    end_at: data.end_at,
    host_id: data.host.id,
    host_name: data.host.name,
    created_by_id: data.created_by.id,
    created_by_name: data.created_by.name,
    created_at: data.created_at,
    updated_at: data.updated_at,
    related_to: data.related_to.map(mapRelatedRecord),
    participants: data.participants.map(mapParticipant),
    meet_link: data.meet_link ?? null,
    conference_provider: data.conference_provider ?? null,
    conference_status: data.conference_status ?? "none",
    conference_error: data.conference_error ?? null,
  };
}

export const MeetingService = {
  async getMeetingsPage(
    page = 1,
    pageSize = DEFAULT_PAGE_SIZE,
    sort: SortState | null = null,
  ): Promise<PaginatedResponse<MeetingListItem>> {
    const { data } = await apiClient.get<{
      results: BackendMeetingListItem[];
      pagination: PaginatedResponse<MeetingListItem>["pagination"];
    }>("/meetings/", {
      params: {
        page,
        page_size: Math.min(pageSize, 50),
        ...(sort ? { sort_by: sort.field, sort_direction: sort.direction } : {}),
      },
    });

    return {
      results: data.results.map(mapListItem),
      pagination: data.pagination,
    };
  },

  async getMeetings(): Promise<MeetingListItem[]> {
    const data = await this.getMeetingsPage(1, 50);
    return data.results;
  },

  async getMeeting(id: string): Promise<Meeting> {
    const { data } = await apiClient.get<BackendMeetingDetail>(`/meetings/${id}/`);
    return mapDetail(data);
  },

  /**
   * Creates a meeting. A `201` with `conference_status: "failed"` still
   * resolves (the meeting exists); the caller gets it as `warning`.
   * Rejects with a MeetingApiError (`code`, `status`) on failure.
   */
  async createMeeting(payload: CreateMeetingPayload): Promise<MeetingCreateResult> {
    try {
      const { data } = await apiClient.post<MeetingWriteResponse>("/meetings/", payload);
      return {
        ...data,
        warning: data.conference_status === "failed" ? data.message : null,
      };
    } catch (error) {
      throw toMeetingApiError(error, "Couldn't save this meeting. Check the fields and try again.");
    }
  },

  /**
   * Updates a meeting and returns the fresh detail, which includes the
   * conference fields (`conference_error` is set when Google could not be
   * updated while the meeting itself saved).
   */
  async updateMeeting(id: string, payload: UpdateMeetingPayload): Promise<Meeting> {
    let writtenId = id;
    try {
      const { data } = await apiClient.patch<MeetingWriteResponse>(
        `/meetings/${id}/`,
        payload,
      );
      writtenId = data.id;
    } catch (error) {
      throw toMeetingApiError(error, "Couldn't save this meeting. Check the fields and try again.");
    }
    return this.getMeeting(writtenId);
  },

  /**
   * Adds Google Meet to a meeting, retries a failed attempt, or re-syncs a
   * meeting whose last Google update failed. Rejects with a MeetingApiError:
   * `code === "google_not_connected"` (400) or, for 502, with `conference`
   * holding the state the server saved.
   */
  async addConference(id: string): Promise<MeetingConferenceResponse> {
    try {
      const { data } = await apiClient.post<MeetingConferenceResponse>(
        `/meetings/${id}/conference/`,
      );
      return {
        ...data,
        meet_link: data.meet_link ?? null,
        conference_provider: data.conference_provider ?? null,
        conference_error: data.conference_error ?? null,
      };
    } catch (error) {
      throw toMeetingApiError(error, "Couldn't set up Google Meet. Try again.");
    }
  },

  async deleteMeeting(id: string): Promise<string> {
    const { data } = await apiClient.delete<{ message?: string; detail?: string }>(
      `/meetings/${id}/`,
    );
    return data.message ?? data.detail ?? "Meeting deleted successfully";
  },
};
