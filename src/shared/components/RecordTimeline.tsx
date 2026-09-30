"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowRightCircle,
  CheckCircle2,
  Clock3,
  FileEdit,
  Filter,
  Loader2,
  PlusCircle,
  RefreshCcw,
  Trash2,
  UserSquare2,
} from "lucide-react";
import { TimelineService, type TimelineEvent, type TimelineModule } from "@/features/timeline/services/TimelineService";

interface RecordTimelineProps {
  module: TimelineModule;
  recordId: string;
  /** On converted contact/account records, show a "View Lead History" link on the conversion entry. */
  showLeadOrigin?: boolean;
  compact?: boolean;
}

interface ChangeEntry {
  old_value?: unknown;
  new_value?: unknown;
}

const ISO_DATETIME = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})?/g;

/**
 * Replaces raw ISO timestamps (e.g. "2026-09-29T18:30:00+00:00") with a
 * readable local date-time in 12-hour format (e.g. "Sep 30, 2026, 12:00 AM").
 * Text without timestamps is returned untouched.
 */
function formatIsoDates(text: string) {
  return text.replace(ISO_DATETIME, (match) => {
    const date = new Date(match);
    if (Number.isNaN(date.getTime())) return match;
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  });
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
function highlightMessage(
  message: string,
  changes: Record<string, ChangeEntry> | null,
  extraValues: string[] = [],
) {
  message = formatIsoDates(message);
  if (!changes && extraValues.length === 0) return [{ text: message, bold: false }];

  const values = [
    ...Object.values(changes ?? {}).flatMap((change) => [change.old_value, change.new_value]),
    ...extraValues,
  ]
    .filter((value): value is string | number => typeof value === "string" || typeof value === "number")
    .map((value) => formatIsoDates(String(value)))
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
  if (type.includes("CONTACT_CREATED")) return { Icon: UserSquare2, tone: "text-slate" };
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
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}


/**
 * Returns the id of the lead this record was created from, when the event
 * came from a lead conversion. The backend sends it as
 * `metadata.source_lead_id` on the "created by converting the Lead" event.
 */
function getSourceLeadId(event: TimelineEvent): string | null {
  const metadata = event.raw?.metadata as Record<string, unknown> | undefined;
  if (!metadata) return null;
  const id = metadata.source_lead_id ?? metadata.lead_id;
  return typeof id === "string" && id.trim() ? id : null;
}

/** True for entries created by a lead conversion (they carry the source lead). */
function isLeadOriginEvent(event: TimelineEvent) {
  const metadata = event.raw?.metadata as Record<string, unknown> | undefined;
  return metadata?.source === "LEAD_CONVERSION" && getSourceLeadId(event) !== null;
}

function formatTime(value: string) {
  const date = new Date(value);
  // Always 12-hour with AM/PM (e.g. "6:08 PM"), regardless of browser locale.
  return Number.isNaN(date.getTime())
    ? ""
    : date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
}

export default function RecordTimeline({ module, recordId, showLeadOrigin = false, compact = false }: RecordTimelineProps) {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("All");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

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

  // Close the filter popover on outside click.
  useEffect(() => {
    if (!isFilterOpen) return;
    function handleClick(event: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) setIsFilterOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isFilterOpen]);

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
    <div className={`${compact ? "mt-0" : "mt-4"} rounded-lg border border-line bg-surface`}>
      {/* "History" tab strip */}
      <div className="border-b border-line px-5">
        <span className="-mb-px inline-block border-b-2 border-indigo-600 px-1 py-3 text-sm font-medium text-indigo-600">
          History
        </span>
      </div>

      <div className="px-5 py-5">
        <div className="mb-5 flex items-center gap-3">
          <h2 className="text-sm font-semibold text-fg">Timeline History</h2>
          <div ref={filterRef} className="relative">
            <button
              type="button"
              aria-label="Filter timeline"
              aria-expanded={isFilterOpen}
              onClick={() => setIsFilterOpen((open) => !open)}
              className={`flex h-8 w-9 items-center justify-center rounded-md border bg-surface text-fg transition hover:bg-paper ${
                filter !== "All" ? "border-indigo-600" : "border-line"
              }`}
            >
              <Filter size={15} />
            </button>
            {isFilterOpen && (
              <div className="absolute left-0 top-full z-20 mt-1 max-h-64 min-w-48 overflow-y-auto rounded-md border border-line bg-surface py-1 shadow-lg">
                {filters.map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => {
                      setFilter(value);
                      setIsFilterOpen(false);
                    }}
                    className={`block w-full px-3 py-1.5 text-left text-xs hover:bg-paper ${
                      value === filter ? "font-semibold text-indigo-600" : "text-fg"
                    }`}
                  >
                    {value}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

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
          <div className="space-y-8">
            {groups.map(([day, dayEvents]) => (
              <div key={day}>
                {/* Date chip */}
                <div className="mb-4 inline-flex min-w-28 items-center justify-center rounded-md border border-line bg-paper px-3 py-1 text-xs text-fg">
                  {formatDayLabel(dayEvents[0].timestamp)}
                </div>

                <ol className="relative">
                  {dayEvents.map((event, index) => {
                    const { Icon, tone } = iconFor(event.event_type ?? event.type);
                    const changes = getChanges(event);
                    const isLast = index === dayEvents.length - 1;
                    const sourceLeadId = getSourceLeadId(event);
                    const leadOrigin = showLeadOrigin && module !== "leads" && isLeadOriginEvent(event);
                    const metadata = event.raw?.metadata as Record<string, unknown> | undefined;
                    const leadName = typeof metadata?.source_lead_name === "string" ? metadata.source_lead_name : "";
                    const segments = highlightMessage(event.title, changes, leadOrigin && leadName ? [leadName] : []);
                    const actor = event.actor_name || event.user_name || event.user;

                    return (
                      <li key={event.id} className="relative flex gap-3">
                        <time className="w-[4.5rem] shrink-0 pt-1.5 text-right text-xs text-fg">
                          {formatTime(event.timestamp)}
                        </time>

                        {/* Icon column with the vertical connector line */}
                        <div className="relative flex w-8 shrink-0 justify-center">
                          {!isLast && <span aria-hidden="true" className="absolute left-1/2 top-8 bottom-0 w-0.5 -translate-x-1/2 bg-slate-light" />}
                          <span className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full border border-line bg-surface ${tone}`}>
                            <Icon size={15} />
                          </span>
                        </div>

                        <div className={`min-w-0 flex-1 pt-1 ${isLast ? "" : "pb-7"}`}>
                          <p className="text-sm leading-snug text-fg">
                            {segments.map((segment, i) => (
                              <Fragment key={i}>
                                {segment.bold ? <span className="font-medium text-indigo-600">{segment.text}</span> : segment.text}
                              </Fragment>
                            ))}
                            {leadOrigin && sourceLeadId && (
                              <Link
                                href={`/dashboard/leads/${sourceLeadId}?tab=timeline`}
                                className="ml-4 whitespace-nowrap text-sm text-fg underline underline-offset-4 transition hover:text-indigo-600"
                              >
                                View Lead History
                              </Link>
                            )}
                          </p>
                          {(actor || event.timestamp) && (
                            <p className="mt-0.5 text-xs text-ink-soft">
                              {actor && <>by {actor} </>}
                              {formatDayLabel(event.timestamp)}
                              {event.source ? ` · ${event.source}` : ""}
                            </p>
                          )}
                          {event.description && (
                            <p className="mt-1 text-sm text-ink-soft">{formatIsoDates(event.description)}</p>
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
