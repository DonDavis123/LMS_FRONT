/**
 * Shape returned by GET/POST /reminders/ and GET/PATCH /reminders/{id}/.
 */
export interface Reminder {
  id: string;
  subject: string;
  remind_at: string; // ISO datetime
  user_id: string;
  task_id: string | null;
  meeting_id: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * A standalone reminder created from the profile menu is never linked to
 * a task or meeting — those are auto-synced by the backend instead (see
 * Task.reminder_at / Meeting reminder configuration). `user_id` is not
 * sent; the backend derives it from the authenticated request.
 */
export interface CreateReminderPayload {
  subject: string;
  remind_at: string;
}
