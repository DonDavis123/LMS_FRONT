import type { Reminder } from "@/features/reminders/types/reminder.types";

/**
 * True for reminders the user created on the Reminder page.
 *
 * The backend has no separate "type" column: task- and meeting-driven
 * reminders are the rows with `task_id` / `meeting_id` set (its
 * ReminderSyncService creates them), and a standalone reminder has both null.
 */
export function isCustomReminder(reminder: Reminder): boolean {
  return !reminder.task_id && !reminder.meeting_id;
}

function timeOf(reminder: Reminder): number {
  const value = Date.parse(reminder.remind_at);
  return Number.isNaN(value) ? Number.POSITIVE_INFINITY : value;
}

/** True when the reminder's time is already behind us. */
export function isReminderInPast(reminder: Pick<Reminder, "remind_at">, now: number = Date.now()): boolean {
  const value = Date.parse(reminder.remind_at);
  return !Number.isNaN(value) && value <= now;
}

/**
 * Upcoming reminders first (soonest first), then any past ones (most recent
 * first). Compares parsed timestamps, never formatted strings.
 */
export function sortReminders(reminders: Reminder[], now: number = Date.now()): Reminder[] {
  return [...reminders].sort((a, b) => {
    const aPast = timeOf(a) <= now;
    const bPast = timeOf(b) <= now;
    if (aPast !== bPast) return aPast ? 1 : -1;
    return aPast ? timeOf(b) - timeOf(a) : timeOf(a) - timeOf(b);
  });
}
