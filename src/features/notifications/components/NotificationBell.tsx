"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";
import { NotificationService } from "@/features/notifications/services/NotificationService";
import type { Notification } from "@/features/notifications/types/notification.types";
import NotificationDropdown from "@/features/notifications/components/NotificationDropdown";

const POLL_INTERVAL_MS = 10_000;

function unreadCountOf(notifications: Notification[]): number {
  return notifications.filter((n) => !n.is_read).length;
}

function badgeLabel(count: number): string {
  return count > 99 ? "99+" : String(count);
}

/**
 * Bell icon + unread badge shown in the dashboard header. Polls
 * GET /notifications/ on an interval so the badge stays roughly current
 * without needing a websocket, and opens a compact dropdown (matching the
 * existing profile menu popover) on click.
 */
export default function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [justArrived, setJustArrived] = useState(false);
  const previousUnreadRef = useRef(0);
  const rootRef = useRef<HTMLDivElement>(null);

  const inFlightRef = useRef(false);

  const refresh = useCallback(async () => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    try {
      const data = await NotificationService.getNotifications();
      setNotifications(data);

      const nextUnread = unreadCountOf(data);
      if (nextUnread > previousUnreadRef.current) {
        setJustArrived(true);
        window.setTimeout(() => setJustArrived(false), 700);
      }
      previousUnreadRef.current = nextUnread;
    } catch {
      // Silently keep the last known list — a failed poll shouldn't
      // interrupt the dashboard.
    } finally {
      inFlightRef.current = false;
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const interval = window.setInterval(refresh, POLL_INTERVAL_MS);

    // Browsers throttle timers in background tabs, so also refresh the
    // moment the user returns to the tab / regains focus / reconnects.
    const refreshIfVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", refreshIfVisible);
    window.addEventListener("focus", refreshIfVisible);
    window.addEventListener("online", refreshIfVisible);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", refreshIfVisible);
      window.removeEventListener("focus", refreshIfVisible);
      window.removeEventListener("online", refreshIfVisible);
    };
  }, [refresh]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setIsOpen(false);
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setIsOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  async function handleMarkAsRead(id: string) {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true, read_at: new Date().toISOString() } : n))
    );
    previousUnreadRef.current = Math.max(0, previousUnreadRef.current - 1);
    try {
      await NotificationService.markAsRead(id);
    } catch {
      // Reconcile with the server on the next poll if this failed.
    }
  }

  async function handleDismiss(id: string) {
    const wasUnread = notifications.find((n) => n.id === id)?.is_read === false;
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    if (wasUnread) previousUnreadRef.current = Math.max(0, previousUnreadRef.current - 1);
    try {
      await NotificationService.deleteNotification(id);
    } catch {
      refresh();
    }
  }

  const unreadCount = unreadCountOf(notifications);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications"}
        aria-expanded={isOpen}
        className={`relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-transparent text-ink-soft transition hover:border-line hover:bg-paper hover:text-fg active:scale-90 ${justArrived ? "animate-bell-ring" : ""}`}
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span
            className={`absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-semibold leading-none text-white ${justArrived ? "animate-pop-in" : ""}`}
          >
            {badgeLabel(unreadCount)}
          </span>
        )}
      </button>

      {isOpen && (
        <NotificationDropdown
          notifications={notifications}
          isLoading={isLoading}
          onMarkAsRead={handleMarkAsRead}
          onDismiss={handleDismiss}
        />
      )}
    </div>
  );
}
