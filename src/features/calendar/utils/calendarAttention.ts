import { authService } from "@/features/auth/services/authService";
import type { CalendarEvent } from "@/features/calendar/types/calendar.types";

/**
 * "Needs attention" logic shared by the header calendar badge and the
 * calendar page, plus the small per-user store that remembers which items the
 * user has already been shown.
 *
 * The badge counts items that are pending today AND not yet seen. The calendar
 * page marks today's items as seen as soon as it renders them, and notifies the
 * header (same tab via a window event, other tabs via the `storage` event) so
 * the badge disappears immediately.
 *
 * Storage is a convenience only: if localStorage is unavailable the badge just
 * behaves as "nothing seen yet" for that page load.
 */

const STORAGE_PREFIX = "crm.calendar.seen.";
const CHANGE_EVENT = "crm:calendar-seen-changed";
/** Seen markers older than this are dropped so the store never grows forever. */
const RETENTION_MS = 14 * 24 * 60 * 60 * 1000;

type SeenMap = Record<string, number>;

/**
 * Whether an item on today's calendar is still something to act on: open
 * tasks, planned calls (overdue ones included), meetings that have not ended
 * and enabled reminders that have not fired yet.
 */
export function isPendingEvent(event: CalendarEvent, now: number = Date.now()): boolean {
  switch (event.type) {
    case "TASK":
      return event.status !== "Completed";
    case "CALL":
      return event.status === "Planned";
    case "MEETING":
      return event.all_day || (event.end ?? event.start).getTime() >= now;
    case "REMINDER":
      return event.status !== "Disabled" && event.start.getTime() >= now;
  }
}

/**
 * Identity of one occurrence of an item. The start time is part of the key, so
 * an item that is rescheduled counts as new again.
 */
export function eventSeenKey(event: Pick<CalendarEvent, "type" | "id" | "start">): string {
  return `${event.type}:${event.id}:${event.start.getTime()}`;
}

function storageKey(): string | null {
  const userId = authService.getSessionUser()?.id;
  return userId ? `${STORAGE_PREFIX}${userId}` : null;
}

function readMap(): SeenMap {
  const key = storageKey();
  if (!key) return {};
  try {
    const raw = window.localStorage.getItem(key);
    const parsed: unknown = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as SeenMap) : {};
  } catch {
    return {};
  }
}

/** Keys of every item the signed-in user has already been shown. */
export function getSeenKeys(): Set<string> {
  return new Set(Object.keys(readMap()));
}

/** Remembers these items as seen and tells every listener (header badge) right away. */
export function markEventsSeen(keys: string[]): void {
  if (keys.length === 0) return;
  const storage = storageKey();
  if (!storage) return;

  const now = Date.now();
  const next: SeenMap = {};
  for (const [key, seenAt] of Object.entries(readMap())) {
    if (typeof seenAt === "number" && now - seenAt < RETENTION_MS) next[key] = seenAt;
  }
  for (const key of keys) next[key] = now;

  try {
    window.localStorage.setItem(storage, JSON.stringify(next));
  } catch {
    // Storage full or blocked — the in-memory listeners below still fire.
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

/** Calls `listener` whenever the seen set changes in this tab or another one. */
export function subscribeToSeenChanges(listener: () => void): () => void {
  const onStorage = (event: StorageEvent) => {
    if (event.key === null || event.key.startsWith(STORAGE_PREFIX)) listener();
  };
  window.addEventListener(CHANGE_EVENT, listener);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(CHANGE_EVENT, listener);
    window.removeEventListener("storage", onStorage);
  };
}
