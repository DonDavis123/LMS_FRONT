"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowRightCircle,
  ArrowUpRight,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock3,
  FileEdit,
  FileUp,
  Filter,
  Handshake,
  Loader2,
  Mail,
  Mic,
  PhoneCall,
  PlusCircle,
  RefreshCcw,
  Trash2,
  Trophy,
  Undo2,
  UserSquare2,
  XCircle,
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

/** Readable labels for deal events when the backend sends only the raw event type. */
const DEAL_EVENT_LABELS: Record<string, string> = {
  DEAL_CREATED: "Deal created",
  DEAL_UPDATED: "Deal updated",
  DEAL_STAGE_CHANGED: "Deal stage changed",
  DEAL_WON: "Deal won",
  DEAL_LOST: "Deal lost",
  DEAL_DELETED: "Deal deleted",
};

function iconFor(eventType: string | null | undefined) {
  const type = (eventType ?? "").toUpperCase();
  if (type.startsWith("DEAL_")) {
    if (type === "DEAL_WON") return { Icon: Trophy, tone: "text-success" };
    if (type === "DEAL_LOST") return { Icon: XCircle, tone: "text-danger" };
    if (type.includes("DELETED")) return { Icon: Trash2, tone: "text-danger" };
    if (type.includes("STAGE_CHANGED")) return { Icon: ArrowRightCircle, tone: "text-slate" };
    if (type.includes("CREATED")) return { Icon: Handshake, tone: "text-success" };
    return { Icon: FileEdit, tone: "text-slate" };
  }
  if (type.startsWith("CALL_RECORDING_")) {
    return { Icon: Mic, tone: type.includes("DELETED") ? "text-danger" : "text-success" };
  }
  if (type.startsWith("CALL_")) {
    return { Icon: PhoneCall, tone: type.includes("DELETED") ? "text-danger" : type.includes("LOGGED") ? "text-success" : "text-slate" };
  }
  // "Email opened in Gmail" — a draft was started, not necessarily sent.
  if (type.startsWith("EMAIL_")) return { Icon: Mail, tone: "text-slate" };
  if (type.includes("LEAD_IMPORT")) return { Icon: type.includes("UNDONE") ? Undo2 : FileUp, tone: "text-slate" };
  if (type.includes("STATUS_CHANGED")) return { Icon: RefreshCcw, tone: "text-slate" };
  if (type.includes("CONTACT_CREATED")) return { Icon: UserSquare2, tone: "text-slate" };
  if (type.includes("CREATED")) return { Icon: PlusCircle, tone: "text-success" };
  if (type.includes("CONVERTED")) return { Icon: ArrowRightCircle, tone: "text-slate" };
  if (type.includes("COMPLETED")) return { Icon: CheckCircle2, tone: "text-success" };
  if (type.includes("DELETED")) return { Icon: Trash2, tone: "text-danger" };
  if (type.includes("UPDATED")) return { Icon: FileEdit, tone: "text-slate" };
  return { Icon: Clock3, tone: "text-ink-soft" };
}

/** Soft tinted bubble + badge styling for each icon tone. */
function toneStyles(tone: string) {
  if (tone === "text-success") {
    return { bubble: "border-success/30 bg-success-soft", badge: "bg-success-soft text-success", ping: "bg-success/40" };
  }
  if (tone === "text-danger") {
    return { bubble: "border-danger/30 bg-danger-soft", badge: "bg-danger-soft text-danger", ping: "bg-danger/40" };
  }
  if (tone === "text-ink-soft") {
    return { bubble: "border-line bg-paper", badge: "bg-paper text-ink-soft", ping: "bg-slate/30" };
  }
  return {
    bubble: "border-slate/30 bg-slate/10 dark:text-slate-300",
    badge: "bg-slate/10 text-slate dark:text-slate-300",
    ping: "bg-slate/40",
  };
}

