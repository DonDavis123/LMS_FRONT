"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Mic, PhoneCall } from "lucide-react";
import type { RelatedToValue } from "@/shared/components/RelatedToPicker";
import type { PaginationMeta } from "@/shared/types/pagination";
import { withReturnTo } from "@/shared/utils/returnTo";
import CallDirectionIcon from "@/features/calls/components/CallDirectionIcon";
import CallOutcomeBadge from "@/features/calls/components/CallOutcomeBadge";
import LogCallFromRecord from "@/features/calls/components/LogCallFromRecord";
import RecordingUploadDialog from "@/features/calls/components/RecordingUploadDialog";
import { CallService, type CallRecordKind } from "@/features/calls/services/CallService";
import type { Call } from "@/features/calls/types/call.types";
import { MAX_RECORDINGS_PER_CALL } from "@/features/calls/types/callRecording.types";
import { formatCallDateTime } from "@/features/calls/utils/callFormat";

interface RecordCallsProps {
  kind: CallRecordKind;
  recordId: string;
  recordName: string;
  /** Pre-fills the Log Call form. */
  related: RelatedToValue;
  /** Where a call's detail page should send the user back to. */
  returnTo: string;
  /** Bump to reload the list (e.g. after a call is logged from the page header). */
  refreshKey?: number;
}

const PAGE_SIZE = 5;

/** The "Calls" panel on a Lead / Contact page: every call logged on the record, newest first. */
export default function RecordCalls({ kind, recordId, recordName, related, returnTo, refreshKey = 0 }: RecordCallsProps) {
  const [calls, setCalls] = useState<Call[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Call a recording is being added to from this list, and the confirmation after it.
  const [recordingFor, setRecordingFor] = useState<Call | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(
    async (requestedPage: number) => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await CallService.getCallsForRecord(kind, recordId, requestedPage, PAGE_SIZE);
        if (response.pagination.total_pages > 0 && requestedPage > response.pagination.total_pages) {
          setPage(response.pagination.total_pages);
          return;
        }
        setCalls(response.results);
        setPagination(response.pagination);
      } catch {
        setCalls([]);
        setError("Couldn't load calls.");
      } finally {
        setIsLoading(false);
      }
    },
    [kind, recordId],
  );

  useEffect(() => {
    void load(page);
  }, [load, page, refreshKey]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 3000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  // A freshly logged call is the newest: jump back to the first page.
  useEffect(() => {
    setPage(1);
  }, [refreshKey]);

  const total = pagination?.total ?? 0;
  const totalPages = Math.max(1, pagination?.total_pages ?? 1);
  const first = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const last = total === 0 ? 0 : Math.min((page - 1) * PAGE_SIZE + calls.length, total);
  // Page 1 is sorted newest-first by default, so its first row is the latest call.
  const lastCall = page === 1 ? calls[0] : undefined;

  return (
    <div className="mt-4 rounded-lg border border-line bg-surface">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3">
        <div>
          <h2 className="text-sm font-semibold text-fg">Calls</h2>
          <p className="text-xs text-ink-soft">
            {isLoading && !pagination
              ? "Loading…"
              : total === 0
                ? "No calls logged yet"
                : `${total} ${total === 1 ? "call" : "calls"}${lastCall ? ` · last call ${formatCallDateTime(lastCall.call_start_time)}` : ""}`}
          </p>
        </div>
        <LogCallFromRecord related={related} buttonLabel="Log a Call" variant="primary" onLogged={() => (page === 1 ? void load(1) : setPage(1))} />
      </div>

      <div className="px-5 py-2">
        {isLoading && calls.length === 0 ? (
          <div className="space-y-3 py-3" aria-label="Loading calls">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-14 animate-shimmer rounded-md" />
            ))}
          </div>
        ) : error ? (
          <div className="flex items-center justify-between gap-3 py-4">
            <p className="text-sm text-danger">{error}</p>
            <button
              type="button"
              onClick={() => void load(page)}
              className="rounded-md border border-line px-3 py-1.5 text-sm text-fg hover:bg-paper"
            >
              Retry
            </button>
          </div>
        ) : calls.length === 0 ? (
          <div className="py-12 text-center animate-scale-in">
            <PhoneCall size={22} className="mx-auto mb-2 text-ink-soft" />
            <p className="text-sm font-medium text-fg">No calls with {recordName} yet</p>
            <p className="mt-1 text-xs text-ink-soft">Log a call to keep the outcome, duration and notes on this record.</p>
          </div>
        ) : (
          <ul className={`divide-y divide-line transition-opacity ${isLoading ? "opacity-60" : ""}`}>
            {calls.map((call) => (
              <li key={call.id} className="-mx-2 flex items-start gap-1 rounded-md pr-2 transition hover:bg-paper">
                <Link
                  href={withReturnTo(`/dashboard/calls/${call.id}`, returnTo)}
                  className="flex min-w-0 flex-1 items-start gap-3 rounded-md px-2 py-3.5"
                >
                  <CallDirectionIcon callType={call.call_type} className="mt-0.5 h-9 w-9" size={16} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                      <span className="text-sm font-medium text-fg">{formatCallDateTime(call.call_start_time)}</span>
                      <CallOutcomeBadge outcome={call.outcome} status={call.status} />
                      <span className="text-xs text-ink-soft">
                        {call.call_type} · {call.duration_label}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-ink-soft">by {call.owner_name ?? "Unassigned"}</p>
                    {call.description && (
                      <p className="mt-1.5 line-clamp-2 whitespace-pre-wrap text-sm text-ink-soft">{call.description}</p>
                    )}
                  </div>
                  <ArrowRight size={14} className="mt-2 shrink-0 text-ink-soft" />
                </Link>
                {call.status === "Completed" && (
                  <button
                    type="button"
                    onClick={() => setRecordingFor(call)}
                    title="Add a recording to this call"
                    aria-label={`Add a recording to the call on ${formatCallDateTime(call.call_start_time)}`}
                    className="mt-3 flex shrink-0 items-center gap-1.5 rounded-md border border-line px-2.5 py-1.5 text-xs font-medium text-ink-soft transition hover:bg-surface hover:text-fg"
                  >
                    <Mic size={13} />
                    <span className="hidden sm:inline">Recording</span>
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {notice && (
        <div className="fixed bottom-6 right-6 z-[60] flex items-center gap-2 rounded-md border border-success/30 bg-success-soft px-4 py-3 text-sm font-medium text-success shadow-lg animate-toast-in">
          <CheckCircle2 size={16} className="shrink-0 animate-pop-in" />
          {notice}
        </div>
      )}

      <RecordingUploadDialog
        isOpen={recordingFor !== null}
        callId={recordingFor?.id ?? ""}
        slotsLeft={MAX_RECORDINGS_PER_CALL}
        onClose={() => setRecordingFor(null)}
        onUploaded={() => {
          setRecordingFor(null);
          setNotice("Recording uploaded successfully");
        }}
      />

      {total > PAGE_SIZE && (
        <div className="flex items-center justify-between border-t border-line px-5 py-2.5 text-sm text-ink-soft">
          <span>
            {first} to {last} of {total}
          </span>
          <div className="flex items-center gap-3">
            <span>
              Page {page} of {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || isLoading}
              className="rounded border border-line px-2 py-1 disabled:opacity-40"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || isLoading}
              className="rounded border border-line px-2 py-1 disabled:opacity-40"
            >
              ›
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
