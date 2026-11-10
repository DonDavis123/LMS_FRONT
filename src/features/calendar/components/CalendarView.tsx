"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Plus, RefreshCw } from "lucide-react";
import { authService } from "@/features/auth/services/authService";
import { normalizeEnumValue } from "@/shared/utils/enumValue";
import { extractApiError } from "@/shared/utils/apiError";
import Spinner from "@/shared/components/Spinner";
import { CalendarService } from "@/features/calendar/services/CalendarService";
import {
  CALENDAR_EVENT_TYPES,
  type CalendarEvent,
  type CalendarEventType,
  type CalendarScope,
  type CalendarView as ViewMode,
} from "@/features/calendar/types/calendar.types";
import {
  WEEKDAY_LABELS,
  addDays,
  groupEventsByDay,
  isSameDay,
  longDayTitle,
  monthGridDays,
  monthTitle,
  startOfDay,
  toDateKey,
  visibleRange,
  weekDays,
  weekTitle,
} from "@/features/calendar/utils/calendarDates";
import EventChip, { EVENT_TYPE_META, eventStateLabel, eventTimeLabel } from "@/features/calendar/components/EventChip";
import QuickAddDialog from "@/features/calendar/components/QuickAddDialog";

/** Roles that may switch to the whole-company calendar (mirrors the backend). */
const TEAM_VIEW_ROLES = new Set(["SUPERADMIN", "ADMIN", "SALESMANAGER", "SALES_MANAGER"]);

const MAX_CHIPS_PER_CELL = 3;