/** Short category badge shown on every entry. */
function labelFor(eventType: string | null | undefined) {
  const type = (eventType ?? "").toUpperCase();
  if (type.startsWith("DEAL_")) return "Deal";
  if (type.startsWith("CALL_RECORDING_")) return "Recording";
  if (type.startsWith("CALL_")) return "Call";
  if (type.startsWith("EMAIL_")) return "Email";
  if (type.includes("LEAD_IMPORT")) return "Import";
  if (type.includes("STATUS_CHANGED")) return "Status";
  if (type.includes("CONVERTED")) return "Conversion";
  if (type.includes("CREATED")) return "Created";
  if (type.includes("COMPLETED")) return "Completed";
  if (type.includes("DELETED")) return "Deleted";
  if (type.includes("UPDATED")) return "Updated";
  return "Activity";
}

/** "Today" / "Yesterday" for recent day groups, otherwise empty. */
function relativeDay(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diffDays = Math.round((startOfDay(new Date()) - startOfDay(date)) / 86_400_000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  return "";
}

function LinkPill({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="group/link inline-flex items-center gap-1 rounded-full border border-line bg-surface px-2.5 py-0.5 text-xs font-medium text-fg transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 dark:hover:border-indigo-400/40 dark:hover:bg-indigo-500/10 dark:hover:text-indigo-300"
    >
      {children}
      <ArrowUpRight size={12} className="transition-transform group-hover/link:-translate-y-px group-hover/link:translate-x-px" />
    </Link>
  );
}

/** "LEAD_STATUS_CHANGED" -> "Lead status changed" (display only; filtering still uses the raw value). */
function prettyFilterLabel(value: string) {
  if (!/^[A-Z0-9_]+$/.test(value)) return value;
  const words = value.toLowerCase().replace(/_/g, " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
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

/** The call a CALL_LOGGED / CALL_UPDATED entry is about (it is not offered for deleted calls). */
function getCallId(event: TimelineEvent): string | null {
  const type = (event.event_type ?? event.type ?? "").toUpperCase();
  if (!type.startsWith("CALL_") || type.includes("DELETED")) return null;
  const metadata = event.raw?.metadata as Record<string, unknown> | undefined;
  const id = metadata?.call_id;
  return typeof id === "string" && id.trim() ? id : null;
}

/** The deal a DEAL_* entry is about (not offered for deleted deals). */
function getDealId(event: TimelineEvent): string | null {
  const type = (event.event_type ?? event.type ?? "").toUpperCase();
  if (!type.startsWith("DEAL_") || type.includes("DELETED")) return null;
  const metadata = event.raw?.metadata as Record<string, unknown> | undefined;
  const id = metadata?.deal_id ?? event.raw?.entity_id;
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
    // `offset` = how many entries precede this day, used to stagger the entrance.
    let offset = 0;
    return Array.from(byDay.entries()).map(([day, dayEvents]) => {
      const group = { day, dayEvents, offset };
      offset += dayEvents.length;
      return group;
    });
  }, [visibleEvents]);

  const totalVisible = visibleEvents.length;

  return (
    <div className={`${compact ? "mt-0" : "mt-4"} overflow-visible rounded-2xl border border-line bg-surface shadow-sm`}>
      {/* Header: title, entry count and filter */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300">
            <Clock3 size={17} />
          </span>
          <div>
            <h2 className="flex items-center gap-2 text-sm font-semibold text-fg">
              Timeline History
              {!isLoading && !error && (
                <span className="rounded-full bg-paper px-2 py-0.5 text-[11px] font-medium tabular-nums text-ink-soft">
                  {totalVisible}
                </span>
              )}
            </h2>
            <p className="text-xs text-ink-soft">Every change and activity on this record</p>
          </div>
        </div>

        <div ref={filterRef} className="relative">
          <button
            type="button"
            aria-label="Filter timeline"
            aria-expanded={isFilterOpen}
            onClick={() => setIsFilterOpen((open) => !open)}
            className={`flex h-9 max-w-[16rem] items-center gap-2 rounded-full border bg-surface pl-3 pr-2.5 text-xs font-medium text-fg transition-all duration-200 hover:bg-paper active:scale-[0.97] ${
              filter !== "All"
                ? "border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300"
                : "border-line"
            }`}
          >
            <Filter size={14} />
            <span className="truncate">{filter === "All" ? "All activity" : prettyFilterLabel(filter)}</span>
            <ChevronDown size={14} className={`shrink-0 transition-transform duration-200 ${isFilterOpen ? "rotate-180" : ""}`} />
          </button>
          {isFilterOpen && (
            <div className="animate-popover-down absolute right-0 top-full z-20 mt-2 max-h-64 min-w-52 overflow-y-auto rounded-xl border border-line bg-surface p-1 shadow-lg">
              {filters.map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => {
                    setFilter(value);
                    setIsFilterOpen(false);
                  }}
                  className={`flex w-full items-center justify-between gap-3 rounded-lg px-3 py-1.5 text-left text-xs transition-colors hover:bg-paper ${
                    value === filter ? "font-semibold text-indigo-600 dark:text-indigo-300" : "text-fg"
                  }`}
                >
                  {value === "All" ? "All activity" : prettyFilterLabel(value)}
                  {value === filter && <Check size={13} />}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="px-5 py-6">
        {isLoading ? (
          <div className="space-y-6 py-1" aria-label="Loading timeline">
            <div className="flex items-center gap-2 text-sm text-ink-soft">
              <Loader2 size={16} className="animate-spin" /> Loading timeline…
            </div>
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="mt-2 h-3 w-[4.5rem] rounded animate-shimmer" />
                <div className="h-8 w-8 shrink-0 rounded-full animate-shimmer" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-3/4 rounded-md animate-shimmer" />
                  <div className="h-3 w-1/3 rounded-md animate-shimmer" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p>
        ) : groups.length === 0 ? (
          <div className="py-14 text-center animate-scale-in">
            <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-paper text-ink-soft ring-8 ring-paper/60">
              <Clock3 size={22} />
            </span>
            <p className="text-sm font-medium text-fg">No timeline activity</p>
            <p className="mt-1 text-xs text-ink-soft">Changes and activities for this record will appear here.</p>
          </div>
        ) : (
          <div className="space-y-9">
            {groups.map(({ day, dayEvents, offset }) => {
              const relative = relativeDay(dayEvents[0].timestamp);
              return (
                <div key={day}>
                  {/* Date header: chip + fading rule */}
                  <div className="mb-5 flex items-center gap-3">
                    <div className="inline-flex items-center gap-2 rounded-full border border-line bg-paper px-3 py-1 text-xs font-medium text-fg">
                      <CalendarDays size={13} className="text-ink-soft" />
                      {formatDayLabel(dayEvents[0].timestamp)}
                      {relative && (
                        <span className="rounded-full bg-indigo-600 px-1.5 py-px text-[10px] font-semibold uppercase tracking-wide text-white">
                          {relative}
                        </span>
                      )}
                    </div>
                    <span aria-hidden="true" className="h-px flex-1 bg-gradient-to-r from-line to-transparent" />
                  </div>

                  <ol className="relative">
                    {dayEvents.map((event, index) => {
                      const eventType = event.event_type ?? event.type;
                      const { Icon, tone } = iconFor(eventType);
                      const styles = toneStyles(tone);
                      const changes = getChanges(event);
                      const isLast = index === dayEvents.length - 1;
                      const isLatest = offset + index === 0;
                      const delay = `${Math.min((offset + index) * 55, 650)}ms`;
                      const sourceLeadId = getSourceLeadId(event);
                      const callId = module === "tasks" || module === "meetings" ? null : getCallId(event);
                      const dealId = module === "deals" ? null : getDealId(event);
                      const leadOrigin = showLeadOrigin && module !== "leads" && isLeadOriginEvent(event);
                      const metadata = event.raw?.metadata as Record<string, unknown> | undefined;
                      const leadName = typeof metadata?.source_lead_name === "string" ? metadata.source_lead_name : "";
                      const title = DEAL_EVENT_LABELS[event.title.toUpperCase()] ?? event.title;
                      const segments = highlightMessage(title, changes, leadOrigin && leadName ? [leadName] : []);
                      const actor = event.actor_name || event.user_name || event.user;
                      const returnTo = encodeURIComponent(`/dashboard/${module}/${recordId}?tab=timeline`);
                      const hasLinks = Boolean(callId || dealId || (leadOrigin && sourceLeadId));

                      return (
                        <li key={event.id} className="group relative flex gap-3 animate-timeline-item" style={{ animationDelay: delay }}>
                          <time
                            dateTime={event.timestamp}
                            className="w-[4.5rem] shrink-0 pt-2 text-right text-xs font-medium tabular-nums text-ink-soft"
                          >
                            {formatTime(event.timestamp)}
                          </time>

                          {/* Icon column with the vertical connector line */}
                          <div className="relative flex w-8 shrink-0 justify-center">
                            {!isLast && (
                              <span
                                aria-hidden="true"
                                className="animate-timeline-line absolute left-1/2 top-9 bottom-0 w-0.5 -translate-x-1/2 rounded-full bg-gradient-to-b from-slate/35 to-slate/10"
                                style={{ animationDelay: delay }}
                              />
                            )}
                            {isLatest && (
                              <span
                                aria-hidden="true"
                                className={`animate-timeline-ping absolute top-0 h-8 w-8 rounded-full ${styles.ping}`}
                              />
                            )}
                            <span
                              className={`animate-timeline-dot relative z-10 flex h-8 w-8 items-center justify-center rounded-full border shadow-sm transition-transform duration-300 ease-out group-hover:scale-110 ${styles.bubble} ${tone}`}
                              style={{ animationDelay: delay }}
                            >
                              <Icon size={15} />
                            </span>
                          </div>

                          <div className="min-w-0 flex-1 pb-3">
                            <div
                              // ring (not border): globals.css forces `* { border-color }`, which would defeat border-transparent.
                              className="-mx-3 -mt-0.5 rounded-xl px-3 py-2 ring-1 ring-transparent transition-all duration-200 group-hover:bg-paper/70 group-hover:shadow-sm group-hover:ring-line"
                            >
                              <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
                                <p className="min-w-0 flex-1 text-sm leading-snug text-fg">
                                  {segments.map((segment, i) => (
                                    <Fragment key={i}>
                                      {segment.bold ? (
                                        <span className="rounded-md bg-indigo-50 px-1.5 py-0.5 text-[13px] font-medium text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300">
                                          {segment.text}
                                        </span>
                                      ) : (
                                        segment.text
                                      )}
                                    </Fragment>
                                  ))}
                                </p>
                                <span
                                  className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${styles.badge}`}
                                >
                                  {labelFor(eventType)}
                                </span>
                              </div>

                              {(actor || event.timestamp) && (
                                <p className="mt-1 text-xs text-ink-soft">
                                  {actor && (
                                    <>
                                      by <span className="font-medium text-fg/80">{actor}</span>{" "}
                                    </>
                                  )}
                                  {formatDayLabel(event.timestamp)}
                                  {event.source ? ` · ${event.source}` : ""}
                                </p>
                              )}
                              {event.description && (
                                <p className="mt-1.5 text-sm text-ink-soft">{formatIsoDates(event.description)}</p>
                              )}

                              {hasLinks && (
                                <div className="mt-2 flex flex-wrap gap-2">
                                  {callId && <LinkPill href={`/dashboard/calls/${callId}?returnTo=${returnTo}`}>View Call</LinkPill>}
                                  {dealId && <LinkPill href={`/dashboard/deals/${dealId}?returnTo=${returnTo}`}>View Deal</LinkPill>}
                                  {leadOrigin && sourceLeadId && (
                                    // `from`/`fromId` let the (read-only) lead history page link back to
                                    // the exact Contact/Account the user came from.
                                    <LinkPill href={`/dashboard/leads/${sourceLeadId}?from=${module}&fromId=${encodeURIComponent(recordId)}`}>
                                      View Lead History
                                    </LinkPill>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
