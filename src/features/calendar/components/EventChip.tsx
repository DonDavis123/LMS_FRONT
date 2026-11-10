import Link from "next/link";
import { Bell, CalendarClock, Phone, SquareCheckBig, type LucideIcon } from "lucide-react";
import type { CalendarEvent, CalendarEventType } from "@/features/calendar/types/calendar.types";
import { eventHref, formatTime, isOverdueCall } from "@/features/calendar/utils/calendarDates";

export const EVENT_TYPE_META: Record<
  CalendarEventType,
  { label: string; plural: string; icon: LucideIcon; tone: string; dot: string }
> = {
  TASK: { label: "Task", plural: "Tasks", icon: SquareCheckBig, tone: "bg-amber/15 text-amber-dark", dot: "bg-amber-dark" },
  MEETING: { label: "Meeting", plural: "Meetings", icon: CalendarClock, tone: "bg-slate-light text-slate", dot: "bg-slate" },
  CALL: { label: "Call", plural: "Calls", icon: Phone, tone: "bg-success-soft text-success", dot: "bg-success" },
  REMINDER: { label: "Reminder", plural: "Reminders", icon: Bell, tone: "border border-line bg-paper text-ink-soft", dot: "bg-ink-soft" },
};

/**
 * Done items fade; missed calls turn red; planned calls get a dashed outline so they read as "not happened yet".
 * A planned call whose time has passed is dashed red: it is overdue, not upcoming.
 */
export function stateClasses(event: CalendarEvent, now: number = Date.now()): string {
  if (event.type === "TASK" && event.status === "Completed") return "opacity-60 line-through";
  if (event.type === "CALL" && event.status === "Missed") return "bg-danger-soft text-danger";
  if (isOverdueCall(event, now)) return "bg-danger-soft text-danger border border-dashed border-danger/60";
  if (event.type === "CALL" && event.status === "Planned") return "border border-dashed border-success/60";
  if (event.type === "REMINDER" && event.status === "Disabled") return "opacity-60";
  return "";
}

/** "Planned", "Overdue", "Missed" … shown for items whose state matters at a glance. */
export function eventStateLabel(event: CalendarEvent, now: number = Date.now()): string | null {
  if (isOverdueCall(event, now)) return "Overdue";
  if (event.type === "CALL" && event.status && event.status !== "Completed") return event.status;
  if (event.type === "TASK" && event.status) return event.status;
  if (event.type === "REMINDER" && event.status === "Disabled") return "Disabled";
  return null;
}

export function eventTimeLabel(event: CalendarEvent): string {
  if (event.all_day) return "All day";
  if (event.type === "MEETING" && event.end) return `${formatTime(event.start)} – ${formatTime(event.end)}`;
  return formatTime(event.start);
}

interface EventChipProps {
  event: CalendarEvent;
  /** `compact` is the one-line chip used inside grid cells. */
  compact?: boolean;
  /** Current time in ms, so every chip on screen agrees on what is overdue. Defaults to now. */
  now?: number;
}

export default function EventChip({ event, compact = false, now = Date.now() }: EventChipProps) {
  const meta = EVENT_TYPE_META[event.type];
  const Icon = meta.icon;
  const time = event.all_day || event.type === "TASK" ? null : formatTime(event.start);

  return (
    <Link
      href={eventHref(event.type, event.id)}
      title={`${meta.label}: ${event.title}${event.owner_name ? ` · ${event.owner_name}` : ""}`}
      className={`flex min-w-0 items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium leading-4 transition hover:brightness-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-slate ${meta.tone} ${stateClasses(event, now)} ${
        compact ? "" : "py-1 text-xs"
      }`}
    >
      <Icon size={compact ? 11 : 13} aria-hidden="true" className="shrink-0" />
      {time && <span className="shrink-0 tabular-nums opacity-80">{time}</span>}
      <span className="truncate">{event.title}</span>
      <span className="sr-only">
        {meta.label}
        {eventStateLabel(event, now) ? `, ${eventStateLabel(event, now)}` : ""}
      </span>
    </Link>
  );
}