export default function CalendarView() {
  const [view, setView] = useState<ViewMode>("month");
  const [anchor, setAnchor] = useState<Date>(() => startOfDay(new Date()));
  const [selectedDay, setSelectedDay] = useState<Date>(() => startOfDay(new Date()));
  const [scope, setScope] = useState<CalendarScope>("mine");
  const [enabledTypes, setEnabledTypes] = useState<Set<CalendarEventType>>(() => new Set(CALENDAR_EVENT_TYPES));
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addDay, setAddDay] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  // Only the newest request may update the calendar (fast month switching).
  const latestRequest = useRef(0);

  const canViewTeam = useMemo(() => {
    const role = normalizeEnumValue(authService.getSessionUser()?.role);
    return TEAM_VIEW_ROLES.has(role);
  }, []);

  const today = useMemo(() => startOfDay(new Date()), []);
  const days = useMemo(() => (view === "month" ? monthGridDays(anchor) : weekDays(anchor)), [view, anchor]);

  const load = useCallback(async () => {
    const requestId = ++latestRequest.current;
    const { start, end } = visibleRange(view, anchor);
    setIsLoading(true);
    setError(null);

    try {
      // Always fetch every type: the filter chips hide/show locally, so toggling is instant.
      const result = await CalendarService.getEvents({ start, end, scope });
      if (requestId !== latestRequest.current) return;
      setEvents(result);
    } catch (caught) {
      if (requestId !== latestRequest.current) return;
      setEvents([]);
      setError(extractApiError(caught, "Couldn't load the calendar."));
    } finally {
      if (requestId === latestRequest.current) setIsLoading(false);
    }
  }, [view, anchor, scope]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 3000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const visibleEvents = useMemo(() => events.filter((event) => enabledTypes.has(event.type)), [events, enabledTypes]);
  const byDay = useMemo(() => groupEventsByDay(visibleEvents), [visibleEvents]);
  const typeCounts = useMemo(() => {
    const counts: Record<CalendarEventType, number> = { TASK: 0, MEETING: 0, CALL: 0, REMINDER: 0 };
    for (const event of events) counts[event.type] += 1;
    return counts;
  }, [events]);

  function step(direction: -1 | 1) {
    setAnchor((current) =>
      view === "month"
        ? new Date(current.getFullYear(), current.getMonth() + direction, 1)
        : addDays(current, direction * 7),
    );
  }

  function goToday() {
    setAnchor(startOfDay(new Date()));
    setSelectedDay(startOfDay(new Date()));
  }

  function selectDay(day: Date) {
    setSelectedDay(day);
    // Clicking a spill-over day of the neighbouring month moves the grid there.
    if (view === "month" && day.getMonth() !== anchor.getMonth()) {
      setAnchor(new Date(day.getFullYear(), day.getMonth(), 1));
    }
  }

  function toggleType(type: CalendarEventType) {
    setEnabledTypes((current) => {
      const next = new Set(current);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  }

  const selectedEvents = byDay.get(toDateKey(selectedDay)) ?? [];
  const title = view === "month" ? monthTitle(anchor) : weekTitle(anchor);

  return (
    <div className="mx-auto w-full max-w-[1400px] px-4 py-5 sm:px-6">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <h1 className="mr-2 font-serif text-2xl text-fg" aria-live="polite">
          {title}
        </h1>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => step(-1)}
            aria-label={view === "month" ? "Previous month" : "Previous week"}
            className="rounded-md border border-line p-1.5 text-fg hover:bg-paper"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            type="button"
            onClick={goToday}
            className="rounded-md border border-line px-3 py-1.5 text-sm font-medium text-fg hover:bg-paper"
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => step(1)}
            aria-label={view === "month" ? "Next month" : "Next week"}
            className="rounded-md border border-line p-1.5 text-fg hover:bg-paper"
          >
            <ChevronRight size={16} />
          </button>
        </div>

        <div role="group" aria-label="Calendar view" className="flex overflow-hidden rounded-md border border-line text-sm">
          {(["month", "week"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              aria-pressed={view === mode}
              onClick={() => setView(mode)}
              className={`px-3 py-1.5 font-medium capitalize ${view === mode ? "bg-ink text-white" : "text-fg hover:bg-paper"}`}
            >
              {mode}
            </button>
          ))}
        </div>

        {canViewTeam && (
          <div role="group" aria-label="Whose calendar" className="flex overflow-hidden rounded-md border border-line text-sm">
            {([
              ["mine", "My calendar"],
              ["team", "Team"],
            ] as const).map(([value, label]) => (
              <button
                key={value}
                type="button"
                aria-pressed={scope === value}
                onClick={() => setScope(value)}
                className={`px-3 py-1.5 font-medium ${scope === value ? "bg-ink text-white" : "text-fg hover:bg-paper"}`}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => void load()}
            aria-label="Refresh calendar"
            className="rounded-md border border-line p-1.5 text-ink-soft hover:bg-paper hover:text-fg"
          >
            <RefreshCw size={16} className={isLoading ? "animate-spin" : ""} />
          </button>
          <button
            type="button"
            onClick={() => setAddDay(toDateKey(selectedDay))}
            className="inline-flex items-center gap-1.5 rounded-md bg-ink px-3 py-2 text-sm font-semibold text-white transition hover:bg-ink-2 active:scale-[0.98]"
          >
            <Plus size={16} aria-hidden="true" /> Add
          </button>
        </div>
      </div>

      {/* Type filters + legend */}
      <div className="mt-3 flex flex-wrap items-center gap-2" role="group" aria-label="Show on calendar">
        {CALENDAR_EVENT_TYPES.map((type) => {
          const meta = EVENT_TYPE_META[type];
          const Icon = meta.icon;
          const on = enabledTypes.has(type);
          return (
            <button
              key={type}
              type="button"
              aria-pressed={on}
              onClick={() => toggleType(type)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition ${
                on ? `border-transparent ${meta.tone}` : "border-line text-ink-soft line-through hover:bg-paper"
              }`}
            >
              <Icon size={13} aria-hidden="true" />
              {meta.plural}
              <span className="tabular-nums opacity-70">{typeCounts[type]}</span>
            </button>
          );
        })}
        {isLoading && <Spinner size="sm" />}
      </div>

      {error && (
        <p role="alert" className="mt-3 rounded-md border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger">
          {error}{" "}
          <button type="button" onClick={() => void load()} className="font-semibold underline">
            Try again
          </button>
        </p>
      )}

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        {/* Grid */}
        <section aria-label={`${view === "month" ? "Month" : "Week"} calendar`} className="min-w-0">
          <div className="hidden grid-cols-7 border-b border-line text-center text-xs font-semibold uppercase tracking-wide text-ink-soft sm:grid">
            {WEEKDAY_LABELS.map((label) => (
              <div key={label} className="py-2">
                {label}
              </div>
            ))}
          </div>

          <div
            className={`grid grid-cols-1 border-l border-line sm:grid-cols-7 ${
              view === "month" ? "sm:auto-rows-[minmax(104px,1fr)]" : "sm:auto-rows-[minmax(320px,1fr)]"
            }`}
          >
            {days.map((day) => {
              const key = toDateKey(day);
              const dayEvents = byDay.get(key) ?? [];
              const inMonth = view === "week" || day.getMonth() === anchor.getMonth();
              const isToday = isSameDay(day, today);
              const isSelected = isSameDay(day, selectedDay);
              const shown = view === "month" ? dayEvents.slice(0, MAX_CHIPS_PER_CELL) : dayEvents;
              const hidden = dayEvents.length - shown.length;

              return (
                <div
                  key={key}
                  onClick={() => selectDay(day)}
                  className={`group relative min-w-0 cursor-pointer flex-col gap-1 border-b border-r border-line p-1.5 ${
                    view === "month" && !inMonth ? "hidden sm:flex" : "flex"
                  } ${isSelected ? "bg-slate-light/40" : inMonth ? "bg-surface hover:bg-paper/60" : "bg-paper/50"}`}
                >
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        selectDay(day);
                      }}
                      aria-label={`${longDayTitle(day)}${dayEvents.length ? `, ${dayEvents.length} items` : ""}`}
                      aria-current={isToday ? "date" : undefined}
                      className={`grid h-6 min-w-6 place-items-center rounded-full px-1 text-xs font-semibold ${
                        isToday ? "bg-ink text-white" : inMonth ? "text-fg" : "text-ink-soft"
                      }`}
                    >
                      {day.getDate()}
                    </button>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        setAddDay(key);
                      }}
                      aria-label={`Add to ${longDayTitle(day)}`}
                      className="rounded p-0.5 text-ink-soft opacity-0 transition hover:bg-paper hover:text-fg focus-visible:opacity-100 group-hover:opacity-100"
                    >
                      <Plus size={14} aria-hidden="true" />
                    </button>
                  </div>

                  {/* The weekday header row is hidden on phones, so each cell names its day. */}
                  <p className="text-[11px] font-medium text-ink-soft sm:hidden">{WEEKDAY_LABELS[day.getDay()]}</p>

                  <div className="flex min-w-0 flex-col gap-0.5" onClick={(event) => event.stopPropagation()}>
                    {shown.map((event) => (
                      <EventChip key={`${event.type}-${event.id}-${key}`} event={event} compact={view === "month"} />
                    ))}
                    {hidden > 0 && (
                      <button
                        type="button"
                        onClick={() => selectDay(day)}
                        className="px-1 text-left text-[11px] font-medium text-slate hover:underline"
                      >
                        +{hidden} more
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Selected-day agenda */}
        <aside aria-label="Selected day" className="rounded-lg border border-line bg-surface p-4 lg:sticky lg:top-4 lg:self-start">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h2 className="font-serif text-lg leading-tight text-fg">{longDayTitle(selectedDay)}</h2>
              <p className="mt-0.5 text-xs text-ink-soft">
                {selectedEvents.length === 0
                  ? "Nothing scheduled"
                  : `${selectedEvents.length} ${selectedEvents.length === 1 ? "item" : "items"}`}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setAddDay(toDateKey(selectedDay))}
              className="inline-flex shrink-0 items-center gap-1 rounded-md border border-line px-2.5 py-1.5 text-xs font-semibold text-fg hover:bg-paper"
            >
              <Plus size={13} aria-hidden="true" /> Add
            </button>
          </div>

          {selectedEvents.length > 0 && (
            <ul className="mt-3 space-y-2">
              {selectedEvents.map((event) => {
                const state = eventStateLabel(event);
                return (
                  <li key={`${event.type}-${event.id}`} className="rounded-md border border-line p-2">
                    <EventChip event={event} />
                    <p className="mt-1 flex flex-wrap gap-x-2 text-[11px] text-ink-soft">
                      <span>{eventTimeLabel(event)}</span>
                      {state && <span>· {state}</span>}
                      {event.related_record_name && <span>· {event.related_record_name}</span>}
                      {scope === "team" && event.owner_name && <span>· {event.owner_name}</span>}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </aside>
      </div>

      <QuickAddDialog
        day={addDay}
        onClose={() => setAddDay(null)}
        onCreated={(message) => {
          setToast(message);
          void load();
        }}
      />

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-[60] -translate-x-1/2 animate-toast-in rounded-md border border-line bg-surface px-4 py-2.5 text-sm font-medium text-fg shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}
