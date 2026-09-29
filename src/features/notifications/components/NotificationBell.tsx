"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import { NotificationService } from "@/features/notifications/services/NotificationService";
import type { Notification } from "@/features/notifications/types/notification.types";
import { getNotificationTarget } from "@/features/notifications/utils/notificationTarget";
import NotificationDropdown from "@/features/notifications/components/NotificationDropdown";
import NotificationDetailDialog from "@/features/notifications/components/NotificationDetailDialog";

const POLL_INTERVAL_MS = 10_000;

function unreadCountOf(notifications: Notification[]): number {
  return notifications.filter((n) => !n.is_read).length;
}

function badgeLabel(count: number): string {
  return count > 99 ? "99+" : String(count);
}

function statusOf(error: unknown): number | undefined {
  return (error as { response?: { status?: number } } | null)?.response?.status;
}

/**
 * Bell icon + unread badge shown in the dashboard header. Polls
 * GET /notifications/ on an interval so the badge stays roughly current
 * without needing a websocket, and opens a compact dropdown (matching the
 * existing profile menu popover) on click.
 *
 * Clicking a notification marks it read on the server, then either goes to
 * the related task / meeting or — for custom notifications — opens a small
 * detail box.
 */
export default function NotificationBell() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [justArrived, setJustArrived] = useState(false);
  const [detail, setDetail] = useState<Notification | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const previousUnreadRef = useRef(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const inFlightRef = useRef(false);

  // Always holds the list currently on screen, so handlers never act on a stale closure.
  const notificationsRef = useRef<Notification[]>([]);
  // Ids the user marked read / deleted in this session. Both transitions are
  // one-way on the server, so a poll response that was already in flight when
  // the click happened (and therefore still says "unread" / still lists the
  // row) is patched with these instead of flipping the UI back.
  const readIdsRef = useRef<Set<string>>(new Set());
  const removedIdsRef = useRef<Set<string>>(new Set());

  const commit = useCallback((next: Notification[]) => {
    notificationsRef.current = next;
    setNotifications(next);

    const nextUnread = unreadCountOf(next);
    if (nextUnread > previousUnreadRef.current) {
      setJustArrived(true);
      window.setTimeout(() => setJustArrived(false), 700);
    }
    previousUnreadRef.current = nextUnread;
  }, []);

  const refresh = useCallback(async () => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    try {
      const data = await NotificationService.getNotifications();
      const now = new Date().toISOString();
      commit(
        data
          .filter((n) => !removedIdsRef.current.has(n.id))
          .map((n) =>
            readIdsRef.current.has(n.id) && !n.is_read ? { ...n, is_read: true, read_at: n.read_at ?? now } : n
          )
      );
    } catch {
      // Silently keep the last known list — a failed poll shouldn't
      // interrupt the dashboard.
    } finally {
      inFlightRef.current = false;
      setIsLoading(false);
    }
  }, [commit]);

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

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 3000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  function dropLocally(id: string) {
    removedIdsRef.current.add(id);
    readIdsRef.current.delete(id);
    commit(notificationsRef.current.filter((n) => n.id !== id));
  }

  /** Persists "read" on the server; the UI updates first and rolls back on failure. */
  async function markRead(id: string): Promise<void> {
    const current = notificationsRef.current.find((n) => n.id === id);
    if (!current || current.is_read) return; // already read — nothing to send

    readIdsRef.current.add(id);
    commit(
      notificationsRef.current.map((n) =>
        n.id === id ? { ...n, is_read: true, read_at: new Date().toISOString() } : n
      )
    );

    try {
      await NotificationService.markAsRead(id);
    } catch (error) {
      if (statusOf(error) === 404) {
        dropLocally(id); // it expired or was deleted elsewhere
        return;
      }
      readIdsRef.current.delete(id);
      commit(notificationsRef.current.map((n) => (n.id === id ? { ...n, is_read: false, read_at: null } : n)));
      setToast("Couldn't mark the notification as read.");
    }
  }

  async function handleSelect(notification: Notification) {
    const target = getNotificationTarget(notification);
    setIsOpen(false);

    if (target.kind === "custom") {
      setDetail(notification);
      await markRead(notification.id);
      return;
    }

    await markRead(notification.id);
    router.push(target.href);
  }

  async function handleDismiss(id: string) {
    const removed = notificationsRef.current.find((n) => n.id === id);
    if (!removed) return;

    // The badge is derived from the list, so removing an already-read row
    // leaves the unread count alone and removing an unread one lowers it.
    dropLocally(id);
    try {
      await NotificationService.deleteNotification(id);
    } catch (error) {
      if (statusOf(error) === 404) return; // already gone on the server
      removedIdsRef.current.delete(id);
      commit([...notificationsRef.current, removed]);
      setToast("Couldn't delete the notification.");
      refresh();
    }
  }

  const unreadCount = unreadCountOf(notifications);

  return (
    <div ref={rootRef} className="sm:relative">
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications"}
        aria-expanded={isOpen}
        aria-haspopup="true"
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
          onSelect={handleSelect}
          onDismiss={handleDismiss}
        />
      )}

      <NotificationDetailDialog notification={detail} onClose={() => setDetail(null)} />

      {toast && (
        <div
          role="status"
          className="fixed bottom-6 left-1/2 z-[60] max-w-[calc(100vw-2rem)] -translate-x-1/2 animate-toast-in rounded-md border border-danger/30 bg-danger-soft px-4 py-2.5 text-sm font-medium text-danger shadow-lg"
        >
          {toast}
        </div>
      )}
    </div>
  );
}
