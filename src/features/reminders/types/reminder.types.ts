/**
 * Shape returned by GET/POST /reminders/ and GET/PATCH /reminders/{id}/.
 *
 * A reminder the user created themselves (the "Reminder" page) has neither
 * `task_id` nor `meeting_id`. Reminders that the backend auto-syncs from a
 * Task's / Meeting's reminder time carry one of those ids — see
 * `isCustomReminder()` in `reminders/utils/reminder.utils.ts`.
 */
export interface Reminder {
  id: string;
  subject: string;
  remind_at: string; // ISO datetime
  user_id: string;
  task_id: string | null;
  meeting_id: string | null;
  /** Disabled reminders are kept but never turned into a notification. */
  is_enabled: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * A standalone reminder is never linked to a task or meeting. `user_id` is
 * not sent; the backend derives it from the authenticated request.
 * `is_enabled` defaults to true on the backend when omitted.
 */
export interface CreateReminderPayload {
  subject: string;
  remind_at: string;
  is_enabled?: boolean;
}

/** PATCH /reminders/{id}/ — any subset of the user-editable fields. */
export type UpdateReminderPayload = Partial<CreateReminderPayload>;
