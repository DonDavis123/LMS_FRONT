"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { createPortal } from "react-dom";
import { ArrowUpRight, ChevronDown, PhoneCall, X } from "lucide-react";
import type { RelatedToValue } from "@/shared/components/RelatedToPicker";
import type { PaginationMeta } from "@/shared/types/pagination";
import { withReturnTo } from "@/shared/utils/returnTo";
import CallDirectionIcon from "@/features/calls/components/CallDirectionIcon";
import CallOutcomeBadge from "@/features/calls/components/CallOutcomeBadge";
import LogCallFromRecord from "@/features/calls/components/LogCallFromRecord";
import { CallService, type CallRecordKind } from "@/features/calls/services/CallService";
import type { Call } from "@/features/calls/types/call.types";
import { formatCallDateTime } from "@/features/calls/utils/callFormat";

interface RecordCallsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  kind: CallRecordKind;
  recordId: string;
  recordName: string;
  /** Pre-fills the Log Call form. */
  related: RelatedToValue;
  /** Called after a call is logged from the drawer (e.g. to refresh a call counter). */
  onLogged?: () => void;
}

const PAGE_SIZE = 10;

const KIND_LABEL: Record<CallRecordKind, string> = {
  lead: "Lead",
  contact: "Contact",
  account: "Account",
};

/**
 * Side panel opened from a Leads / Contacts / Accounts list row. Shows every
 * call logged on that record (expandable, so the user never has to open the
 * record) and lets the user log a new call from the list itself.
 */
