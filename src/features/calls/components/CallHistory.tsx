"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, CalendarClock, Clock3, FileEdit, PhoneCall, PhoneOff, Timer } from "lucide-react";
import CallOutcomeBadge from "@/features/calls/components/CallOutcomeBadge";
import { CallService } from "@/features/calls/services/CallService";
import type { CallRecordHistory, CallRecordHistoryEvent } from "@/features/calls/types/call.types";
import {
  CALL_FIELD_LABELS,
  formatCallDateTime,
  formatChangeValue,
  formatDuration,
} from "@/features/calls/utils/callFormat";
import { formatDateTime } from "@/shared/utils/formatDate";
import { withReturnTo } from "@/shared/utils/returnTo";

interface CallHistoryProps {
  /** The call being viewed; its events get a "This call" tag. */
  callId: string;
  /** Changes whenever the call is edited, so the history reloads. */
  updatedAt: string;
  recordName: string;
  /** Where another call's page should send the user back to. */
  returnTo?: string | null;
}

type Scope = "all" | "this";

const EVENT_META: Record<string, { title: string; icon: typeof PhoneCall; tone: string }> = {
  CALL_LOGGED: { title: "Call logged", icon: PhoneCall, tone: "text-success" },
  CALL_UPDATED: { title: "Call updated", icon: FileEdit, tone: "text-slate" },
  CALL_DELETED: { title: "Call deleted", icon: PhoneOff, tone: "text-danger" },
};

/**
 * History tab: every call logged on the same lead / contact, newest first.
 * Each entry shows the call's date and time, duration (when one was entered),
 * outcome and notes as they were at that moment, plus the old → new values of
 * any edit. Backed by `GET /calls/{id}/history/`.
 */
