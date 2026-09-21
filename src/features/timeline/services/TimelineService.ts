import { apiClient } from "@/infrastructure/api/client";

export type TimelineModule = "leads" | "contacts" | "accounts";

export interface TimelineEvent {
  id: string;
  title: string;
  description?: string | null;
  type?: string | null;
  source?: string | null;
  user_name?: string | null;
  user?: string | null;
  actor_name?: string | null;
  event_type?: string | null;
  timestamp: string;
  raw?: Record<string, unknown>;
}

type TimelinePayload =
  | TimelineEvent[]
  | { results?: unknown[]; timeline?: unknown[]; events?: unknown[]; data?: unknown[] };

function asString(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) return value;
  if (typeof value === "number") return String(value);
  return null;
}

function normalizeEvent(value: unknown, index: number): TimelineEvent {
  const item = (value && typeof value === "object" ? value : {}) as Record<string, unknown>;
  const timestamp =
    asString(item.timestamp) ??
    asString(item.created_at) ??
    asString(item.updated_at) ??
    asString(item.date) ??
    new Date().toISOString();

  // Prefer the backend's human-readable `message` ("Lead status changed
  // from Junk Lead to Lost Lead.") over the raw `event_type` enum
  // ("LEAD_STATUS_CHANGED") as the primary line — the enum is still kept
  // on `event_type` for icon/grouping purposes, it just isn't shown as
  // the headline text anymore.
  const title =
    asString(item.title) ??
    asString(item.message) ??
    asString(item.action) ??
    asString(item.event) ??
    asString(item.event_type) ??
    asString(item.type) ??
    "Record activity";

  const description =
    asString(item.description) ??
    asString(item.details) ??
    asString(item.detail) ??
    null;

  return {
    id: asString(item.id) ?? `${timestamp}-${index}`,
    title,
    description,
    type: asString(item.type) ?? asString(item.event_type),
    source: asString(item.source),
    user_name: asString(item.user_name) ?? asString(item.username),
    user: typeof item.user === "string" ? item.user : null,
    actor_name:
      item.actor && typeof item.actor === "object"
        ? asString((item.actor as Record<string, unknown>).name)
        : asString(item.actor_name),
    event_type: asString(item.event_type),
    timestamp,
    raw: item,
  };
}

function extractEvents(payload: TimelinePayload): TimelineEvent[] {
  if (Array.isArray(payload)) return payload.map(normalizeEvent);
  const rows = payload.results ?? payload.timeline ?? payload.events ?? payload.data ?? [];
  return Array.isArray(rows) ? rows.map(normalizeEvent) : [];
}

export const TimelineService = {
  async getTimeline(module: TimelineModule, id: string): Promise<TimelineEvent[]> {
    const { data } = await apiClient.get<TimelinePayload>(`/timeline/${module}/${id}/`);
    return extractEvents(data);
  },
};
