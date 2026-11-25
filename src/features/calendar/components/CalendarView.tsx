"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { AlertTriangle, BellRing, CalendarDays, ChevronLeft, ChevronRight, Plus, RefreshCw, Sparkles, X } from "lucide-react";
import { authService } from "@/features/auth/services/authService";
import { normalizeEnumValue } from "@/shared/utils/enumValue";
import { extractApiError } from "@/shared/utils/apiError";
import Spinner from "@/shared/components/Spinner";
import SegmentedControl from "@/shared/components/SegmentedControl";
import { CalendarService } from "@/features/calendar/services/CalendarService";
import {
  CALENDAR_EVENT_TYPES,
  type CalendarEvent,
  type CalendarEventType,
  type CalendarScope,
  type CalendarView as ViewMode,
} from "@/features/calendar/types/calendar.types";
import {
  eventSeenKey,
  getSeenKeys,
  isPendingEvent,
  markEventsSeen,
} from "@/features/calendar/utils/calendarAttention";
import {
  WEEKDAY_LABELS,
  addDays,
  eventDayKeys,
  groupEventsByDay,
  isOverdueCall,
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
import SeasonalArt from "@/features/calendar/components/SeasonalArt";
import SeasonalHeader from "@/features/calendar/components/SeasonalHeader";
import { getFestival, themeCssVars } from "@/features/calendar/config/seasonalThemes";
import { useSeasonalTheme } from "@/features/calendar/hooks/useSeasonalTheme";
import QuickAddDialog from "@/features/calendar/components/QuickAddDialog";
import DayTimeGrid from "@/features/calendar/components/DayTimeGrid";
import "@/features/calendar/styles/calendar.css";

/** Roles that may switch to the whole-company calendar (mirrors the backend). */
const TEAM_VIEW_ROLES = new Set(["SUPERADMIN", "ADMIN", "SALESMANAGER", "SALES_MANAGER"]);

const MAX_CHIPS_PER_CELL = 3;

function isSameMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

const VIEW_MODES: ViewMode[] = ["month", "week", "day"];

const VIEW_OPTIONS = VIEW_MODES.map((mode) => ({ value: mode, label: mode.charAt(0).toUpperCase() + mode.slice(1) }));
interface ViewTransitionLike {
  finished: Promise<unknown>;
}

const SCOPE_OPTIONS: { value: CalendarScope; label: string }[] = [
  { value: "mine", label: "My calendar" },
  { value: "team", label: "Team" },
];

/** Shared look for the toolbar's outline buttons: lift on hover, press-down on click. */
const TOOLBAR_BTN =
  "group inline-flex h-[38px] items-center justify-center gap-1.5 rounded-xl border border-line bg-surface text-fg shadow-sm outline-none transition-all duration-200 ease-out hover:-translate-y-px hover:border-slate/40 hover:bg-paper hover:shadow-md focus-visible:ring-2 focus-visible:ring-slate/60 active:translate-y-0 active:scale-95 active:shadow-sm";

/** Remembers the view and day so "Back to Calendar" from a record reopens the same place. */
const CALENDAR_STATE_KEY = "crm.calendar.state";

function readSavedState(): { view: ViewMode; anchor: Date; selectedDay: Date } | null {
  try {
    const raw = window.sessionStorage.getItem(CALENDAR_STATE_KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw) as { view?: string; anchor?: number; selectedDay?: number };
    if (!saved.view || !VIEW_MODES.includes(saved.view as ViewMode)) return null;
    if (typeof saved.anchor !== "number" || typeof saved.selectedDay !== "number") return null;
    const anchor = new Date(saved.anchor);
    const selectedDay = new Date(saved.selectedDay);
    if (Number.isNaN(anchor.getTime()) || Number.isNaN(selectedDay.getTime())) return null;
    return { view: saved.view as ViewMode, anchor: startOfDay(anchor), selectedDay: startOfDay(selectedDay) };
  } catch {
    return null;
  }
}
const VIEW_UNIT: Record<ViewMode, string> = { month: "month", week: "week", day: "day" };

export default function CalendarView() {
  const [view, setView] = useState<ViewMode>("month");
  // How the content area should enter: slide with the direction of travel when
  // paging, or a soft rise when the view itself changes.
  const [motion, setMotion] = useState<"view" | "next" | "prev" | "none">("view");
  const contentRef = useRef<HTMLDivElement | null>(null);
  const [anchor, setAnchor] = useState<Date>(() => startOfDay(new Date()));
  const [selectedDay, setSelectedDay] = useState<Date>(() => startOfDay(new Date()));
  const [scope, setScope] = useState<CalendarScope>("mine");
  const [enabledTypes, setEnabledTypes] = useState<Set<CalendarEventType>>(() => new Set(CALENDAR_EVENT_TYPES));
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addDay, setAddDay] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  // Ticks once a minute so overdue calls and the day view's "now" line stay current.
  const [now, setNow] = useState<number>(() => Date.now());
  // Items that were new to the user when this page opened. They stay highlighted
  // (and listed in the "New today" panel) for this visit, even though the header
  // badge has already been cleared.
  const [freshKeys, setFreshKeys] = useState<Set<string>>(() => new Set());
  // Only the newest request may update the calendar (fast month switching).
  const latestRequest = useRef(0);

  // Restore the last view/day once on mount (client-only, so SSR markup is unaffected).
  const stateRestored = useRef(false);
  useEffect(() => {
    const saved = readSavedState();
    if (saved) {
      setView(saved.view);
      setAnchor(saved.anchor);
      setSelectedDay(saved.selectedDay);
    }
    stateRestored.current = true;
  }, []);

  useEffect(() => {
    if (!stateRestored.current) return;
    try {
      window.sessionStorage.setItem(
        CALENDAR_STATE_KEY,
        JSON.stringify({ view, anchor: anchor.getTime(), selectedDay: selectedDay.getTime() }),
      );
    } catch {
      /* storage unavailable — the calendar just opens on today next time */
    }
  }, [view, anchor, selectedDay]);

  const canViewTeam = useMemo(() => {
    const role = normalizeEnumValue(authService.getSessionUser()?.role);
    return TEAM_VIEW_ROLES.has(role);
  }, []);

  const today = useMemo(() => startOfDay(new Date()), []);
  const days = useMemo(() => {
    if (view !== "month") return weekDays(anchor);
    // Drop a trailing week made only of next-month days, so short months fit the screen.
    const grid = monthGridDays(anchor);
    return grid.slice(0, grid.slice(35).every((day) => day.getMonth() !== anchor.getMonth()) ? 35 : 42);
  }, [view, anchor]);
  // Seasonal decoration follows the month being viewed; the user can switch it off.
  const { theme, enabled: themeOn, toggle: toggleTheme } = useSeasonalTheme(anchor.getMonth());


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
    const timer = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 3000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const visibleEvents = useMemo(() => events.filter((event) => enabledTypes.has(event.type)), [events, enabledTypes]);
  const byDay = useMemo(() => groupEventsByDay(visibleEvents), [visibleEvents]);

  // Showing today's pending items counts as the user seeing them: remember that
  // right away so the header badge clears, and keep them highlighted here.
  useEffect(() => {
    if (isLoading || scope !== "mine") return;
    const { start, end } = visibleRange(view, anchor);
    if (today.getTime() < start.getTime() || today.getTime() >= end.getTime()) return;

    const todayKey = toDateKey(today);
    const seen = getSeenKeys();
    const unseen = visibleEvents.filter(
      (event) =>
        isPendingEvent(event, Date.now()) && eventDayKeys(event).includes(todayKey) && !seen.has(eventSeenKey(event)),
    );
    if (unseen.length === 0) return;

    const keys = unseen.map(eventSeenKey);
    setFreshKeys((current) => new Set([...current, ...keys]));
    markEventsSeen(keys);
  }, [isLoading, scope, view, anchor, today, visibleEvents]);

  const freshEvents = useMemo(
    () => visibleEvents.filter((event) => freshKeys.has(eventSeenKey(event))),
    [visibleEvents, freshKeys],
  );
  const typeCounts = useMemo(() => {
    const counts: Record<CalendarEventType, number> = { TASK: 0, MEETING: 0, CALL: 0, REMINDER: 0 };
    for (const event of events) counts[event.type] += 1;
    return counts;
  }, [events]);
  const overdueCount = useMemo(
    () => visibleEvents.filter((event) => isOverdueCall(event, now)).length,
    [visibleEvents, now],
  );

  function step(direction: -1 | 1) {
    setMotion(direction === 1 ? "next" : "prev");
    if (view === "day") {
      const next = addDays(anchor, direction);
      setAnchor(next);
      setSelectedDay(next);
      return;
    }
    const next =
      view === "month"
        ? new Date(anchor.getFullYear(), anchor.getMonth() + direction, 1)
        : addDays(anchor, direction * 7);
    setAnchor(next);
    // Keep the side panel on a day that is actually on screen: today if it is
    // in the new month, otherwise the first day of the new range.
    setSelectedDay(view === "month" && isSameMonth(next, today) ? today : next);
  }

  /**
   * Swaps Month/Week/Day with a cross-fade between the old and new layout
   * (View Transitions API, see calendar.css). Browsers without it, and users
   * who prefer reduced motion, get the plain CSS fade-in instead.
   */
  function switchView(direction: "deeper" | "shallower", update: () => void) {
    const start = (document as unknown as { startViewTransition?: (callback: () => void) => ViewTransitionLike })
      .startViewTransition;
    const element = contentRef.current;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!start || !element || reduceMotion) {
      setMotion("view");
      update();
      return;
    }

    const root = document.documentElement;
    root.dataset.calDir = direction;
    // Named only while transitioning (a permanent name would trap fixed descendants).
    element.style.setProperty("view-transition-name", "cal-content");
    const transition = start.call(document, () => {
      flushSync(() => {
        setMotion("none");
        update();
      });
      contentRef.current?.style.setProperty("view-transition-name", "cal-content");
    });
    void transition.finished.finally(() => {
      delete root.dataset.calDir;
      contentRef.current?.style.removeProperty("view-transition-name");
    });
  }

  function changeView(mode: ViewMode) {
    if (mode === view) return;
    const direction = VIEW_MODES.indexOf(mode) > VIEW_MODES.indexOf(view) ? "deeper" : "shallower";
    switchView(direction, () => {
      // Keep the user's place: the new view opens on the day they were looking at.
      setAnchor(selectedDay);
      setView(mode);
    });
  }

  function openDay(day: Date) {
    switchView("deeper", () => {
      setSelectedDay(day);
      setAnchor(day);
      setView("day");
    });
  }

  function goToday() {
    setMotion(startOfDay(new Date()).getTime() >= anchor.getTime() ? "next" : "prev");
    setAnchor(startOfDay(new Date()));
    setSelectedDay(startOfDay(new Date()));
  }

  function selectDay(day: Date) {
    setSelectedDay(day);
    // Clicking a spill-over day of the neighbouring month moves the grid there.
    if (view === "month" && day.getMonth() !== anchor.getMonth()) {
      setMotion(day.getTime() > anchor.getTime() ? "next" : "prev");
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

  const lineCls = theme ? "border-[var(--cal-line)] dark:border-[var(--cal-line-dk)]" : "border-line";
  const selectedEvents = byDay.get(toDateKey(selectedDay)) ?? [];
  const selectedFestival = theme ? getFestival(view === "day" ? anchor : selectedDay) : null;
  const title = view === "month" ? monthTitle(anchor) : view === "week" ? weekTitle(anchor) : longDayTitle(anchor);

  return (
    <div
      style={theme ? themeCssVars(theme) : undefined}
      className={
        theme
          ? "relative isolate mx-auto w-full max-w-[1400px] overflow-hidden rounded-3xl border border-[var(--cal-line)] bg-[var(--cal-paper)] px-2 py-2 sm:px-3 sm:py-3 dark:border-[var(--cal-line-dk)] dark:bg-[var(--cal-paper-dk)]"
          : "mx-auto w-full max-w-[1400px] px-4 py-5 sm:px-6"
      }
    >
      {theme && <SeasonalArt kind={theme.art} />}
      {theme && (
        <SeasonalHeader
          theme={theme}
          heading={view === "month" ? monthTitle(anchor).split(" ")[0] : title}
          year={view === "month" ? anchor.getFullYear() : undefined}
        />
      )}

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        {!theme && (
          <h1 className="mr-2 font-serif text-2xl text-fg sm:min-w-[21rem]" aria-live="polite">
            {title}
          </h1>
        )}

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => step(-1)}
            aria-label={`Previous ${VIEW_UNIT[view]}`}
            className={`${TOOLBAR_BTN} w-[38px]`}
          >
            <ChevronLeft size={16} className="transition-transform duration-200 group-hover:-translate-x-0.5" />
          </button>
          <button type="button" onClick={goToday} className={`${TOOLBAR_BTN} px-4 text-sm font-medium`}>
            Today
          </button>
          <button
            type="button"
            onClick={() => step(1)}
            aria-label={`Next ${VIEW_UNIT[view]}`}
            className={`${TOOLBAR_BTN} w-[38px]`}
          >
            <ChevronRight size={16} className="transition-transform duration-200 group-hover:translate-x-0.5" />
          </button>
        </div>

        <SegmentedControl
          mode="toggle"
          size="xs"
          variant="solid"
          accent={theme ? "var(--cal-accent)" : undefined}
          label="Calendar view"
          value={view}
          onChange={changeView}
          options={VIEW_OPTIONS}
        />

        {canViewTeam && (
          <SegmentedControl
            mode="toggle"
            size="xs"
            variant="solid"
            accent={theme ? "var(--cal-accent)" : undefined}
            label="Whose calendar"
            value={scope}
            onChange={setScope}
            options={SCOPE_OPTIONS}
          />
        )}

        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={toggleTheme}
            aria-pressed={themeOn}
            title={themeOn ? "Turn off the seasonal theme" : "Turn on the seasonal theme"}
            className={`${TOOLBAR_BTN} px-3 text-xs font-medium ${themeOn ? "border-slate/50 bg-slate-light/60" : "text-ink-soft hover:text-fg"}`}
          >
            <Sparkles
              size={14}
              aria-hidden="true"
              className={`transition-transform duration-300 group-hover:rotate-12 group-hover:scale-125 ${themeOn ? "text-amber-dark" : ""}`}
            />
            <span className="hidden sm:inline">Theme: {themeOn ? "On" : "Off"}</span>
            <span className="sr-only sm:hidden">Seasonal theme {themeOn ? "on" : "off"}</span>
          </button>
          <button
            type="button"
            onClick={() => void load()}
            aria-label="Refresh calendar"
            title="Refresh"
            className={`${TOOLBAR_BTN} w-[38px] text-ink-soft hover:text-fg`}
          >
            <RefreshCw
              size={16}
              className={isLoading ? "animate-spin" : "transition-transform duration-500 ease-out group-hover:rotate-180"}
            />
          </button>
          <button
            type="button"
            onClick={() => setAddDay(toDateKey(selectedDay))}
            style={theme ? { background: "var(--cal-accent)" } : undefined}
            className={`group relative inline-flex h-[38px] items-center gap-1.5 overflow-hidden rounded-xl ${
              theme ? "" : "bg-ink hover:bg-ink-2"
            } px-4 text-sm font-semibold text-white shadow-[0_1px_2px_rgba(18,33,58,0.25),0_6px_14px_-6px_rgba(18,33,58,0.55)] outline-none transition-all duration-200 ease-out hover:-translate-y-px hover:shadow-[0_2px_4px_rgba(18,33,58,0.25),0_10px_20px_-8px_rgba(18,33,58,0.65)] hover:brightness-110 focus-visible:ring-2 focus-visible:ring-slate/60 focus-visible:ring-offset-2 active:translate-y-0 active:scale-95`}
          >
            {/* Light sweep across the button on hover. */}
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 -left-full w-1/2 -skew-x-12 bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-[320%]"
            />
            <Plus size={16} aria-hidden="true" className="relative transition-transform duration-300 group-hover:rotate-90" />
            <span className="relative">Add</span>
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
              className={`group inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium outline-none transition-all duration-200 ease-out hover:-translate-y-px focus-visible:ring-2 focus-visible:ring-slate/60 active:translate-y-0 active:scale-95 ${
                on ? `border-transparent shadow-sm hover:shadow-md ${meta.tone}` : "border-line text-ink-soft line-through hover:bg-paper"
              }`}
            >
              <Icon size={13} aria-hidden="true" className="transition-transform duration-200 group-hover:scale-125" />
              {meta.plural}
              <span className="tabular-nums opacity-70">{typeCounts[type]}</span>
            </button>
          );
        })}
        {overdueCount > 0 && (
          <span
            className="inline-flex items-center gap-1.5 rounded-full bg-danger-soft px-3 py-1 text-xs font-semibold text-danger"
            title="Planned calls whose time has passed. They are marked Missed automatically after an hour."
          >
            <AlertTriangle size={13} aria-hidden="true" />
            {overdueCount} overdue {overdueCount === 1 ? "call" : "calls"}
          </span>
        )}
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

      {freshEvents.length > 0 && (
        <section
          aria-label="New today"
          className="mt-3 rounded-lg border border-amber/40 bg-amber/10 p-3"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <BellRing size={16} className="text-amber-dark" aria-hidden="true" />
              <h2 className="text-sm font-semibold text-fg">
                New today · {freshEvents.length} {freshEvents.length === 1 ? "item needs" : "items need"} your attention
              </h2>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              {view !== "day" && (
                <button
                  type="button"
                  onClick={() => openDay(today)}
                  className="rounded-md border border-line bg-surface px-2.5 py-1 text-xs font-semibold text-fg hover:bg-paper"
                >
                  Open today
                </button>
              )}
              <button
                type="button"
                onClick={() => setFreshKeys(new Set())}
                aria-label="Dismiss"
                title="Dismiss"
                className="rounded-md p-1 text-ink-soft hover:bg-paper hover:text-fg"
              >
                <X size={14} aria-hidden="true" />
              </button>
            </div>
          </div>
          <ul className="mt-2 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {freshEvents.map((event) => {
              const state = eventStateLabel(event, now);
              return (
                <li key={`fresh-${event.type}-${event.id}`} className="rounded-md border border-line bg-surface p-2">
                  <EventChip event={event} now={now} isNew />
                  <p className="mt-1 flex flex-wrap gap-x-2 text-[11px] text-ink-soft">
                    <span>{eventTimeLabel(event)}</span>
                    {state && <span className={state === "Overdue" ? "font-semibold text-danger" : undefined}>· {state}</span>}
                    {event.related_record_name && <span>· {event.related_record_name}</span>}
                  </p>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* Re-keyed per view/period so the content re-enters instead of snapping.
          Only the content is wrapped: the toast and dialogs stay outside, since a
          lingering transform here would trap `position: fixed` descendants. */}
      <div
        key={`${view}:${toDateKey(anchor)}`}
        ref={contentRef}
        className={
          motion === "next" ? "animate-cal-next"
          : motion === "prev" ? "animate-cal-prev"
          : motion === "view" ? "animate-tab-panel"
          : undefined
        }
      >
      {view === "day" ? (
        <div className="mt-4">
          {selectedFestival && (
            <p className="mb-2 text-sm font-medium" style={{ color: theme?.accent }}>
              <span aria-hidden="true">{selectedFestival.emoji}</span> {selectedFestival.label}
            </p>
          )}
          <DayTimeGrid
            day={anchor}
            events={byDay.get(toDateKey(anchor)) ?? []}
            now={now}
            showOwner={scope === "team"}
            onAdd={setAddDay}
          />
        </div>
      ) : (
      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        {/* Grid */}
        <section aria-label={`${view === "month" ? "Month" : "Week"} calendar`} className="min-w-0">
          <div className={`hidden grid-cols-7 border-b ${lineCls} text-center text-xs font-semibold uppercase tracking-wide text-ink-soft sm:grid`}>
            {WEEKDAY_LABELS.map((label) => (
              <div key={label} className={`py-2 ${theme && label === "Sun" ? "text-[var(--cal-accent)]" : ""}`}>
                {label}
              </div>
            ))}
          </div>

          <div
            className={`grid grid-cols-1 border-l ${lineCls} sm:grid-cols-7 ${
              view === "month"
                ? theme
                  ? "sm:auto-rows-[minmax(84px,1fr)]"
                  : "sm:auto-rows-[minmax(104px,1fr)]"
                : "sm:auto-rows-[minmax(320px,1fr)]"
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
              const festival = theme ? getFestival(day) : null;

              return (
                <div
                  key={key}
                  onClick={() => selectDay(day)}
                  onDoubleClick={() => openDay(day)}
                  className={`group relative min-w-0 cursor-pointer flex-col gap-1 border-b border-r ${lineCls} p-1.5 ${
                    view === "month" && !inMonth ? "hidden sm:flex" : "flex"
                  } ${
                    theme
                      ? isSelected
                        ? "bg-[var(--cal-select)]"
                        : inMonth
                          ? "bg-[var(--cal-cell)] hover:brightness-95 dark:bg-[var(--cal-cell-dk)]"
                          : "bg-transparent"
                      : isSelected
                        ? "bg-slate-light/40"
                        : inMonth
                          ? "bg-surface hover:bg-paper/60"
                          : "bg-paper/50"
                  }`}
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
                      style={isToday && theme ? { backgroundColor: theme.accent } : undefined}
                      className={`grid h-6 min-w-6 place-items-center rounded-full px-1 text-xs font-semibold ${
                        isToday ? "bg-ink text-white" : inMonth ? "text-fg" : "text-ink-soft"
                      }`}
                    >
                      {day.getDate()}
                    </button>
                    {festival && (
                      <span
                        title={festival.label}
                        className="min-w-0 flex-1 truncate px-1 text-[11px] leading-none text-ink-soft"
                      >
                        <span aria-hidden="true">{festival.emoji}</span>
                        <span className="ml-1 hidden xl:inline">{festival.label}</span>
                        <span className="sr-only">{festival.label}</span>
                      </span>
                    )}
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
                      <EventChip
                        key={`${event.type}-${event.id}-${key}`}
                        event={event}
                        compact={view === "month"}
                        now={now}
                        isNew={freshKeys.has(eventSeenKey(event))}
                      />
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
        <aside
          aria-label="Selected day"
          className={`border p-4 lg:sticky lg:top-4 lg:self-start ${
            theme
              ? "rounded-2xl border-[var(--cal-line)] bg-[var(--cal-cell)] dark:border-[var(--cal-line-dk)] dark:bg-[var(--cal-cell-dk)]"
              : "rounded-lg border-line bg-surface"
          }`}
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <h2 className="font-serif text-lg leading-tight text-fg">{longDayTitle(selectedDay)}</h2>
              {selectedFestival && (
                <p className="mt-0.5 text-xs font-medium" style={{ color: theme?.accent }}>
                  <span aria-hidden="true">{selectedFestival.emoji}</span> {selectedFestival.label}
                </p>
              )}
              <p className="mt-0.5 text-xs text-ink-soft">
                {selectedEvents.length === 0
                  ? "Nothing scheduled"
                  : `${selectedEvents.length} ${selectedEvents.length === 1 ? "item" : "items"}`}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <button
                type="button"
                onClick={() => openDay(selectedDay)}
                aria-label={`Open day view for ${longDayTitle(selectedDay)}`}
                title="Open day view"
                className="rounded-md border border-line p-1.5 text-ink-soft hover:bg-paper hover:text-fg"
              >
                <CalendarDays size={14} aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => setAddDay(toDateKey(selectedDay))}
                className="inline-flex items-center gap-1 rounded-md border border-line px-2.5 py-1.5 text-xs font-semibold text-fg hover:bg-paper"
              >
                <Plus size={13} aria-hidden="true" /> Add
              </button>
            </div>
          </div>

          {selectedEvents.length > 0 && (
            <ul className="mt-3 space-y-2">
              {selectedEvents.map((event) => {
                const state = eventStateLabel(event, now);
                return (
                  <li key={`${event.type}-${event.id}`} className="rounded-md border border-line p-2">
                    <EventChip event={event} now={now} isNew={freshKeys.has(eventSeenKey(event))} />
                    <p className="mt-1 flex flex-wrap gap-x-2 text-[11px] text-ink-soft">
                      <span>{eventTimeLabel(event)}</span>
                      {state && <span className={state === "Overdue" ? "font-semibold text-danger" : undefined}>· {state}</span>}
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
      )}
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
