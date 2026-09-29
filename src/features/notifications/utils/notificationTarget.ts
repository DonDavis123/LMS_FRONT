import type { Notification } from "@/features/notifications/types/notification.types";

/**
 * What clicking a notification should do.
 *
 * The backend identifies a notification's subject by its flat foreign keys,
 * not by a dedicated "kind" field: task notifications (and reminders tied to
 * a task) carry `task_id`, meeting ones carry `meeting_id`. A REMINDER with
 * neither is a custom reminder the user created themselves.
 */
export type NotificationTarget =
  | { kind: "task"; href: string }
  | { kind: "meeting"; href: string }
  | { kind: "custom" };

export function getNotificationTarget(notification: Notification): NotificationTarget {
  if (notification.task_id) {
    return { kind: "task", href: `/dashboard/tasks/${encodeURIComponent(notification.task_id)}` };
  }
  if (notification.meeting_id) {
    return { kind: "meeting", href: `/dashboard/meetings/${encodeURIComponent(notification.meeting_id)}` };
  }
  return { kind: "custom" };
}
