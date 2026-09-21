"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import {
  ArrowRightCircle,
  CheckCircle2,
  Clock3,
  FileEdit,
  Loader2,
  PlusCircle,
  RefreshCcw,
  Trash2,
} from "lucide-react";
import { TimelineService, type TimelineEvent, type TimelineModule } from "@/features/timeline/services/TimelineService";

interface RecordTimelineProps {
  module: TimelineModule;
  recordId: string;
}

interface ChangeEntry {
  old_value?: unknown;
  new_value?: unknown;
}

/** Reads `metadata.changes` off the raw backend event, if present. */
function getChanges(event: TimelineEvent): Record<string, ChangeEntry> | null {
  const metadata = event.raw?.metadata as Record<string, unknown> | undefined;
  const changes = metadata?.changes;
  return changes && typeof changes === "object" ? (changes as Record<string, ChangeEntry>) : null;
}

/**
 * Splits an event's message into plain/bold segments, bolding the actual
 * old/new values reported in `metadata.changes` (e.g. "Junk Lead",
 * "Lost Lead"). Falls back to the plain message untouched when there's
 * nothing to highlight — this never invents text, it only styles values
 * the backend already sent.
 */
function highlightMessage(message: string, changes: Record<string, ChangeEntry> | null) {
  if (!changes) return [{ text: message, bold: false }];

  const values = Object.values(changes)
    .flatMap((change) => [change.old_value, change.new_value])
    .filter((value): value is string | number => typeof value === "string" || typeof value === "number")
    .map((value) => String(value))
    .filter((value) => value.length > 0)
    .sort((a, b) => b.length - a.length); // longest first, avoids partial-substring overlap

  if (values.length === 0) return [{ text: message, bold: false }];

  const pattern = new RegExp(`(${values.map((value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "g");
  return message
    .split(pattern)
    .filter((part) => part.length > 0)
    .map((part) => ({ text: part, bold: values.includes(part) }));
}

function iconFor(eventType: string | null | undefined) {
  const type = (eventType ?? "").toUpperCase();
  if (type.includes("STATUS_CHANGED")) return { Icon: RefreshCcw, tone: "text-slate" };
  if (type.includes("CREATED")) return { Icon: PlusCircle, tone: "text-success" };
  if (type.includes("CONVERTED")) return { Icon: ArrowRightCircle, tone: "text-slate" };
  if (type.includes("COMPLETED")) return { Icon: CheckCircle2, tone: "text-success" };
  if (type.includes("DELETED")) return { Icon: Trash2, tone: "text-danger" };
  if (type.includes("UPDATED")) return { Icon: FileEdit, tone: "text-slate" };
  return { Icon: Clock3, tone: "text-ink-soft" };
}

function dateKey(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toDateString();
}

function formatDayLabel(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function formatTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

export default function RecordTimeline({ module, recordId }: RecordTimelineProps) {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("All");

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    TimelineService.getTimeline(module, recordId)
      .then((data) => {
        if (!cancelled) {
          setEvents(data);
          setError(null);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setEvents([]);
          setError("Couldn't load the timeline.");
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [module, recordId]);

  const filters = useMemo(() => {
    const values = events
      .map((event) => event.type || event.title)
      .filter(Boolean)
      .map((value) => String(value));
    return ["All", ...Array.from(new Set(values))];
  }, [events]);

  const visibleEvents = filter === "All"
    ? events
    : events.filter((event) => (event.type || event.title) === filter);

  // Newest first, grouped under a date separator per calendar day.
  const groups = useMemo(() => {
    const sorted = [...visibleEvents].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    const byDay = new Map<string, TimelineEvent[]>();
    for (const event of sorted) {
      const key = dateKey(event.timestamp);
      const bucket = byDay.get(key);
      if (bucket) bucket.push(event);
      else byDay.set(key, [event]);
    }
    return Array.from(byDay.entries());
  }, [visibleEvents]);

  return (
    <div className="mt-4 rounded-lg border border-line bg-surface">
      <div className="flex flex-col gap-3 border-b border-line px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-fg">Timeline</h2>
          <p className="text-xs text-ink-soft">Record history and activity</p>
        </div>
        <select
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
          className="rounded-md border border-line bg-surface px-3 py-2 text-xs text-fg outline-none transition focus:border-slate focus:ring-2 focus:ring-slate-light"
        >
          {filters.map((value) => (
            <option key={value} value={value}>{value}</option>
          ))}
        </select>
      </div>

      <div className="px-5 py-5">
        {isLoading ? (
          <div className="space-y-4 py-2" aria-label="Loading timeline">
            <div className="flex items-center gap-2 pb-2 text-sm text-ink-soft">
              <Loader2 size={16} className="animate-spin" /> Loading timeline…
            </div>
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex gap-4">
                <div className="h-3 w-12 rounded animate-shimmer" />
                <div className="h-7 w-7 shrink-0 rounded-full animate-shimmer" />
                <div className="h-10 flex-1 rounded-md animate-shimmer" />
              </div>
            ))}
          </div>
        ) : error ? (
          <p className="rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p>
        ) : groups.length === 0 ? (
          <div className="py-12 text-center animate-scale-in">
            <Clock3 size={22} className="mx-auto mb-2 text-ink-soft" />
            <p className="text-sm font-medium text-fg">No timeline activity</p>
            <p className="mt-1 text-xs text-ink-soft">Changes and activities for this record will appear here.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {groups.map(([day, dayEvents]) => (
              <div key={day}>
                <div className="mb-3 inline-flex items-center rounded-md border border-line bg-paper px-2.5 py-1 text-xs font-medium text-ink-soft">
                  {formatDayLabel(dayEvents[0].timestamp)}
                </div>

                <ol className="relative border-l border-line pl-0">
                  {dayEvents.map((event) => {
                    const { Icon, tone } = iconFor(event.event_type ?? event.type);
                    const changes = getChanges(event);
                    const segments = highlightMessage(event.title, changes);
                    const actor = event.actor_name || event.user_name || event.user;

                    return (
                      <li key={event.id} className="relative flex gap-4 pb-6 last:pb-0">
                        <time className="w-14 shrink-0 pt-0.5 text-right text-xs text-ink-soft">
                          {formatTime(event.timestamp)}
                        </time>

                        <span className={`relative -ml-px flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-line bg-surface ${tone}`}>
                          <Icon size={14} />
                        </span>

                        <div className="min-w-0 flex-1 pt-0.5">
                          <p className="text-sm leading-relaxed text-fg">
                            {segments.map((segment, i) => (
                              <Fragment key={i}>
                                {segment.bold ? <strong className="font-semibold">{segment.text}</strong> : segment.text}
                              </Fragment>
                            ))}
                          </p>
                          {event.description && (
                            <p className="mt-1 text-sm text-ink-soft">{event.description}</p>
                          )}
                          {actor && (
                            <p className="mt-1 text-xs text-ink-soft">
                              by <span className="font-medium text-fg">{actor}</span>
                              {event.source ? ` · ${event.source}` : ""}
                            </p>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ol>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
