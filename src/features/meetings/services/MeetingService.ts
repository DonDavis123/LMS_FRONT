import { apiClient } from "@/infrastructure/api/client";
import type { PaginatedResponse } from "@/shared/types/pagination";
import type {
  CreateMeetingPayload,
  Meeting,
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
}

function mapListItem(item: BackendMeetingListItem): MeetingListItem {
  return item;
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
  };
}

export const MeetingService = {
  async getMeetingsPage(
    page = 1,
    pageSize = DEFAULT_PAGE_SIZE,
  ): Promise<PaginatedResponse<MeetingListItem>> {
    const { data } = await apiClient.get<{
      results: BackendMeetingListItem[];
      pagination: PaginatedResponse<MeetingListItem>["pagination"];
    }>("/meetings/", {
      params: {
        page,
        page_size: Math.min(pageSize, 50),
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

  async createMeeting(payload: CreateMeetingPayload): Promise<Meeting> {
    const { data } = await apiClient.post<MeetingWriteResponse>("/meetings/", payload);
    return this.getMeeting(data.id);
  },

  async updateMeeting(id: string, payload: UpdateMeetingPayload): Promise<Meeting> {
    const { data } = await apiClient.patch<MeetingWriteResponse>(
      `/meetings/${id}/`,
      payload,
    );
    return this.getMeeting(data.id);
  },

  async deleteMeeting(id: string): Promise<string> {
    const { data } = await apiClient.delete<{ message?: string; detail?: string }>(
      `/meetings/${id}/`,
    );
    return data.message ?? data.detail ?? "Meeting deleted successfully";
  },
};
