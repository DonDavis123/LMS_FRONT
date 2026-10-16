import { isAxiosError } from "axios";
import { apiClient } from "@/infrastructure/api/client";
import { CallService } from "@/features/calls/services/CallService";
import type { Call } from "@/features/calls/types/call.types";
import { LeadService } from "@/features/leads/services/LeadService";
import { LEAD_STATUSES, type Lead } from "@/features/leads/types/lead.types";
import { MeetingService } from "@/features/meetings/services/MeetingService";
import type { MeetingListItem } from "@/features/meetings/types/meeting.types";
import { TaskService } from "@/features/tasks/services/TaskService";
import type { TaskStatus } from "@/features/tasks/types/task.types";
import type { FilterCondition } from "@/shared/components/FilterBar";
import type { SortState } from "@/shared/types/sort";
import type {
  DailyCount,
  DashboardRange,
  DashboardStats,
  MyTasksData,
  ScheduleItem,
} from "@/features/dashboard/types/dashboard.types";
import {
  buildRangeWindow,
  bucketByDay,
  toLeadSource,
  toLeadStatus,
} from "@/features/dashboard/utils/dashboardMetrics";

const PAGE_SIZE = 50; // backend cap
const MAX_TREND_PAGES = 6; // 300 leads
const MY_TASKS_PAGE_SIZE = 50;
const SCHEDULE_LOOKAHEAD_DAYS = 7;
const MS_PER_HOUR = 3_600_000;
const DEFAULT_CALL_MINUTES = 30;

const COMPLETED_STATUS: TaskStatus = "Completed";

const NEWEST_FIRST: SortState = { field: "created_at", direction: "desc" };

/** Remembered after the first 404 so range changes don't re-probe a missing route. */
let statsEndpointMissing = false;

/* ── Narrowing helpers for the optional /dashboard/stats/ response ───── */

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asCount(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;
}

function parseStatsResponse(raw: unknown, range: DashboardRange, now: Date): DashboardStats | null {
  if (!isRecord(raw) || !isRecord(raw.leads)) return null;
  const leads = raw.leads;
  const total = asCount(leads.total);
  const newInRange = asCount(leads.new_in_range);
  const newPrevious = asCount(leads.new_previous_range);
  if (total === null || newInRange === null || newPrevious === null) return null;
  if (!Array.isArray(leads.by_status) || !Array.isArray(leads.by_source) || !Array.isArray(leads.created_per_day)) {
    return null;
  }

  const byStatus = leads.by_status.flatMap((item: unknown) => {
    const count = isRecord(item) ? asCount(item.count) : null;
    return isRecord(item) && count !== null ? [{ status: toLeadStatus(item.status), count }] : [];
  });
  const bySource = leads.by_source.flatMap((item: unknown) => {
    const count = isRecord(item) ? asCount(item.count) : null;
    return isRecord(item) && count !== null ? [{ source: toLeadSource(item.source), count }] : [];
  });

  // Re-key onto the client's own day list so every day exists and none is NaN.
  const perDay = new Map<string, number>();
  for (const item of leads.created_per_day as unknown[]) {
    const count = isRecord(item) ? asCount(item.count) : null;
    if (isRecord(item) && typeof item.date === "string" && count !== null) perDay.set(item.date.slice(0, 10), count);
  }
  const days = buildRangeWindow(range, now).days;
  const createdPerDay: DailyCount[] = days.map((date) => ({ date, count: perDay.get(date) ?? 0 }));

  return {
    range_days: range,
    generated_at: typeof raw.generated_at === "string" ? raw.generated_at : now.toISOString(),
    leads: {
      total,
      new_in_range: newInRange,
      new_previous_range: newPrevious,
      converted: asCount(leads.converted),
      by_status: byStatus,
      by_source: bySource,
      created_per_day: createdPerDay,
    },
    is_sampled: raw.is_sampled === true,
    is_partial: raw.is_partial === true,
  };
}

/* ── Fallback: compose the same stats from the existing list endpoints ── */

function createdBetween(from: Date, to: Date): FilterCondition {
  // Full ISO instants (not date-only) so the backend never re-interprets the
  // day boundaries in its own time zone.
  return { field: "created_at", operator: "between", value: { from: from.toISOString(), to: to.toISOString() } };
}

async function countLeads(filters: FilterCondition[]): Promise<number> {
  const page = await LeadService.getLeadsPage({ page: 1, page_size: 1, filters });
  return page.pagination.total;
}

async function fetchRangeLeads(filters: FilterCondition[]): Promise<{ leads: Lead[]; total: number; sampled: boolean }> {
  const request = (page: number) =>
    LeadService.getLeadsPage({ page, page_size: PAGE_SIZE, filters, sort: NEWEST_FIRST });

  const first = await request(1);
  const pages = Math.min(first.pagination.total_pages, MAX_TREND_PAGES);
  const rest = await Promise.all(Array.from({ length: Math.max(0, pages - 1) }, (_, index) => request(index + 2)));

  return {
    leads: [first, ...rest].flatMap((page) => page.results),
    total: first.pagination.total,
    sampled: first.pagination.total_pages > MAX_TREND_PAGES,
  };
}

/**
 * Request budget: 1 (total) + 1 (previous window) + 9 (one per status) +
 * 1–6 (range pages). A `/dashboard/stats/` endpoint replaces all of these
 * with a single call.
 *
 * `converted` is always null here: the leads list never returns converted
 * leads (the backend excludes them before filters apply), so an
 * `is_converted` filter could only ever report 0.
 */
