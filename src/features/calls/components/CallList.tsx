"use client";

import { useState } from "react";
import RecordActionsMenu from "@/shared/components/RecordActionsMenu";
import SortableHeader from "@/shared/components/SortableHeader";
import type { PaginationMeta } from "@/shared/types/pagination";
import type { SortState } from "@/shared/types/sort";
import type { Call, CallRecordRow } from "@/features/calls/types/call.types";
import { CallService } from "@/features/calls/services/CallService";
import CallOutcomeBadge from "@/features/calls/components/CallOutcomeBadge";
import CallDirectionIcon from "@/features/calls/components/CallDirectionIcon";
import { formatCallDateTime, recordLabel, summarizeLatestUpdate } from "@/features/calls/utils/callFormat";
import { confirmDelete } from "@/shared/utils/confirmDelete";
import { formatDateTime, formatRelativeTime } from "@/shared/utils/formatDate";

interface CallListProps {
  /** One row per lead / contact (see `GET /calls/records/`). */
  rows: CallRecordRow[];
  pagination: PaginationMeta;
  isLoading: boolean;
  error: string | null;
  onCreateClick: () => void;
  /** Edits the record's latest call. */
  onEditClick: (call: Call) => void;
  onOpenClick?: (call: Call) => void;
  onPageChange: (page: number) => void;
  onRefresh: () => Promise<void>;
  sort: SortState | null;
  onSortChange: (sort: SortState | null) => void;
}

