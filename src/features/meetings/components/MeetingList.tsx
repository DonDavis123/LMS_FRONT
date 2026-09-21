"use client";

import { useEffect, useMemo, useState } from "react";
import RecordActionsMenu from "@/shared/components/RecordActionsMenu";
import BulkDeleteBar from "@/shared/components/BulkDeleteBar";
import SelectionIndicator from "@/shared/components/SelectionIndicator";
import type { Meeting } from "@/features/meetings/types/meeting.types";
import { MeetingService } from "@/features/meetings/services/MeetingService";

import { confirmDelete } from "@/shared/utils/confirmDelete";
import { useSelectionKeyboard } from "@/shared/hooks/useSelectionKeyboard";

interface MeetingListProps {
  meetings: Meeting[];
  isLoading: boolean;
  error: string | null;
  onCreateClick: () => void;
  onEditClick: (meeting: Meeting) => void;
  onOpenClick?: (meeting: Meeting) => void;
  onMeetingDeleted: (id: string, message: string) => void;
}

const PAGE_SIZE = 10;

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
  isLoading,
  error,
  onCreateClick,
  onEditClick,
  onOpenClick,
  onMeetingDeleted,
}: MeetingListProps) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectionMode, setSelectionMode] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return meetings.filter((meeting) =>
      `${meeting.title} ${meeting.owner_name ?? ""} ${meeting.location ?? ""}`
        .toLowerCase()
        .includes(q)
    );
  }, [meetings, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * PAGE_SIZE;
  const pageItems = filtered.slice(pageStart, pageStart + PAGE_SIZE);

  useSelectionKeyboard(selectionMode, selectedIds.size, handleBulkDelete);

  function toggleSelectAll() {
    setSelectedIds((current) => {
      const next = new Set(current);
      const allSelected = filtered.length > 0 && filtered.every((row) => next.has(row.id));
      if (allSelected) filtered.forEach((row) => next.delete(row.id));
      else filtered.forEach((row) => next.add(row.id));
      return next;
    });
  }

  async function handleBulkDelete() {
    const ids = Array.from(selectedIds);
    if (!ids.length) return;
    if (!await confirmDelete(`Delete ${ids.length} selected meetings? This can't be undone.`)) return;
    setBulkDeleting(true);
    try {
      const results = await Promise.allSettled(ids.map((id) => MeetingService.deleteMeeting(id)));
      const deleted = results.reduce((count, result) => count + (result.status === "fulfilled" ? 1 : 0), 0);
      results.forEach((result, index) => {
        if (result.status === "fulfilled") {
          onMeetingDeleted(ids[index], result.value);
        }
      });
      setSelectedIds(new Set());
      setSelectionMode(false);
      if (deleted < ids.length) window.alert(`${deleted} deleted. ${ids.length - deleted} could not be deleted.`);
    } finally {
      setBulkDeleting(false);
    }
  }

  async function handleDelete(meeting: Meeting) {
    if (!await confirmDelete(`Delete "${meeting.title}"? This can't be undone.`)) return;
    setDeletingId(meeting.id);
    try {
      const message = await MeetingService.deleteMeeting(meeting.id);
      onMeetingDeleted(meeting.id, message);
    } catch {
      window.alert("Couldn't delete this meeting. Try again.");
    } finally {
      setDeletingId(null);
    }
  }

  function relatedLabel(meeting: Meeting): string {
    if (meeting.lead_id) return meeting.lead_name ? `Lead: ${meeting.lead_name}` : "Lead";
    if (meeting.contact_id)
      return meeting.contact_name ? `Contact: ${meeting.contact_name}` : "Contact";
    if (meeting.account_id)
      return meeting.account_name ? `Account: ${meeting.account_name}` : "Account";
    return "—";
  }

  return (
    <div className="rounded-lg border border-line bg-surface">
      <div className="flex flex-col gap-3 border-b border-line p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-serif text-xl text-fg">Meetings</h1>
          <p className="text-sm text-ink-soft">
            {filtered.length} total {filtered.length === 1 ? "meeting" : "meetings"}
          </p>
        </div>
        <div className="flex gap-2">
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
            placeholder="Search meetings…"
            className="w-full rounded-md border border-line px-3 py-2 text-sm outline-none focus:border-slate focus:ring-2 focus:ring-slate-light sm:w-56"
          />
          <button
            onClick={onCreateClick}
            className="whitespace-nowrap rounded-md bg-amber px-4 py-2 text-sm font-semibold text-fg transition hover:bg-amber-dark active:scale-[0.98]"
          >
            + Create Meeting
          </button>
        </div>
      </div>

      {error && (
        <p className="border-b border-line bg-danger-soft px-4 py-3 text-sm text-danger">{error}</p>
      )}

      <BulkDeleteBar count={selectedIds.size} onDelete={handleBulkDelete} onClear={() => { setSelectedIds(new Set()); setSelectionMode(false); }} deleting={bulkDeleting} />

      {isLoading ? (
        <div className="space-y-3 p-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-10 animate-shimmer rounded-md" />
          ))}
        </div>
      ) : pageItems.length === 0 ? (
        <div className="flex flex-col items-center gap-3 px-4 py-16 text-center animate-scale-in">
          <p className="font-serif text-lg text-fg">
            {query ? "No meetings match that search" : "No meetings yet"}
          </p>
          <p className="max-w-sm text-sm text-ink-soft">
            {query
              ? "Try a different title, owner, or location."
              : "Schedule a meeting with a lead, contact, or account."}
          </p>
          {!query && (
            <button
              onClick={onCreateClick}
              className="mt-1 rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white transition hover:bg-ink-2 active:scale-[0.98]"
            >
              + Create Meeting
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead>
                <tr className="border-b border-line text-xs font-semibold uppercase tracking-wide text-ink-soft">
                  <th className="w-10 px-4 py-3" aria-label="Selection and actions">
                    {selectionMode && (
                      <input
                        type="checkbox"
                        aria-label="Select all"
                        checked={filtered.length > 0 && filtered.every((row) => selectedIds.has(row.id))}
                        onChange={toggleSelectAll}
                        className="h-4 w-4 rounded border-line accent-slate"
                      />
                    )}
                  </th>
                  <th className="px-4 py-3">Title</th>
                  <th className="px-4 py-3">From</th>
                  <th className="px-4 py-3">To</th>
                  <th className="px-4 py-3">Location</th>
                  <th className="px-4 py-3">Related To</th>
                  <th className="px-4 py-3">Owner</th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((meeting) => (
                  <tr
                    key={meeting.id}
                    data-record-row={meeting.id}
                    onClick={(event) => {
                      if (!selectionMode) return;
                      const target = event.target as HTMLElement;
                      if (target.closest('button[aria-label="Record actions"]')) return;
                      event.preventDefault();
                      setSelectedIds((current) => {
                        const next = new Set(current);
                        if (next.has(meeting.id)) next.delete(meeting.id); else next.add(meeting.id);
                        return next;
                      });
                    }}
                    onDoubleClick={() => { if (!selectionMode) (onOpenClick ? onOpenClick(meeting) : onEditClick(meeting)); }}
                    title="Double-click to open meeting details"
                    className="group cursor-pointer border-b border-line last:border-0 hover:bg-paper hover:shadow-[inset_2px_0_0_var(--color-amber)]"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {selectionMode && <SelectionIndicator selected={selectedIds.has(meeting.id)} />}
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
                        onClick={(event) => {
                          if (selectionMode) {
                            event.preventDefault();
                            event.stopPropagation();
                            setSelectedIds((current) => { const next = new Set(current); if (next.has(meeting.id)) next.delete(meeting.id); else next.add(meeting.id); return next; });
                          } else onOpenClick ? onOpenClick(meeting) : onEditClick(meeting);
                        }}
                        className="text-left font-medium text-slate hover:underline"
                      >
                        {meeting.title}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-ink-soft">
                      {meeting.all_day ? "All day" : formatDateTime(meeting.from_datetime)}
                    </td>
                    <td className="px-4 py-3 text-ink-soft">
                      {meeting.all_day ? "—" : formatDateTime(meeting.to_datetime)}
                    </td>
                    <td className="px-4 py-3 text-ink-soft">{meeting.location ?? "—"}</td>
                    <td className="px-4 py-3 text-ink-soft">{relatedLabel(meeting)}</td>
                    <td className="px-4 py-3 text-ink-soft">{meeting.owner_name ?? "Unassigned"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between border-t border-line px-4 py-3 text-sm text-ink-soft">
            <span>Total Records {filtered.length}</span>
            <div className="flex items-center gap-3">
              <span>
                {pageStart + 1} to {Math.min(pageStart + PAGE_SIZE, filtered.length)}
              </span>
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="rounded border border-line px-2 py-1 disabled:opacity-40"
              >
                ‹
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
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