export default function CallHistory({ callId, updatedAt, recordName, returnTo = null }: CallHistoryProps) {
  const [history, setHistory] = useState<CallRecordHistory | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scope, setScope] = useState<Scope>("all");

  const load = useCallback(async () => {
    setError(null);
    try {
      setHistory(await CallService.getCallRecordHistory(callId));
    } catch {
      setHistory(null);
      setError("Couldn't load the call history.");
    }
  }, [callId]);

  useEffect(() => {
    void load();
  }, [load, updatedAt]);

  const events = (history?.events ?? []).filter((event) => scope === "all" || event.call_id === callId);

  return (
    <div className="mt-4 rounded-lg border border-line bg-surface">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5">
        <div className="flex items-center gap-1 py-2 text-xs" role="group" aria-label="History scope">
          {(
            [
              ["all", `All calls with ${recordName}`],
              ["this", "This call only"],
            ] as [Scope, string][]
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setScope(value)}
              aria-pressed={scope === value}
              className={`rounded-md px-2.5 py-1 font-medium transition ${
                scope === value ? "bg-slate-light text-slate" : "text-ink-soft hover:bg-paper"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-5 py-5">
        {error ? (
          <div className="flex items-center justify-between gap-3 py-4">
            <p className="text-sm text-danger">{error}</p>
            <button
              type="button"
              onClick={() => void load()}
              className="rounded-md border border-line px-3 py-1.5 text-sm text-fg hover:bg-paper"
            >
              Retry
            </button>
          </div>
        ) : !history ? (
          <div className="space-y-3" aria-label="Loading history">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-16 animate-shimmer rounded-md" />
            ))}
          </div>
        ) : events.length === 0 ? (
          <div className="py-12 text-center animate-scale-in">
            <Clock3 size={22} className="mx-auto mb-2 text-ink-soft" />
            <p className="text-sm font-medium text-fg">No history yet</p>
            <p className="mt-1 text-xs text-ink-soft">When a call is logged or edited, it will appear here.</p>
          </div>
        ) : (
          <ol className="relative">
            {events.map((event, index) => (
              <HistoryItem
                key={event.id}
                event={event}
                isCurrent={event.call_id === callId}
                isLast={index === events.length - 1}
                returnTo={returnTo}
              />
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}

function HistoryItem({
  event,
  isCurrent,
  isLast,
  returnTo,
}: {
  event: CallRecordHistoryEvent;
  isCurrent: boolean;
  isLast: boolean;
  returnTo: string | null;
}) {
  const meta = EVENT_META[event.event_type] ?? { title: event.message, icon: PhoneCall, tone: "text-slate" };
  const Icon = meta.icon;
  const call = event.call;
  const changes = Object.entries(event.changes ?? {});
  const hasDuration = typeof call.duration_seconds === "number" && call.duration_seconds > 0;
  const canOpen = event.call_id && !isCurrent && event.event_type !== "CALL_DELETED";

  return (
    <li className="relative flex gap-3">
      <div className="relative flex w-8 shrink-0 justify-center">
        {!isLast && (
          <span aria-hidden="true" className="absolute bottom-0 left-1/2 top-8 w-0.5 -translate-x-1/2 bg-slate-light" />
        )}
        <span className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full border border-line bg-surface ${meta.tone}`}>
          <Icon size={15} />
        </span>
      </div>

      <div className={`min-w-0 flex-1 pt-1 ${isLast ? "" : "pb-7"}`}>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <p className="text-sm font-medium leading-snug text-fg">{meta.title}</p>
          {isCurrent && (
            <span className="rounded-full bg-slate-light px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate">
              This call
            </span>
          )}
        </div>
        <p className="mt-0.5 text-xs text-ink-soft">
          {event.actor?.name ? `by ${event.actor.name} · ` : ""}
          {formatDateTime(event.created_at)}
        </p>

        {/* The call as it was at this moment */}
        <div className="mt-2 rounded-md border border-line bg-paper/50 px-3 py-2.5 text-sm">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
            {call.call_start_time && (
              <span className="inline-flex items-center gap-1.5 font-medium text-fg">
                <CalendarClock size={14} className="text-ink-soft" />
                {formatCallDateTime(call.call_start_time)}
              </span>
            )}
            {call.outcome && <CallOutcomeBadge outcome={call.outcome} />}
            {call.call_type && <span className="text-xs text-ink-soft">{call.call_type}</span>}
            {hasDuration && (
              <span className="inline-flex items-center gap-1.5 text-xs text-ink-soft">
                <Timer size={13} />
                {call.duration_label ?? formatDuration(call.duration_seconds as number)}
              </span>
            )}
            {call.owner_name && <span className="text-xs text-ink-soft">Owner: {call.owner_name}</span>}
          </div>

          {call.description && (
            <p className="mt-2 whitespace-pre-wrap break-words text-sm text-ink-soft">{call.description}</p>
          )}
        </div>

        {changes.length > 0 && (
          <ul className="mt-2 space-y-2">
            {changes.map(([field, change]) => (
              <li key={field} className="rounded-md border border-line bg-paper/50 px-3 py-2 text-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
                  {CALL_FIELD_LABELS[field] ?? field.replace(/_/g, " ")}
                </p>
                <div className="mt-1 flex flex-wrap items-start gap-x-2 gap-y-1">
                  <span className="max-w-full whitespace-pre-wrap break-words text-ink-soft line-through decoration-ink-soft/50">
                    {formatChangeValue(field, change.old_value)}
                  </span>
                  <ArrowRight size={14} className="mt-0.5 shrink-0 text-ink-soft" />
                  <span className="max-w-full whitespace-pre-wrap break-words font-medium text-fg">
                    {formatChangeValue(field, change.new_value)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}

        {canOpen && (
          <Link
            href={withReturnTo(`/dashboard/calls/${event.call_id}`, returnTo)}
            className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-slate hover:text-fg"
          >
            View this call <ArrowRight size={12} />
          </Link>
        )}
      </div>
    </li>
  );
}
