import type { LeadSource, LeadStatus } from "@/features/leads/types/lead.types";
import type { Task } from "@/features/tasks/types/task.types";

export type DashboardRange = 7 | 30 | 90;
export const DASHBOARD_RANGES: readonly DashboardRange[] = [7, 30, 90];
export const DEFAULT_DASHBOARD_RANGE: DashboardRange = 30;

export interface DailyCount {
  date: string; // YYYY-MM-DD, local calendar day
  count: number;
}

export interface DashboardStats {
  range_days: DashboardRange;
  generated_at: string;
  leads: {
    total: number;
    new_in_range: number;
    /** Same-length window immediately before the selected range. */
    new_previous_range: number;
    /** null when the backend cannot report it. */
    converted: number | null;
    by_status: { status: LeadStatus; count: number }[];
    by_source: { source: LeadSource; count: number }[];
    created_per_day: DailyCount[];
  };
  /** Per-day/source data was built from a capped sample of leads. */
  is_sampled: boolean;
  /** At least one per-status count failed and was reported as 0. */
  is_partial: boolean;
}

export interface MyTasksData {
  /** Up to 50 open tasks of the current user, soonest due date first. */
  tasks: Task[];
  /** True number of open tasks (server pagination total). */
  total: number;
}

export type ScheduleItemKind = "Meeting" | "Call";

export interface ScheduleItem {
  id: string;
  kind: ScheduleItemKind;
  title: string;
  start: Date;
  end: Date;
  detail: string;
  href: string;
}

export type DeltaKind = "up" | "down" | "flat" | "new";

export interface Delta {
  kind: DeltaKind;
  /** Absolute whole percent; 0 for "flat" and "new". */
  percent: number;
}

export type AsyncState<T> =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; data: T };
