"use client";

import { Bell, CalendarClock, Users, X } from "lucide-react";
import {
  notificationTime,
  type Notification,
  type NotificationType,
} from "@/features/notifications/types/notification.types";
import { formatRelativeTime } from "@/shared/utils/formatDate";

const TYPE_ICON: Record<NotificationType, typeof Bell> = {
  REMINDER: Bell,
  TASK_DUE_ONE_DAY: CalendarClock,
  TASK_DUE_TODAY: CalendarClock,
  MEETING_ONE_DAY: Users,
  MEETING_TODAY: Users,
};

interface NotificationDropdownProps {
  notifications: Notification[];
  isLoading: boolean;
  onSelect: (notification: Notification) => void;
  onDismiss: (id: string) => void;
}

export default function NotificationDropdown({
  notifications,
  isLoading,
  onSelect,
  onDismiss,
}: NotificationDropdownProps) {
  const sorted = [...notifications].sort(
    (a, b) => new Date(notificationTime(b)).getTime() - new Date(notificationTime(a)).getTime()
  );

  return (
    <div className="absolute right-0 top-full z-20 mt-1 w-80 max-w-[calc(100vw-2rem)] rounded-md max-sm:inset-x-3 max-sm:right-3 max-sm:w-auto max-sm:max-w-none border border-line bg-surface shadow-lg animate-menu-in">
      <div className="border-b border-line px-3 py-2.5">
        <p className="text-sm font-semibold text-fg">Notifications</p>
      </div>

      <div className="max-h-96 overflow-y-auto">
        {isLoading ? (
          <p className="px-3 py-6 text-center text-sm text-ink-soft">Loading…</p>
        ) : sorted.length === 0 ? (
          <p className="px-3 py-6 text-center text-sm text-ink-soft">No notifications</p>
        ) : (
          sorted.map((notification) => {
            const Icon = TYPE_ICON[notification.notification_type] ?? Bell;
            return (
              <div
                key={notification.id}
                role="button"
                tabIndex={0}
                onClick={() => onSelect(notification)}
                onKeyDown={(event) => {
                  if (event.target !== event.currentTarget) return;
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onSelect(notification);
                  }
                }}
                className={`group relative flex w-full items-start gap-2.5 border-b border-line px-3 py-2.5 text-left transition last:border-b-0 hover:bg-paper ${
                  notification.is_read ? "" : "bg-slate-light/30"
                }`}
              >
                <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-paper text-ink-soft">
                  <Icon size={14} />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-fg">{notification.title}</p>
                  <p className="mt-0.5 line-clamp-2 text-xs text-ink-soft">{notification.message}</p>
                  <p className="mt-1 text-[11px] text-ink-soft">
                    {formatRelativeTime(notificationTime(notification))}
                  </p>
                </div>

                {!notification.is_read && (
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-slate">
                    <span className="sr-only">Unread</span>
                  </span>
                )}

                <button
                  type="button"
                  aria-label={`Dismiss notification: ${notification.title}`}
                  onClick={(event) => {
                    event.stopPropagation();
                    onDismiss(notification.id);
                  }}
                  className="absolute right-1.5 top-1.5 rounded-md p-1 text-ink-soft opacity-0 transition hover:bg-surface hover:text-fg focus-visible:opacity-100 group-hover:opacity-100 max-sm:p-2 max-sm:opacity-100"
                >
                  <X size={12} />
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
