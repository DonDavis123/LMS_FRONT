"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays } from "lucide-react";
import { CalendarService } from "@/features/calendar/services/CalendarService";
import type { CalendarEvent } from "@/features/calendar/types/calendar.types";
import { addDays, startOfDay } from "@/features/calendar/utils/calendarDates";
import {
  eventSeenKey,
  getSeenKeys,
  isPendingEvent,
  subscribeToSeenChanges,
} from "@/features/calendar/utils/calendarAttention";

const CALENDAR_HREF = "/dashboard/calendar";
const REFRESH_INTERVAL_MS = 60_000;

function badgeLabel(count: number): string {
  return count > 99 ? "99+" : String(count);
}

/**
 * Calendar shortcut shown in the dashboard header, right beside the
 * notification bell. It links to the full calendar page and carries a small
 * badge with the number of items that are pending today and that the user has
 * not been shown yet. Opening the calendar marks them as seen, which clears
 * the badge immediately.
 *
 * The badge is a convenience: if the request fails the icon simply shows
 * without it, and a failed refresh keeps the last known count.
 */
export default function CalendarHeaderButton() {
  const pathname = usePathname();
  const [pendingToday, setPendingToday] = useState<CalendarEvent[]>([]);
  // Bumped whenever the calendar page marks items as seen, to recompute the badge.
  const [seenVersion, setSeenVersion] = useState(0);
  const isActive = pathname.startsWith(CALENDAR_HREF);

  const refresh = useCallback(async () => {
    try {
      const today = startOfDay(new Date());
      const events = await CalendarService.getEvents({ start: today, end: addDays(today, 1) });
      const now = Date.now();
      setPendingToday(events.filter((event) => isPendingEvent(event, now)));
    } catch {
      // Keep the last known count — a failed poll shouldn't disturb the header.
    }
  }, []);

  // Refresh on mount and whenever the user navigates, so the count catches up
  // after they add or finish something on another page.
  useEffect(() => {
    void refresh();
  }, [refresh, pathname]);

  useEffect(() => subscribeToSeenChanges(() => setSeenVersion((version) => version + 1)), []);

  const unseenCount = useMemo(() => {
    const seen = getSeenKeys();
    return pendingToday.filter((event) => !seen.has(eventSeenKey(event))).length;
    // seenVersion is a deliberate trigger: the seen set lives in storage, not in React state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingToday, seenVersion]);

  useEffect(() => {
    const interval = window.setInterval(() => void refresh(), REFRESH_INTERVAL_MS);

    // Background tabs throttle timers, so also refresh when the user returns.
    const refreshIfVisible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    document.addEventListener("visibilitychange", refreshIfVisible);
    window.addEventListener("focus", refreshIfVisible);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", refreshIfVisible);
      window.removeEventListener("focus", refreshIfVisible);
    };
  }, [refresh]);

  const label = unseenCount > 0 ? `Calendar, ${unseenCount} new today` : "Calendar";

  return (
    <Link
      href={CALENDAR_HREF}
      aria-label={label}
      aria-current={isActive ? "page" : undefined}
      title={label}
      className={`relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border text-ink-soft transition hover:border-line hover:bg-paper hover:text-fg active:scale-90 ${
        isActive ? "border-line bg-paper text-fg" : "border-transparent"
      }`}
    >
      <CalendarDays size={18} aria-hidden="true" />
      {unseenCount > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-slate px-1 text-[10px] font-semibold leading-none text-white">
          {badgeLabel(unseenCount)}
        </span>
      )}
    </Link>
  );
}