export default function RecordCallsDrawer({
  isOpen,
  onClose,
  kind,
  recordId,
  recordName,
  related,
  onLogged,
}: RecordCallsDrawerProps) {
  const [calls, setCalls] = useState<Call[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const load = useCallback(
    async (page: number, append: boolean) => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await CallService.getCallsForRecord(kind, recordId, page, PAGE_SIZE);
        setCalls((current) => (append ? [...current, ...response.results] : response.results));
        setPagination(response.pagination);
      } catch {
        if (!append) setCalls([]);
        setError("Couldn't load calls.");
      } finally {
        setIsLoading(false);
      }
    },
    [kind, recordId],
  );

  useEffect(() => {
    if (!isOpen) return;
    setExpandedId(null);
    void load(1, false);
  }, [isOpen, load]);

  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(event: KeyboardEvent) {
      // The Log Call modal handles its own Escape; don't close both at once.
      if (event.key === "Escape" && !document.querySelector('[role="dialog"]')) onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen, onClose]);

  if (!isOpen || typeof document === "undefined") return null;

  const total = pagination?.total ?? 0;
  const hasMore = pagination ? pagination.page < pagination.total_pages : false;
  const returnTo = window.location.pathname + window.location.search;
  const latest = calls[0];

  return createPortal(
    <div onClick={onClose} className="fixed inset-0 z-40 flex justify-end bg-black/40 animate-fade-in">
      <aside
        role="complementary"
        aria-label={`Calls for ${recordName}`}
        onClick={(event) => event.stopPropagation()}
        onDoubleClick={(event) => event.stopPropagation()}
        className="flex h-full w-full max-w-md flex-col border-l border-line bg-surface shadow-xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">{KIND_LABEL[kind]} calls</p>
            <h2 className="truncate font-serif text-lg text-fg">{recordName}</h2>
            <p className="mt-0.5 text-xs text-ink-soft">
              {isLoading && !pagination
                ? "Loading…"
                : total === 0
                  ? "No calls logged yet"
                  : `${total} ${total === 1 ? "call" : "calls"}${latest ? ` · last call ${formatCallDateTime(latest.call_start_time)}` : ""}`}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-md p-1 text-ink-soft hover:bg-paper hover:text-fg"
          >
            <X size={18} />
          </button>
        </div>

        <div className="border-b border-line px-5 py-3">
          <LogCallFromRecord
            related={related}
            buttonLabel="Log a Call"
            variant="primary"
            onLogged={() => {
              void load(1, false);
              onLogged?.();
            }}
          />
          {kind === "account" && (
            <p className="mt-2 text-xs text-ink-soft">
              A call is logged against a contact — pick one of this account&apos;s contacts in the form.
            </p>
          )}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-2">
          {isLoading && calls.length === 0 ? (
            <div className="space-y-3 py-3" aria-label="Loading calls">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-16 animate-shimmer rounded-md" />
              ))}
            </div>
          ) : error && calls.length === 0 ? (
            <div className="flex items-center justify-between gap-3 py-4">
              <p className="text-sm text-danger">{error}</p>
              <button
                type="button"
                onClick={() => void load(1, false)}
                className="rounded-md border border-line px-3 py-1.5 text-sm text-fg hover:bg-paper"
              >
                Retry
              </button>
            </div>
          ) : calls.length === 0 ? (
            <div className="py-16 text-center animate-scale-in">
              <PhoneCall size={22} className="mx-auto mb-2 text-ink-soft" />
              <p className="text-sm font-medium text-fg">No calls with {recordName} yet</p>
              <p className="mt-1 text-xs text-ink-soft">Log a call to keep the outcome, duration and notes here.</p>
            </div>
          ) : (
            <ul className={`divide-y divide-line transition-opacity ${isLoading ? "opacity-60" : ""}`}>
              {calls.map((call) => {
                const expanded = expandedId === call.id;
                return (
                  <li key={call.id} className="py-3">
                    <button
                      type="button"
                      onClick={() => setExpandedId(expanded ? null : call.id)}
                      aria-expanded={expanded}
                      className="flex w-full items-start gap-3 rounded-md text-left"
                    >
                      <CallDirectionIcon callType={call.call_type} className="mt-0.5 h-9 w-9" size={16} />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                          <span className="text-sm font-medium text-fg">{formatCallDateTime(call.call_start_time)}</span>
                          <CallOutcomeBadge outcome={call.outcome} status={call.status} />
                        </div>
                        <p className="mt-1 text-xs text-ink-soft">
                          {call.call_type} · {call.duration_label} · by {call.owner_name ?? "Unassigned"}
                        </p>
                        {kind === "account" && call.contact_name && (
                          <p className="mt-0.5 text-xs text-ink-soft">with {call.contact_name}</p>
                        )}
                        {call.description && !expanded && (
                          <p className="mt-1.5 line-clamp-2 whitespace-pre-wrap text-sm text-ink-soft">{call.description}</p>
                        )}
                      </div>
                      <ChevronDown
                        size={15}
                        className={`mt-2 shrink-0 text-ink-soft transition-transform ${expanded ? "rotate-180" : ""}`}
                      />
                    </button>

                    {expanded && (
                      <div className="ml-12 mt-3 space-y-2 rounded-md border border-line bg-paper/40 p-3 text-sm animate-scale-in">
                        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-xs">
                          <dt className="text-ink-soft">Status</dt>
                          <dd className="text-fg">{call.status}</dd>
                          <dt className="text-ink-soft">Duration</dt>
                          <dd className="text-fg">{call.duration_label}</dd>
                          <dt className="text-ink-soft">Logged via</dt>
                          <dd className="text-fg">{call.entry_method === "TIMER" ? "Call timer" : "Manual entry"}</dd>
                          {call.account_name && (
                            <>
                              <dt className="text-ink-soft">Account</dt>
                              <dd className="text-fg">{call.account_name}</dd>
                            </>
                          )}
                        </dl>
                        <p className="whitespace-pre-wrap text-sm text-fg">
                          {call.description ?? <span className="text-ink-soft">No notes added.</span>}
                        </p>
                        <Link
                          href={withReturnTo(`/dashboard/calls/${call.id}`, returnTo)}
                          className="inline-flex items-center gap-1 text-xs font-medium text-slate hover:underline"
                        >
                          Open full call details <ArrowUpRight size={12} />
                        </Link>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}

          {error && calls.length > 0 && <p className="py-2 text-sm text-danger">{error}</p>}
          {hasMore && (
            <div className="py-3 text-center">
              <button
                type="button"
                disabled={isLoading}
                onClick={() => void load((pagination?.page ?? 1) + 1, true)}
                className="rounded-md border border-line px-4 py-1.5 text-sm text-fg hover:bg-paper disabled:opacity-40"
              >
                {isLoading ? "Loading…" : "Load more"}
              </button>
            </div>
          )}
        </div>
      </aside>
    </div>,
    document.body,
  );
}