export default function CallList({
  rows,
  pagination,
  isLoading,
  error,
  onCreateClick,
  onEditClick,
  onOpenClick,
  onPageChange,
  onRefresh,
  sort,
  onSortChange,
}: CallListProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function open(row: CallRecordRow) {
    if (onOpenClick) onOpenClick(row.latest_call);
    else onEditClick(row.latest_call);
  }

  async function handleDelete(row: CallRecordRow) {
    const call = row.latest_call;
    const name = row.record_name || "this record";
    const others = row.call_count - 1;
    const message =
      others > 0
        ? `Delete the latest call with ${name} (${formatCallDateTime(call.call_start_time)})? The other ${others} ${others === 1 ? "call stays" : "calls stay"}. This can't be undone.`
        : `Delete the call with ${name}? This can't be undone.`;
    if (!(await confirmDelete(message))) return;

    setDeletingId(call.id);
    try {
      await CallService.deleteCall(call.id);
      await onRefresh();
    } catch {
      window.alert("Couldn't delete this call. Try again.");
    } finally {
      setDeletingId(null);
    }
  }

  const totalPages = Math.max(1, pagination.total_pages);
  const currentPage = Math.min(Math.max(1, pagination.page), totalPages);
  const firstRecord = pagination.total === 0 ? 0 : (currentPage - 1) * pagination.page_size + 1;
  const lastRecord =
    pagination.total === 0
      ? 0
      : Math.min((currentPage - 1) * pagination.page_size + rows.length, pagination.total);

  return (
    <div className="lp-card lp-list-page">
      <div className="lp-list-head flex items-center justify-between gap-3 border-b border-line bg-surface px-3 py-2.5 sm:px-4">
        <div className="min-w-0">
          <h1 className="font-serif text-lg leading-tight text-fg">Calls</h1>
          <p className="text-xs text-ink-soft">
            {pagination.total} {pagination.total === 1 ? "lead / contact" : "leads / contacts"} with calls
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onCreateClick}
            className="whitespace-nowrap rounded-md bg-amber px-3 py-1.5 text-sm font-semibold text-fg transition hover:bg-amber-dark active:scale-[0.98]"
          >
            + Log a Call
          </button>
        </div>
      </div>

      {error && <p className="border-b border-line bg-danger-soft px-4 py-3 text-sm text-danger">{error}</p>}

      {isLoading ? (
        <div className="space-y-3 p-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-10 animate-shimmer rounded-md" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center gap-3 px-4 py-16 text-center animate-scale-in">
          <p className="font-serif text-lg text-fg">No calls yet</p>
          <p className="max-w-sm text-sm text-ink-soft">Log a call with a lead or contact to keep a record of every conversation.</p>
          <button
            type="button"
            onClick={onCreateClick}
            className="mt-1 rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white transition hover:bg-ink-2 active:scale-[0.98]"
          >
            + Log a Call
          </button>
        </div>
      ) : (
        <>
          <div className="lp-table-scroll">
            <table className="w-full min-w-[1100px] border-separate border-spacing-0 text-left text-sm">
              <thead>
                <tr className="border-b border-line text-xs font-semibold uppercase tracking-wide text-ink-soft">
                  <th className="w-10 px-4 py-3" aria-label="Actions" />
                  <th className="px-4 py-3">Related To</th>
                  <SortableHeader label="Calls" field="call_count" sort={sort} onSortChange={onSortChange} />
                  <SortableHeader label="Latest Outcome" field="outcome" sort={sort} onSortChange={onSortChange} />
                  <SortableHeader label="Latest Call" field="call_start_time" sort={sort} onSortChange={onSortChange} />
                  <SortableHeader label="Duration" field="duration_seconds" sort={sort} onSortChange={onSortChange} />
                  <SortableHeader label="Latest Update" field="last_updated_at" sort={sort} onSortChange={onSortChange} />
                  <th className="px-4 py-3">Owner</th>
                  <th className="px-4 py-3">Latest Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map((row) => {
                  const call = row.latest_call;
                  const update = row.latest_update;
                  return (
                    <tr
                      key={`${row.record_type}:${row.record_id}`}
                      data-record-row={call.id}
                      onDoubleClick={() => open(row)}
                      title="Double-click to open call details and history"
                      className="group cursor-pointer hover:bg-paper hover:shadow-[inset_2px_0_0_var(--color-amber)]"
                    >
                      <td className="px-4 py-3">
                        <RecordActionsMenu
                          onEdit={() => onEditClick(call)}
                          onDelete={() => handleDelete(row)}
                          recordId={call.id}
                          disabled={deletingId === call.id}
                        />
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <CallDirectionIcon callType={call.call_type} className="h-8 w-8" size={15} />
                          <div className="min-w-0">
                            <button
                              type="button"
                              onClick={() => open(row)}
                              className="block max-w-[220px] truncate text-left font-medium text-slate hover:underline"
                            >
                              {row.record_name || "Unknown"}
                            </button>
                            <p className="truncate text-xs text-ink-soft">
                              {recordLabel(row.record_type)}
                              {call.account_name ? ` · ${call.account_name}` : ""}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="whitespace-nowrap px-4 py-3">
                        <span className="inline-flex min-w-[1.75rem] justify-center rounded-full bg-slate-light px-2 py-0.5 text-xs font-semibold text-slate">
                          {row.call_count}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <CallOutcomeBadge outcome={call.outcome} />
                        <p className="mt-1 text-xs text-ink-soft">{call.call_type}</p>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-ink-soft">{formatCallDateTime(call.call_start_time)}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-ink-soft">{call.duration_seconds > 0 ? call.duration_label : "—"}</td>

                      <td className="max-w-[260px] px-4 py-3">
                        <p
                          className="truncate text-fg"
                          title={update ? summarizeLatestUpdate(update) : undefined}
                        >
                          {update ? summarizeLatestUpdate(update) : "Call logged"}
                        </p>
                        <p className="truncate text-xs text-ink-soft" title={formatDateTime(update?.created_at ?? row.last_updated_at)}>
                          {update?.actor?.name ? `by ${update.actor.name} · ` : ""}
                          {formatRelativeTime(update?.created_at ?? row.last_updated_at)}
                        </p>
                      </td>

                      <td className="px-4 py-3 text-ink-soft">{call.owner_name ?? "Unassigned"}</td>
                      <td className="max-w-[240px] px-4 py-3 text-ink-soft">
                        <span className="block truncate" title={call.description ?? undefined}>
                          {call.description || "—"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="lp-list-foot flex items-center justify-between border-t border-line px-4 py-2 text-sm text-ink-soft">
            <span>
              {firstRecord} to {lastRecord} of {pagination.total}
            </span>
            <div className="flex items-center gap-3">
              <span>
                Page {currentPage} of {totalPages}
              </span>
              <button
                type="button"
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage <= 1 || isLoading}
                className="rounded border border-line px-2 py-1 disabled:opacity-40"
              >
                ‹
              </button>
              <button
                type="button"
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage >= totalPages || isLoading}
                className="rounded border border-line px-2 py-1 disabled:opacity-40"
              >
                ›
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
