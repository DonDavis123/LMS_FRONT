import { addDays, startOfDay } from "@/features/calendar/utils/calendarDates";
import type { CalendarEvent } from "@/features/calendar/types/calendar.types";

export const MINUTES_PER_DAY = 24 * 60;

/** Calls and reminders have a start time but no end, so they get a visible default length. */
const DEFAULT_EVENT_MINUTES = 30;

export interface PositionedEvent {
  event: CalendarEvent;
  /** Minutes after midnight the block starts. */
  startMinute: number;
  /** Minutes the block spans (never shorter than the default length). */
  durationMinutes: number;
  /** Which side-by-side column the block sits in (0-based). */
  column: number;
  /** How many columns the block's overlapping group is split into. */
  columns: number;
}

export interface DaySplit {
  allDay: CalendarEvent[];
  timed: CalendarEvent[];
}

/** Wall-clock minutes of `date` inside `day`; clamped to the day's edges for dates outside it. */
function minuteInDay(date: Date, day: Date): number {
  const dayStart = startOfDay(day).getTime();
  const nextDay = addDays(day, 1).getTime();
  if (date.getTime() <= dayStart) return 0;
  if (date.getTime() >= nextDay) return MINUTES_PER_DAY;
  return date.getHours() * 60 + date.getMinutes();
}

/**
 * Tasks and all-day items go in the strip above the grid, and so does a
 * multi-day meeting that covers the whole day. Everything else has a time.
 */
export function splitDayEvents(events: CalendarEvent[], day: Date): DaySplit {
  const dayStart = startOfDay(day).getTime();
  const nextDay = addDays(day, 1).getTime();
  const allDay: CalendarEvent[] = [];
  const timed: CalendarEvent[] = [];

  for (const event of events) {
    const coversWholeDay =
      event.end !== null && event.start.getTime() <= dayStart && event.end.getTime() >= nextDay;
    if (event.all_day || event.type === "TASK" || coversWholeDay) allDay.push(event);
    else timed.push(event);
  }

  return { allDay, timed };
}

/**
 * Lays timed events out on a day column. Events that overlap in time are put
 * side by side and share the width equally; a lone event takes the full width.
 */
export function layoutDayEvents(events: CalendarEvent[], day: Date): PositionedEvent[] {
  const items = events
    .map((event) => {
      const startMinute = Math.min(minuteInDay(event.start, day), MINUTES_PER_DAY - 1);
      const endMinute = event.end ? minuteInDay(event.end, day) : startMinute;
      const durationMinutes = Math.min(
        Math.max(endMinute - startMinute, DEFAULT_EVENT_MINUTES),
        MINUTES_PER_DAY - startMinute,
      );
      return { event, startMinute, durationMinutes, column: 0, columns: 1 };
    })
    // Earlier first; for the same start the longer one goes first (leftmost).
    .sort(
      (a, b) =>
        a.startMinute - b.startMinute ||
        b.durationMinutes - a.durationMinutes ||
        a.event.title.localeCompare(b.event.title),
    );

  let group: PositionedEvent[] = [];
  let columnEnds: number[] = [];
  let groupEnd = 0;

  const closeGroup = () => {
    for (const item of group) item.columns = columnEnds.length || 1;
    group = [];
    columnEnds = [];
  };

  for (const item of items) {
    // Nothing in the open group reaches this event, so it starts a new group.
    if (group.length > 0 && item.startMinute >= groupEnd) closeGroup();

    let column = columnEnds.findIndex((end) => end <= item.startMinute);
    if (column === -1) {
      column = columnEnds.length;
      columnEnds.push(0);
    }
    columnEnds[column] = item.startMinute + item.durationMinutes;
    item.column = column;

    groupEnd = group.length === 0 ? columnEnds[column] : Math.max(groupEnd, columnEnds[column]);
    group.push(item);
  }
  closeGroup();

  return items;
}

/** "9 AM", "12 PM" — the label of an hour line. */
export function hourLabel(hour: number): string {
  const suffix = hour < 12 ? "AM" : "PM";
  const twelve = hour % 12 === 0 ? 12 : hour % 12;
  return `${twelve} ${suffix}`;
}
