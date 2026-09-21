import type {
  CreateMeetingPayload,
  Meeting,
  UpdateMeetingPayload,
} from "@/features/meetings/types/meeting.types";

/**
 * There's no `/meetings/` endpoint on the backend yet, so this is kept
 * client-side (localStorage) for now — same async method shape
 * (`getX/createX/updateX/deleteX`) a real `apiClient`-backed service would
 * have, so swapping this for real HTTP calls later is a small, contained
 * change (only the inside of this file).
 */
const STORAGE_KEY = "crm.meetings";
const isBrowser = () => typeof window !== "undefined";

function readAll(): Meeting[] {
  if (!isBrowser()) return [];
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as Meeting[];
  } catch {
    return [];
  }
}

function writeAll(meetings: Meeting[]): void {
  if (!isBrowser()) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(meetings));
}

export const MeetingService = {
  async getMeetings(): Promise<Meeting[]> {
    return [...readAll()].sort((a, b) => (a.from_datetime < b.from_datetime ? 1 : -1));
  },

  async getMeeting(id: string): Promise<Meeting> {
    const meeting = readAll().find((m) => m.id === id);
    if (!meeting) throw new Error("Meeting not found");
    return meeting;
  },

  async createMeeting(payload: CreateMeetingPayload): Promise<Meeting> {
    const now = new Date().toISOString();
    const meeting: Meeting = {
      id: crypto.randomUUID(),
      title: payload.title,
      owner_id: payload.owner_id,
      owner_name: payload.owner_name ?? null,
      meeting_venue: payload.meeting_venue ?? "Client location",
      from_datetime: payload.from_datetime,
      to_datetime: payload.to_datetime ?? null,
      all_day: payload.all_day ?? false,
      participants: payload.participants ?? [],
      repeat_type: payload.repeat_type ?? "None",
      location: payload.location ?? null,
      description: payload.description ?? null,
      lead_id: payload.lead_id ?? null,
      lead_name: payload.lead_name ?? null,
      contact_id: payload.contact_id ?? null,
      contact_name: payload.contact_name ?? null,
      account_id: payload.account_id ?? null,
      account_name: payload.account_name ?? null,
      created_at: now,
      updated_at: now,
    };
    writeAll([meeting, ...readAll()]);
    return meeting;
  },

  async updateMeeting(id: string, payload: UpdateMeetingPayload): Promise<Meeting> {
    const all = readAll();
    const index = all.findIndex((m) => m.id === id);
    if (index === -1) throw new Error("Meeting not found");
    const updated: Meeting = { ...all[index], ...payload, updated_at: new Date().toISOString() };
    all[index] = updated;
    writeAll(all);
    return updated;
  },

  async deleteMeeting(id: string): Promise<string> {
    writeAll(readAll().filter((m) => m.id !== id));
    return "Meeting deleted successfully";
  },
};
