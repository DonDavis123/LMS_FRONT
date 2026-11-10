import { addDays, startOfDay, toDateKey } from "@/features/dashboard/utils/dashboardMetrics";
import type { CalendarEvent, CalendarEventType } from "@/features/calendar/types/calendar.types";

export { addDays, startOfDay, toDateKey };

export const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
] as const;

/** Most days one event is spread over, so a runaway meeting can't flood the grid. */
const MAX_SPAN_DAYS = 31;

export function startOfWeek(date: Date): Date {
  const day = startOfDay(date);
  return addDays(day, -day.getDay());
}

/** The 6 x 7 grid of days shown for a month (weeks start on Sunday). */
export function monthGridDays(anchor: Date): Date[] {
  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const gridStart = startOfWeek(first);
  return Array.from({ length: 42 }, (_, index) => addDays(gridStart, index));
}

export function weekDays(anchor: Date): Date[] {
  const start = startOfWeek(anchor);
  return Array.from({ length: 7 }, (_, index) => addDays(start, index));
}

/** `[start, end)` of dates the given view needs events for. */
export function visibleRange(view: "month" | "week", anchor: Date): { start: Date; end: Date } {
  const days = view === "month" ? monthGridDays(anchor) : weekDays(anchor);
  return { start: days[0], end: addDays(days[days.length - 1], 1) };
}

export function isSameDay(a: Date, b: Date): boolean {
  return toDateKey(a) === toDateKey(b);
}

export function monthTitle(anchor: Date): string {
  return `${MONTH_NAMES[anchor.getMonth()]} ${anchor.getFullYear()}`;
}

export function weekTitle(anchor: Date): string {
  const days = weekDays(anchor);
  const first = days[0];
  const last = days[6];
  const short = (d: Date) => `${MONTH_NAMES[d.getMonth()].slice(0, 3)} ${d.getDate()}`;
  return first.getFullYear() === last.getFullYear()
    ? `${short(first)} – ${short(last)}, ${last.getFullYear()}`
    : `${short(first)}, ${first.getFullYear()} – ${short(last)}, ${last.getFullYear()}`;
}

export function longDayTitle(date: Date): string {
  return date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
}

export function formatTime(date: Date): string {
  return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

/** Every local day an event touches. A meeting that ends exactly at midnight does not spill into the next day. */
export function eventDayKeys(event: CalendarEvent): string[] {
  const first = startOfDay(event.start);
  let last = first;

  if (event.end && event.end.getTime() > event.start.getTime()) {
    const endDay = startOfDay(event.end);
    last = event.end.getTime() === endDay.getTime() ? addDays(endDay, -1) : endDay;
    if (last.getTime() < first.getTime()) last = first;
  }

  const keys: string[] = [];
  for (let cursor = first, n = 0; cursor.getTime() <= last.getTime() && n < MAX_SPAN_DAYS; cursor = addDays(cursor, 1), n++) {
    keys.push(toDateKey(cursor));
  }
  return keys;
}

/** Groups events by local day ("YYYY-MM-DD"), all-day first then by start time. */
export function groupEventsByDay(events: CalendarEvent[]): Map<string, CalendarEvent[]> {
  const byDay = new Map<string, CalendarEvent[]>();

  for (const event of events) {
    for (const key of eventDayKeys(event)) {
      const bucket = byDay.get(key);
      if (bucket) bucket.push(event);
      else byDay.set(key, [event]);
    }
  }

  for (const bucket of byDay.values()) {
    bucket.sort((a, b) => {
      const allDayA = a.all_day ? 0 : 1;
      const allDayB = b.all_day ? 0 : 1;
      return allDayA - allDayB || a.start.getTime() - b.start.getTime() || a.title.localeCompare(b.title);
    });
  }

  return byDay;
}

/** Where clicking an event goes. */
export function eventHref(type: CalendarEventType, id: string): string {
  switch (type) {
    case "TASK":
      return `/dashboard/tasks/${id}`;
    case "MEETING":
      return `/dashboard/meetings/${id}`;
    case "CALL":
      return `/dashboard/calls/${id}`;
    case "REMINDER":
      return "/dashboard/reminders";
  }
}
