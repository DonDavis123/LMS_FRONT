// Mirrored 1:1 from the backend's NotificationType enum
// (src/modules/notifications/domain/enums/notification_type.py) so the UI
// can never receive a value it doesn't know how to render.
export const NOTIFICATION_TYPES = [
  "REMINDER",
  "TASK_DUE_ONE_DAY",
  "TASK_DUE_TODAY",
  "MEETING_ONE_DAY",
  "MEETING_TODAY",
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

/**
 * Shape returned by GET /notifications/, GET /notifications/unread/ and
 * GET /notifications/{id}/. Follows the same flat `<relation>_id`
 * convention as Task/Reminder.
 */
export interface Notification {
  id: string;
  notification_type: NotificationType;
  title: string;
  message: string;
  user_id: string;
  task_id: string | null;
  meeting_id: string | null;
  reminder_id: string | null;
  scheduled_for: string; // ISO datetime
  expires_at: string; // ISO datetime
  is_read: boolean;
  read_at: string | null; // ISO datetime
  created_at: string;
  updated_at: string;
}
