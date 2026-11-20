import type { BriefingBucket, BriefingTask } from "@/features/dashboard/types/dailyBriefing.types";
import { diffInDays, formatShortDate, parseDateKey, priorityTone, type PriorityTone } from "@/features/dashboard/utils/dashboardMetrics";
import type { TaskPriority } from "@/features/tasks/types/task.types";

export interface BriefingBucketMeta {
  value: BriefingBucket;
  label: string;
  hint: string;
  /** Colour of the small dot next to the group heading. */
  dot: string;
}

/** The groups of the plan, in the order they are shown. */
export const BRIEFING_BUCKETS: readonly BriefingBucketMeta[] = [
  { value: "do_first", label: "Do first", hint: "Start here", dot: "var(--color-amber)" },
  { value: "do_next", label: "Then, today", hint: "After the first ones", dot: "var(--color-slate)" },
  { value: "can_wait", label: "Can wait", hint: "Not needed today", dot: "color-mix(in srgb, var(--color-ink-soft) 55%, transparent)" },
];

export function groupByBucket(tasks: BriefingTask[]): Record<BriefingBucket, BriefingTask[]> {
  const groups: Record<BriefingBucket, BriefingTask[]> = { do_first: [], do_next: [], can_wait: [] };
  for (const task of tasks) groups[task.bucket]?.push(task);
  return groups;
}

const PRIORITY_DOT: Record<PriorityTone, string> = {
  danger: "var(--color-danger)",
  slate: "var(--color-slate)",
  muted: "color-mix(in srgb, var(--color-ink-soft) 55%, transparent)",
};

export function briefingPriorityDot(priority: TaskPriority): string {
  return PRIORITY_DOT[priorityTone(priority)];
}

/** Due text from the backend's own urgency, so it always matches what the plan was based on. */
export function briefingDueLabel(task: BriefingTask, now: Date = new Date()): { text: string; overdue: boolean } {
  switch (task.urgency) {
    case "overdue":
      return { text: `${task.days_overdue} ${task.days_overdue === 1 ? "day" : "days"} overdue`, overdue: true };
    case "today":
      return { text: "Due today", overdue: false };
    case "no_due_date":
      return { text: "No due date", overdue: false };
    default: {
      const due = task.due_date ? parseDateKey(task.due_date) : null;
      if (!due) return { text: "Upcoming", overdue: false };
      return { text: diffInDays(due, now) === 1 ? "Tomorrow" : formatShortDate(due), overdue: false };
    }
  }
}