async function composeStats(range: DashboardRange, now: Date): Promise<DashboardStats> {
  const window = buildRangeWindow(range, now);

  const [total, previous, statusResults, inRange] = await Promise.all([
    countLeads([]),
    countLeads([createdBetween(window.previousFrom, window.previousTo)]),
    Promise.allSettled(
      LEAD_STATUSES.map((status) => countLeads([{ field: "lead_status", operator: "equals", value: status }])),
    ),
    fetchRangeLeads([createdBetween(window.from, window.to)]),
  ]);

  const byStatus = LEAD_STATUSES.map((status, index) => {
    const result = statusResults[index];
    return { status, count: result.status === "fulfilled" ? result.value : 0 };
  });

  const sourceCounts = new Map<ReturnType<typeof toLeadSource>, number>();
  for (const lead of inRange.leads) {
    const source = toLeadSource(lead.lead_source);
    sourceCounts.set(source, (sourceCounts.get(source) ?? 0) + 1);
  }

  return {
    range_days: range,
    generated_at: now.toISOString(),
    leads: {
      total,
      new_in_range: inRange.total,
      new_previous_range: previous,
      converted: null,
      by_status: byStatus,
      by_source: [...sourceCounts.entries()].map(([source, count]) => ({ source, count })),
      created_per_day: bucketByDay(
        window.days,
        inRange.leads.map((lead) => lead.created_at),
      ),
    },
    is_sampled: inRange.sampled,
    is_partial: statusResults.some((result) => result.status === "rejected"),
  };
}

/* ── Schedule ───────────────────────────────────────────────────────── */

function meetingToItem(meeting: MeetingListItem): ScheduleItem | null {
  const start = new Date(meeting.start_at);
  if (Number.isNaN(start.getTime())) return null;
  const parsedEnd = new Date(meeting.end_at);
  const names = [...new Set([...meeting.related_to_names, ...meeting.contact_names])];
  return {
    id: `meeting-${meeting.id}`,
    kind: "Meeting",
    title: meeting.title,
    start,
    end: Number.isNaN(parsedEnd.getTime()) ? new Date(start.getTime() + MS_PER_HOUR) : parsedEnd,
    detail: names.slice(0, 2).join(", ") || meeting.host_name,
    href: `/dashboard/meetings/${meeting.id}`,
  };
}

function callToItem(call: Call): ScheduleItem | null {
  if (call.call_status !== "Scheduled" || !call.call_start_time) return null;
  const start = new Date(call.call_start_time);
  if (Number.isNaN(start.getTime())) return null;
  const minutes = call.call_duration_minutes ?? DEFAULT_CALL_MINUTES;
  return {
    id: `call-${call.id}`,
    kind: "Call",
    title: call.subject,
    start,
    end: new Date(start.getTime() + minutes * 60_000),
    detail: call.lead_name || call.contact_name || call.account_name || "",
    href: `/dashboard/calls/${call.id}`,
  };
}

async function readLocalCalls(): Promise<Call[]> {
  try {
    return await CallService.getCalls();
  } catch {
    return [];
  }
}

export const DashboardService = {
  /**
   * Prefers GET /dashboard/stats/. While that route doesn't exist (404) or
   * answers with an unrecognised shape, the same numbers are composed from the
   * list endpoints. Any other failure is thrown so the widget can show Retry.
   */
  async getStats(range: DashboardRange, now: Date = new Date()): Promise<DashboardStats> {
    if (!statsEndpointMissing) {
      try {
        const { data } = await apiClient.get<unknown>("/dashboard/stats/", { params: { range } });
        const parsed = parseStatsResponse(data, range, now);
        if (parsed) return parsed;
      } catch (error) {
        if (!(isAxiosError(error) && error.response?.status === 404)) throw error;
        statsEndpointMissing = true;
      }
    }
    return composeStats(range, now);
  },

  /** Open tasks owned by `userId` — the tasks API is company-wide, so the owner filter is mandatory. */
  async getMyTasks(userId: string): Promise<MyTasksData> {
    const page = await TaskService.getTasksPage({
      page: 1,
      page_size: MY_TASKS_PAGE_SIZE,
      filters: [
        { field: "owner", operator: "equals", value: userId },
        { field: "status", operator: "not_equals", value: COMPLETED_STATUS },
      ],
      sort: { field: "due_date", direction: "asc" },
    });
    return { tasks: page.results, total: page.pagination.total };
  },

  /**
   * The meetings API has no date filter, so the latest 50 by start time are
   * fetched and narrowed client-side. With more than 50 meetings in the
   * future the soonest ones can be missed until the backend gains a range
   * filter or an upcoming-meetings endpoint.
   */
  async getUpcomingSchedule(now: Date = new Date()): Promise<ScheduleItem[]> {
    const [meetings, calls] = await Promise.all([
      MeetingService.getMeetingsPage(1, 50, { field: "start_at", direction: "desc" }),
      readLocalCalls(),
    ]);

    const windowStart = now.getTime() - MS_PER_HOUR;
    const windowEnd = now.getTime() + SCHEDULE_LOOKAHEAD_DAYS * 24 * MS_PER_HOUR;

    return [...meetings.results.map(meetingToItem), ...calls.map(callToItem)]
      .filter((item): item is ScheduleItem => item !== null)
      .filter((item) => item.start.getTime() <= windowEnd && (item.start.getTime() >= windowStart || item.end.getTime() > now.getTime()))
      .sort((a, b) => a.start.getTime() - b.start.getTime());
  },

  async getRecentLeads(): Promise<Lead[]> {
    const page = await LeadService.getLeadsPage({ page: 1, page_size: 5, sort: NEWEST_FIRST });
    return page.results;
  },
};
