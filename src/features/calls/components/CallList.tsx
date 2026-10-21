"use client";

import { useEffect, useState } from "react";
import RecordActionsMenu from "@/shared/components/RecordActionsMenu";
import BulkDeleteBar from "@/shared/components/BulkDeleteBar";
import SelectionIndicator from "@/shared/components/SelectionIndicator";
import SortableHeader from "@/shared/components/SortableHeader";
import type { PaginationMeta } from "@/shared/types/pagination";
import type { SortState } from "@/shared/types/sort";
import type { Call } from "@/features/calls/types/call.types";
import { CallService } from "@/features/calls/services/CallService";
import CallOutcomeBadge from "@/features/calls/components/CallOutcomeBadge";
import CallDirectionIcon from "@/features/calls/components/CallDirectionIcon";
import { callRecord, formatCallDateTime, recordLabel } from "@/features/calls/utils/callFormat";

import { confirmDelete } from "@/shared/utils/confirmDelete";
import { useSelectionKeyboard } from "@/shared/hooks/useSelectionKeyboard";

interface CallListProps {
  calls: Call[];
  pagination: PaginationMeta;
  isLoading: boolean;
  error: string | null;
  onCreateClick: () => void;
  onEditClick: (call: Call) => void;
  onOpenClick?: (call: Call) => void;
  onPageChange: (page: number) => void;
  onRefresh: () => Promise<void>;
  sort: SortState | null;
  onSortChange: (sort: SortState | null) => void;
}

export default function CallList({
  calls,
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
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectionMode, setSelectionMode] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Drop selections for rows that are no longer on the current page.
  useEffect(() => {
    setSelectedIds((current) => {
      const visibleIds = new Set(calls.map((call) => call.id));
      const next = new Set(Array.from(current).filter((id) => visibleIds.has(id)));
      return next.size === current.size ? current : next;
    });
  }, [calls]);

  useSelectionKeyboard(selectionMode, selectedIds.size, handleBulkDelete);

  function toggleSelectAll() {
    setSelectedIds((current) => {
      const next = new Set(current);
      const allSelected = calls.length > 0 && calls.every((row) => next.has(row.id));
      if (allSelected) calls.forEach((row) => next.delete(row.id));
      else calls.forEach((row) => next.add(row.id));
      return next;
    });
  }

  function toggleOne(id: string) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleBulkDelete() {
    const ids = Array.from(selectedIds);
    if (!ids.length) return;
    if (!(await confirmDelete(`Delete ${ids.length} selected calls? This can't be undone.`))) return;
    setBulkDeleting(true);
    try {
      const results = await Promise.allSettled(ids.map((id) => CallService.deleteCall(id)));
      const deleted = results.reduce((count, result) => count + (result.status === "fulfilled" ? 1 : 0), 0);
      setSelectedIds(new Set());
      setSelectionMode(false);
      if (deleted < ids.length) window.alert(`${deleted} deleted. ${ids.length - deleted} could not be deleted.`);
      await onRefresh();
    } finally {
      setBulkDeleting(false);
    }
  }

  async function handleDelete(call: Call) {
    const record = callRecord(call);
    const label = record ? `the call with ${record.name}` : "this call";
    if (!(await confirmDelete(`Delete ${label}? This can't be undone.`))) return;
    setDeletingId(call.id);
    try {
      await CallService.deleteCall(call.id);
      setSelectedIds((current) => {
        const next = new Set(current);
        next.delete(call.id);
        return next;
      });
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
      : Math.min((currentPage - 1) * pagination.page_size + calls.length, pagination.total);

  return (
    <div className="lp-card lp-list-page">
      <div className="lp-list-head flex items-center justify-between gap-3 border-b border-line bg-surface px-3 py-2.5 sm:px-4">
        <div className="min-w-0">
          <h1 className="font-serif text-lg leading-tight text-fg">Calls</h1>
          <p className="text-xs text-ink-soft">
            {pagination.total} {pagination.total === 1 ? "call" : "calls"}
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

      <BulkDeleteBar
        count={selectedIds.size}
        onDelete={handleBulkDelete}
        onClear={() => {
          setSelectedIds(new Set());
          setSelectionMode(false);
        }}
        deleting={bulkDeleting}
      />

      {isLoading ? (
        <div className="space-y-3 p-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-10 animate-shimmer rounded-md" />
          ))}
        </div>
      ) : calls.length === 0 ? (
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
            <table className="w-full min-w-[900px] border-separate border-spacing-0 text-left text-sm">
              <thead>
                <tr className="border-b border-line text-xs font-semibold uppercase tracking-wide text-ink-soft">
                  <th className="w-10 px-4 py-3" aria-label="Selection and actions">
                    {selectionMode && (
                      <input
                        type="checkbox"
                        aria-label="Select all"
                        checked={calls.length > 0 && calls.every((row) => selectedIds.has(row.id))}
                        onChange={toggleSelectAll}
                        className="h-4 w-4 rounded border-line accent-slate"
                      />
                    )}
                  </th>
                  <th className="px-4 py-3">Related To</th>
                  <SortableHeader label="Type" field="call_type" sort={sort} onSortChange={onSortChange} />
                  <SortableHeader label="Outcome" field="outcome" sort={sort} onSortChange={onSortChange} />
                  <SortableHeader label="Start Time" field="call_start_time" sort={sort} onSortChange={onSortChange} />
                  <SortableHeader label="Duration" field="duration_seconds" sort={sort} onSortChange={onSortChange} />
                  <th className="px-4 py-3">Owner</th>
                  <th className="px-4 py-3">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {calls.map((call) => {
                  const record = callRecord(call);
                  return (
                    <tr
                      key={call.id}
                      data-record-row={call.id}
                      onClick={(event) => {
                        if (!selectionMode) return;
                        const target = event.target as HTMLElement;
                        if (target.closest('button[aria-label="Record actions"]')) return;
                        event.preventDefault();
                        toggleOne(call.id);
                      }}
                      onDoubleClick={() => {
                        if (!selectionMode) {
                          if (onOpenClick) onOpenClick(call);
                          else onEditClick(call);
                        }
                      }}
                      title="Double-click to open call details"
                      className="group cursor-pointer hover:bg-paper hover:shadow-[inset_2px_0_0_var(--color-amber)]"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {selectionMode && <SelectionIndicator selected={selectedIds.has(call.id)} />}
                          <RecordActionsMenu
                            onEdit={() => onEditClick(call)}
                            onDelete={() => handleDelete(call)}
                            onSelect={() => setSelectionMode(true)}
                            recordId={call.id}
                            disabled={deletingId === call.id}
                          />
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <CallDirectionIcon callType={call.call_type} className="h-8 w-8" size={15} />
                          <div className="min-w-0">
                            <button
                              type="button"
                              onClick={(event) => {
                                if (selectionMode) {
                                  event.preventDefault();
                                  event.stopPropagation();
                                  toggleOne(call.id);
                                } else if (onOpenClick) onOpenClick(call);
                                else onEditClick(call);
                              }}
                              className="block max-w-[220px] truncate text-left font-medium text-slate hover:underline"
                            >
                              {record?.name ?? "Unknown"}
                            </button>
                            <p className="truncate text-xs text-ink-soft">
                              {record ? recordLabel(record.type) : ""}
                              {call.account_name ? ` · ${call.account_name}` : ""}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3 text-ink-soft">{call.call_type}</td>
                      <td className="px-4 py-3">
                        <CallOutcomeBadge outcome={call.outcome} />
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-ink-soft">{formatCallDateTime(call.call_start_time)}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-ink-soft">{call.duration_label}</td>
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
