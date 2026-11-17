"use client";

import { useState } from "react";
import { Bell, BellOff, CalendarClock, CheckCheck, FileUp, Undo2, Users, X } from "lucide-react";
import {
  notificationTime,
  type Notification,
  type NotificationType,
} from "@/features/notifications/types/notification.types";
import { formatRelativeTime } from "@/shared/utils/formatDate";

const TYPE_STYLE: Record<NotificationType, { icon: typeof Bell; tile: string }> = {
  REMINDER: { icon: Bell, tile: "bg-amber/15 text-amber-dark" },
  TASK_DUE_ONE_DAY: { icon: CalendarClock, tile: "bg-amber/15 text-amber-dark" },
  TASK_DUE_TODAY: { icon: CalendarClock, tile: "bg-danger/10 text-danger" },
  MEETING_ONE_DAY: { icon: Users, tile: "bg-slate/15 text-slate" },
  MEETING_TODAY: { icon: Users, tile: "bg-slate/15 text-slate" },
  LEAD_IMPORT_FINISHED: { icon: FileUp, tile: "bg-success/15 text-success" },
  LEAD_IMPORT_UNDONE: { icon: Undo2, tile: "bg-danger/10 text-danger" },
};

interface NotificationDropdownProps {
  notifications: Notification[];
  isLoading: boolean;
  onSelect: (notification: Notification) => void;
  onDismiss: (id: string) => void;
  onMarkAllRead: () => void;
}

function SectionLabel({ children }: { children: string }) {
  return (
    <p className="sticky top-0 z-10 bg-surface/90 px-4 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wider text-ink-soft backdrop-blur">
      {children}
    </p>
  );
}

export default function NotificationDropdown({
  notifications,
  isLoading,
  onSelect,
  onDismiss,
  onMarkAllRead,
}: NotificationDropdownProps) {
  const [leavingId, setLeavingId] = useState<string | null>(null);

  const sorted = [...notifications].sort(
    (a, b) => new Date(notificationTime(b)).getTime() - new Date(notificationTime(a)).getTime()
  );
  const unread = sorted.filter((n) => !n.is_read);
  const earlier = sorted.filter((n) => n.is_read);

  function dismiss(id: string) {
    setLeavingId(id);
    window.setTimeout(() => {
      onDismiss(id);
      setLeavingId(null);
    }, 220);
  }

  let order = 0;
  function renderItem(notification: Notification) {
    const { icon: Icon, tile } = TYPE_STYLE[notification.notification_type] ?? TYPE_STYLE.REMINDER;
    const index = order++;
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
        style={{ "--i": Math.min(index, 8) } as React.CSSProperties}
        className={`group relative flex w-full cursor-pointer items-start gap-3 border-b border-line/60 px-4 py-3 text-left outline-none transition-colors last:border-b-0 hover:bg-paper focus-visible:bg-paper focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-slate/40 ${
          leavingId === notification.id ? "animate-notif-out" : "animate-notif-item"
        }`}
      >
        {!notification.is_read && (
          <span aria-hidden className="absolute inset-y-2 left-0 w-[3px] rounded-r-full bg-amber" />
        )}

        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-105 ${tile}`}
        >
          <Icon size={16} />
        </div>

        <div className="min-w-0 flex-1 pr-6">
          <div className="flex items-center gap-2">
            <p
              className={`truncate text-sm text-fg ${
                notification.is_read ? "font-medium" : "font-semibold"
              }`}
            >
              {notification.title}
            </p>
            {!notification.is_read && (
              <span className="relative flex h-2 w-2 shrink-0">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-amber">
                  <span className="sr-only">Unread</span>
                </span>
              </span>
            )}
          </div>
          <p className="mt-0.5 line-clamp-2 text-[13px] leading-snug text-ink-soft">{notification.message}</p>
          <p className="mt-1.5 text-[11px] font-medium text-ink-soft/80">
            {formatRelativeTime(notificationTime(notification))}
          </p>
        </div>

        <button
          type="button"
          aria-label={`Dismiss notification: ${notification.title}`}
          onClick={(event) => {
            event.stopPropagation();
            dismiss(notification.id);
          }}
          className="absolute right-2.5 top-2.5 rounded-lg p-1.5 text-ink-soft opacity-0 transition hover:bg-line/70 hover:text-fg focus-visible:opacity-100 group-hover:opacity-100 max-sm:opacity-100 [@media(hover:none)]:opacity-100"
        >
          <X size={14} />
        </button>
      </div>
    );
  }

  return (
    <div
      role="region"
      aria-label="Notifications"
      className="animate-notif-panel absolute right-0 top-full z-50 mt-2 flex max-h-[min(72dvh,34rem)] w-[24rem] max-w-[calc(100vw-1.5rem)] flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-[0_20px_60px_-12px_rgba(18,33,58,0.28)] ring-1 ring-black/[0.03] max-sm:inset-x-3 max-sm:w-auto max-sm:max-w-none"
    >
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-line bg-gradient-to-b from-paper/70 to-surface px-4 py-3">
        <div className="flex items-center gap-2">
          <h2 className="text-[15px] font-semibold text-fg">Notifications</h2>
          {unread.length > 0 && (
            <span className="rounded-full bg-amber/20 px-2 py-0.5 text-[11px] font-semibold leading-none text-amber-dark">
              {unread.length} new
            </span>
          )}
        </div>
        {unread.length > 0 && (
          <button
            type="button"
            onClick={onMarkAllRead}
            className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium text-slate transition hover:bg-paper hover:text-fg active:scale-95 dark:text-ink-soft"
          >
            <CheckCheck size={14} />
            Mark all read
          </button>
        )}
      </div>

      <div className="notif-scroll min-h-0 flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="space-y-4 px-4 py-4" aria-busy="true">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="animate-shimmer h-9 w-9 shrink-0 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <div className="animate-shimmer h-3 w-2/5 rounded" />
                  <div className="animate-shimmer h-3 w-4/5 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : sorted.length === 0 ? (
          <div className="flex flex-col items-center px-6 py-12 text-center">
            <div className="animate-pop-in flex h-14 w-14 items-center justify-center rounded-2xl bg-paper text-ink-soft">
              <BellOff size={24} />
            </div>
            <p className="mt-4 text-sm font-semibold text-fg">You&apos;re all caught up</p>
            <p className="mt-1 text-xs text-ink-soft">New alerts will show up here.</p>
          </div>
        ) : (
          <>
            {unread.length > 0 && (
              <section>
                <SectionLabel>New</SectionLabel>
                {unread.map(renderItem)}
              </section>
            )}
            {earlier.length > 0 && (
              <section>
                <SectionLabel>Earlier</SectionLabel>
                {earlier.map(renderItem)}
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}
