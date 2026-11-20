import type { TaskPriority, TaskStatus } from "@/features/tasks/types/task.types";

/**
 * `POST /dashboard/briefing/` — the AI plan for the signed-in user's day
 * (see docs/daily-briefing-api.md in the backend).
 *
 * Nothing is stored: every call costs one model request, so it only runs on a
 * click. The model only chooses the order and writes the `reason`; subjects,
 * dates, urgency and counts are the backend's own data.
 */
export type BriefingBucket = "do_first" | "do_next" | "can_wait";

/** How close a task's due date is, as computed by the backend. */
export type BriefingUrgency = "overdue" | "today" | "upcoming" | "no_due_date";

export interface BriefingTask {
  /** 1 = do this first. Already sorted by bucket. */
  rank: number;
  task_id: string;
  subject: string;
  priority: TaskPriority;
  status: TaskStatus;
  due_date: string | null; // YYYY-MM-DD
  urgency: BriefingUrgency;
  /** 0 unless `urgency` is "overdue". */
  days_overdue: number;
  related_to: string | null;
  bucket: BriefingBucket;
  /** One short sentence from the model: why the task sits at this position. */
  reason: string;
}

export interface BriefingCounts {
  overdue_tasks: number;
  due_today_tasks: number;
  /** Meetings the user hosts that have not ended yet today. */
  meetings_today: number;
  /** True number of open tasks (the plan may be written from fewer). */
  open_tasks_total: number;
  tasks_considered: number;
}

export interface DailyBriefing {
  /** Local calendar day the plan is for, YYYY-MM-DD. */
  date: string;
  /** ISO timestamp of when the plan was written. */
  generated_at: string;
  /** null when no model was needed (nothing to plan). */
  model_name: string | null;
  /** One or two sentences: how heavy the day is and what to do first. */
  headline: string;
  counts: BriefingCounts;
  priorities: BriefingTask[];
  /** Up to 3 short warnings or tips (meeting squeeze, overdue pile-up…). */
  heads_up: string[];
}
