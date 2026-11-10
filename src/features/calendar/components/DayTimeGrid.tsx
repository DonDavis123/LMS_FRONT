"use client";

import { useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { AlertTriangle, Plus } from "lucide-react";
import type { CalendarEvent } from "@/features/calendar/types/calendar.types";
import { eventHref, isOverdueCall, isSameDay, longDayTitle, toDateKey } from "@/features/calendar/utils/calendarDates";
import {
  MINUTES_PER_DAY,
  hourLabel,
  layoutDayEvents,
  splitDayEvents,
  type PositionedEvent,
} from "@/features/calendar/utils/dayLayout";
import EventChip, { EVENT_TYPE_META, eventStateLabel, eventTimeLabel, stateClasses } from "@/features/calendar/components/EventChip";

/** Height of one hour on screen. A 30-minute call is therefore 28px tall. */
const HOUR_PX = 56;
const GRID_HEIGHT = 24 * HOUR_PX;
/** Blocks shorter than this show their title and time on one line. */
const TWO_LINE_MIN_PX = 44;
const HOURS = Array.from({ length: 24 }, (_, hour) => hour);

interface DayTimeGridProps {
  day: Date;
  /** Everything on this day that passed the type filters (all-day first, then by time). */
  events: CalendarEvent[];
  /** Current time in ms (ticks once a minute in the parent). */
  now: number;
  showOwner: boolean;
  onAdd: (dayKey: string) => void;
}

export default function DayTimeGrid({ day, events, now, showOwner, onAdd }: DayTimeGridProps) {
  const dayKey = toDateKey(day);
  const isToday = isSameDay(day, new Date(now));
  const scrollRef = useRef<HTMLDivElement>(null);

  const { allDay, positioned } = useMemo(() => {
    const split = splitDayEvents(events, day);
    return { allDay: split.allDay, positioned: layoutDayEvents(split.timed, day) };
  }, [events, day]);

  const overdueCount = useMemo(() => events.filter((event) => isOverdueCall(event, now)).length, [events, now]);

  const firstMinute = positioned.length > 0 ? Math.min(...positioned.map((item) => item.startMinute)) : null;

  // Open on what matters: just before now (today), the first item, or the start of the working day.
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    const current = new Date();
    const focusMinute = isToday
      ? current.getHours() * 60 + current.getMinutes() - 90
      : firstMinute !== null
        ? firstMinute - 30
        : 8 * 60;
    container.scrollTop = Math.max(0, (focusMinute / 60) * HOUR_PX);
  }, [dayKey, isToday, firstMinute]);

  const nowDate = new Date(now);
  const nowMinute = nowDate.getHours() * 60 + nowDate.getMinutes();

  return (
    <section aria-label={`Schedule for ${longDayTitle(day)}`} className="min-w-0 overflow-hidden rounded-lg border border-line bg-surface">
      {/* Summary */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-line bg-paper/60 px-3 py-2 text-xs text-ink-soft">
        <span className="font-semibold text-fg">
          {events.length === 0 ? "Nothing scheduled" : `${events.length} ${events.length === 1 ? "item" : "items"}`}
        </span>
        {overdueCount > 0 && (
          <span className="inline-flex items-center gap-1 font-semibold text-danger">
            <AlertTriangle size={13} aria-hidden="true" />
            {overdueCount} overdue {overdueCount === 1 ? "call" : "calls"}
          </span>
        )}
        <span className="ml-auto hidden sm:inline">Click a time slot to add something</span>
      </div>

      {/* All-day strip */}
      {allDay.length > 0 && (
        <div className="flex border-b border-line">
          <div className="flex w-14 shrink-0 items-start justify-end px-2 py-2 text-[10px] font-semibold uppercase tracking-wide text-ink-soft sm:w-16">
            All day
          </div>
          <ul className="flex min-w-0 flex-1 flex-wrap gap-1 border-l border-line p-1.5">
            {allDay.map((event) => (
              <li key={`${event.type}-${event.id}`} className="min-w-0 max-w-full">
                <EventChip event={event} now={now} />
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Hourly grid */}
      <div ref={scrollRef} className="relative max-h-[calc(100dvh-21rem)] min-h-[420px] overflow-y-auto">
        <div className="relative flex" style={{ height: GRID_HEIGHT }}>
          {/* Hour labels */}
          <div className="relative w-14 shrink-0 sm:w-16" aria-hidden="true">
            {HOURS.slice(1).map((hour) => (
              <span
                key={hour}
                className="absolute right-2 -translate-y-1/2 text-[10px] font-medium tabular-nums text-ink-soft"
                style={{ top: hour * HOUR_PX }}
              >
                {hourLabel(hour)}
              </span>
            ))}
          </div>

          {/* Day column */}
          <div className="relative min-w-0 flex-1 border-l border-line">
            {HOURS.map((hour) => (
              <div
                key={hour}
                onClick={() => onAdd(dayKey)}
                aria-hidden="true"
                className={`group absolute inset-x-0 cursor-pointer hover:bg-paper/70 ${hour > 0 ? "border-t border-line" : ""}`}
                style={{ top: hour * HOUR_PX, height: HOUR_PX }}
              >
                <div className="absolute inset-x-0 top-1/2 border-t border-dashed border-line/60" />
                <Plus
                  size={14}
                  className="absolute right-2 top-1.5 text-ink-soft opacity-0 transition group-hover:opacity-100"
                />
              </div>
            ))}

            {/* Events */}
            <div className="pointer-events-none absolute inset-0 z-10">
              {positioned.map((item) => (
                <TimedEventBlock key={`${item.event.type}-${item.event.id}`} item={item} now={now} showOwner={showOwner} />
              ))}
            </div>

            {/* Current time */}
            {isToday && (
              <div
                className="pointer-events-none absolute inset-x-0 z-20 flex items-center"
                style={{ top: (nowMinute / MINUTES_PER_DAY) * GRID_HEIGHT }}
                aria-hidden="true"
              >
                <span className="-ml-1.5 h-3 w-3 rounded-full bg-danger" />
                <span className="h-0.5 flex-1 bg-danger" />
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function TimedEventBlock({ item, now, showOwner }: { item: PositionedEvent; now: number; showOwner: boolean }) {
  const { event, startMinute, durationMinutes, column, columns } = item;
  const meta = EVENT_TYPE_META[event.type];
  const Icon = meta.icon;
  const height = Math.max((durationMinutes / 60) * HOUR_PX, 22);
  const state = eventStateLabel(event, now);
  const overdue = isOverdueCall(event, now);
  const detail = [event.related_record_name, showOwner ? event.owner_name : null].filter(Boolean).join(" · ");

  return (
    <div
      className="pointer-events-auto absolute overflow-hidden rounded-md bg-surface shadow-sm"
      style={{
        top: (startMinute / 60) * HOUR_PX,
        height,
        left: `calc(${(column / columns) * 100}% + 2px)`,
        width: `calc(${100 / columns}% - 4px)`,
      }}
    >
      <Link
        href={eventHref(event.type, event.id)}
        title={`${meta.label}: ${event.title}${state ? ` · ${state}` : ""}${detail ? ` · ${detail}` : ""}`}
        className={`relative flex h-full w-full min-w-0 gap-1.5 overflow-hidden rounded-md py-1 pl-3 pr-1.5 text-xs leading-4 transition hover:brightness-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-slate ${meta.tone} ${stateClasses(event, now)} ${
          height >= TWO_LINE_MIN_PX ? "flex-col" : "items-center"
        }`}
      >
        <span aria-hidden="true" className={`absolute inset-y-0 left-0 w-1 ${overdue ? "bg-danger" : meta.dot}`} />
        {height >= TWO_LINE_MIN_PX ? (
          <>
            <span className="flex min-w-0 items-center gap-1 text-[11px] font-semibold tabular-nums opacity-80">
              <Icon size={12} aria-hidden="true" className="shrink-0" />
              <span className="truncate">{eventTimeLabel(event)}</span>
              {state && <span className="shrink-0 rounded bg-surface/70 px-1 text-[10px] uppercase tracking-wide">{state}</span>}
            </span>
            <span className="truncate font-semibold">{event.title}</span>
            {detail && height >= 64 && <span className="truncate text-[11px] opacity-80">{detail}</span>}
          </>
        ) : (
          <>
            <Icon size={12} aria-hidden="true" className="shrink-0" />
            <span className="shrink-0 text-[11px] font-semibold tabular-nums opacity-80">{eventTimeLabel(event)}</span>
            <span className="truncate font-semibold">{event.title}</span>
          </>
        )}
        <span className="sr-only">
          {meta.label}
          {state ? `, ${state}` : ""}
        </span>
      </Link>
    </div>
  );
}
