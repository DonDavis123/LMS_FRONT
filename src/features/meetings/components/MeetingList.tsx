"use client";

import { useEffect, useState } from "react";
import RecordActionsMenu from "@/shared/components/RecordActionsMenu";
import BulkDeleteBar from "@/shared/components/BulkDeleteBar";
import SelectionIndicator from "@/shared/components/SelectionIndicator";
import type { PaginationMeta } from "@/shared/types/pagination";
import type { MeetingListItem } from "@/features/meetings/types/meeting.types";
import { MeetingService } from "@/features/meetings/services/MeetingService";
import { confirmDelete } from "@/shared/utils/confirmDelete";
import { useSelectionKeyboard } from "@/shared/hooks/useSelectionKeyboard";

interface MeetingListProps {
  meetings: MeetingListItem[];
  pagination: PaginationMeta;
  isLoading: boolean;
  error: string | null;
  onCreateClick: () => void;
  onEditClick: (meeting: MeetingListItem) => void;
  onOpenClick?: (meeting: MeetingListItem) => void;
  onPageChange: (page: number) => void;
  onRefresh: () => Promise<void>;
}

function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function MeetingList({
  meetings,
  pagination,
  isLoading,
  error,
  onCreateClick,
  onEditClick,
  onOpenClick,
  onPageChange,
  onRefresh,
}: MeetingListProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectionMode, setSelectionMode] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    setSelectedIds((current) => {
      const visibleIds = new Set(meetings.map((meeting) => meeting.id));
      const next = new Set(Array.from(current).filter((id) => visibleIds.has(id)));
      return next.size === current.size ? current : next;
    });
  }, [meetings]);

  useSelectionKeyboard(selectionMode, selectedIds.size, handleBulkDelete);

  function toggleSelectAll() {
    setSelectedIds((current) => {
      const next = new Set(current);
      const allSelected =
        meetings.length > 0 && meetings.every((row) => next.has(row.id));

      if (allSelected) {
        meetings.forEach((row) => next.delete(row.id));
      } else {
        meetings.forEach((row) => next.add(row.id));
      }

      return next;
    });
  }

  async function handleBulkDelete() {
    const ids = Array.from(selectedIds);
    if (!ids.length) return;

    if (
      !(await confirmDelete(
        `Delete ${ids.length} selected meetings? This can't be undone.`,
      ))
    ) {
      return;
    }

    setBulkDeleting(true);

    try {
      const results = await Promise.allSettled(
        ids.map((id) => MeetingService.deleteMeeting(id)),
      );

      const deleted = results.reduce(
        (count, result) => count + (result.status === "fulfilled" ? 1 : 0),
        0,
      );

      setSelectedIds(new Set());
      setSelectionMode(false);

      if (deleted < ids.length) {
        window.alert(
          `${deleted} deleted. ${ids.length - deleted} could not be deleted.`,
        );
      }

      await onRefresh();
    } finally {
      setBulkDeleting(false);
    }
  }

  async function handleDelete(meeting: MeetingListItem) {
    if (
      !(await confirmDelete(
        `Delete "${meeting.title}"? This can't be undone.`,
      ))
    ) {
      return;
    }

    setDeletingId(meeting.id);

    try {
      await MeetingService.deleteMeeting(meeting.id);
      setSelectedIds((current) => {
        const next = new Set(current);
        next.delete(meeting.id);
        return next;
      });
      await onRefresh();
    } catch {
      window.alert("Couldn't delete this meeting. Try again.");
    } finally {
      setDeletingId(null);
    }
  }

  function relatedLabel(meeting: MeetingListItem): string {
    if (!meeting.related_to_type || meeting.related_to_names.length === 0) {
      return "—";
    }

    const label = meeting.related_to_type === "LEAD" ? "Lead" : "Contact";
    return `${label}: ${meeting.related_to_names.join(", ")}`;
  }

  const totalPages = Math.max(1, pagination.total_pages);
  const currentPage = Math.min(Math.max(1, pagination.page), totalPages);
  const firstRecord =
    pagination.total === 0 ? 0 : (currentPage - 1) * pagination.page_size + 1;
  const lastRecord =
    pagination.total === 0
      ? 0
      : Math.min(
          (currentPage - 1) * pagination.page_size + meetings.length,
          pagination.total,
        );

  return (
    <div className="rounded-lg border border-line bg-surface">
      <div className="flex flex-col gap-3 border-b border-line p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-serif text-xl text-fg">Meetings</h1>
          <p className="text-sm text-ink-soft">
            {pagination.total}{" "}
            {pagination.total === 1 ? "meeting" : "meetings"}
          </p>
        </div>

        <button
          type="button"
          onClick={onCreateClick}
          className="whitespace-nowrap rounded-md bg-amber px-4 py-2 text-sm font-semibold text-fg transition hover:bg-amber-dark active:scale-[0.98]"
        >
          + Create Meeting
        </button>
      </div>

      {error && (
        <p className="border-b border-line bg-danger-soft px-4 py-3 text-sm text-danger">
          {error}
        </p>
      )}

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
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="h-10 animate-shimmer rounded-md"
            />
          ))}
        </div>
      ) : meetings.length === 0 ? (
        <div className="flex flex-col items-center gap-3 px-4 py-16 text-center animate-scale-in">
          <p className="font-serif text-lg text-fg">No meetings yet</p>
          <p className="max-w-sm text-sm text-ink-soft">
            Schedule a meeting with a lead, contact, or user.
          </p>
          <button
            type="button"
            onClick={onCreateClick}
            className="mt-1 rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white transition hover:bg-ink-2 active:scale-[0.98]"
          >
            + Create Meeting
          </button>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead>
                <tr className="border-b border-line text-xs font-semibold uppercase tracking-wide text-ink-soft">
                  <th className="w-10 px-4 py-3" aria-label="Selection and actions">
                    {selectionMode && (
                      <input
                        type="checkbox"
                        aria-label="Select all"
                        checked={
                          meetings.length > 0 &&
                          meetings.every((row) => selectedIds.has(row.id))
                        }
                        onChange={toggleSelectAll}
                        className="h-4 w-4 rounded border-line accent-slate"
                      />
                    )}
                  </th>
                  <th className="px-4 py-3">Title</th>
                  <th className="px-4 py-3">From</th>
                  <th className="px-4 py-3">To</th>
                  <th className="px-4 py-3">Related To</th>
                  <th className="px-4 py-3">Owner</th>
                </tr>
              </thead>

              <tbody>
                {meetings.map((meeting) => (
                  <tr
                    key={meeting.id}
                    data-record-row={meeting.id}
                    onClick={(event) => {
                      if (!selectionMode) return;

                      const target = event.target as HTMLElement;
                      if (
                        target.closest('button[aria-label="Record actions"]')
                      ) {
                        return;
                      }

                      event.preventDefault();
                      setSelectedIds((current) => {
                        const next = new Set(current);
                        if (next.has(meeting.id)) {
                          next.delete(meeting.id);
                        } else {
                          next.add(meeting.id);
                        }
                        return next;
                      });
                    }}
                    onDoubleClick={() => {
                      if (!selectionMode) {
                        onOpenClick
                          ? onOpenClick(meeting)
                          : onEditClick(meeting);
                      }
                    }}
                    title="Double-click to open meeting details"
                    className="group cursor-pointer border-b border-line last:border-0 hover:bg-paper hover:shadow-[inset_2px_0_0_var(--color-amber)]"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {selectionMode && (
                          <SelectionIndicator
                            selected={selectedIds.has(meeting.id)}
                          />
                        )}
                        <RecordActionsMenu
                          onEdit={() => onEditClick(meeting)}
                          onDelete={() => handleDelete(meeting)}
                          onSelect={() => setSelectionMode(true)}
                          recordId={meeting.id}
                          disabled={deletingId === meeting.id}
                        />
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={(event) => {
                          if (selectionMode) {
                            event.preventDefault();
                            event.stopPropagation();
                            setSelectedIds((current) => {
                              const next = new Set(current);
                              if (next.has(meeting.id)) {
                                next.delete(meeting.id);
                              } else {
                                next.add(meeting.id);
                              }
                              return next;
                            });
                          } else {
                            onOpenClick
                              ? onOpenClick(meeting)
                              : onEditClick(meeting);
                          }
                        }}
                        className="text-left font-medium text-slate hover:underline"
                      >
                        {meeting.title}
                      </button>
                    </td>

                    <td className="px-4 py-3 text-ink-soft">
                      {formatDateTime(meeting.start_at)}
                    </td>

                    <td className="px-4 py-3 text-ink-soft">
                      {formatDateTime(meeting.end_at)}
                    </td>

                    <td className="px-4 py-3 text-ink-soft">
                      {relatedLabel(meeting)}
                    </td>

                    <td className="px-4 py-3 text-ink-soft">
                      {meeting.host_name || "Unassigned"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between border-t border-line px-4 py-3 text-sm text-ink-soft">
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
