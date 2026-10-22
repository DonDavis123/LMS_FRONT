"use client";

import { useEffect, useMemo, useState } from "react";
import RecordActionsMenu from "@/shared/components/RecordActionsMenu";
import SortableHeader from "@/shared/components/SortableHeader";
import SearchBox from "@/shared/components/SearchBox";
import FilterBar, { type FilterCondition, type FilterFieldConfig } from "@/shared/components/FilterBar";
import ServerPagination from "@/shared/components/ServerPagination";
import type { PaginationMeta } from "@/shared/types/pagination";
import type { SortState } from "@/shared/types/sort";
import type { LeadOwnerOption } from "@/features/auth/types/auth.types";
import { userService } from "@/features/users/services/userService";
import { CALL_OUTCOMES, CALL_TYPES } from "@/features/calls/types/call.types";
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
  /** Applied (already debounced) search text. */
  search: string;
  onSearchChange: (search: string) => void;
  filters: FilterCondition[];
  onFiltersChange: (filters: FilterCondition[]) => void;
  sort: SortState | null;
  onSortChange: (sort: SortState | null) => void;
  pageSize: number;
  onPageSizeChange: (pageSize: number) => void;
}

function toChoices(values: readonly string[]) {
  return values.map((value) => ({ value, label: value }));
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
  search,
  onSearchChange,
  filters,
  onFiltersChange,
  sort,
  onSortChange,
  pageSize,
  onPageSizeChange,
}: CallListProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [owners, setOwners] = useState<LeadOwnerOption[]>([]);

  useEffect(() => {
    userService.getLeadOwners().then(setOwners).catch(() => setOwners([]));
  }, []);

  // Filter fields. `field` is the backend filter key, not the column label.
  const fields = useMemo<FilterFieldConfig[]>(
    () => [
      { field: "record_name", label: "Related To", type: "text" },
      {
        field: "record_type",
        label: "Related To Type",
        type: "choice",
        choices: [
          { value: "LEAD", label: "Lead" },
          { value: "CONTACT", label: "Contact" },
        ],
      },
      { field: "account_name", label: "Account", type: "text" },
      { field: "outcome", label: "Outcome", type: "choice", choices: toChoices(CALL_OUTCOMES) },
      { field: "call_type", label: "Call Type", type: "choice", choices: toChoices(CALL_TYPES) },
      { field: "call_start_time", label: "Call Date", type: "date" },
      { field: "duration_seconds", label: "Duration (seconds)", type: "number" },
      { field: "owner", label: "Owner", type: "uuid", choices: owners.map((o) => ({ value: o.id, label: o.name })) },
      { field: "description", label: "Notes", type: "text" },
    ],
    [owners],
  );

  const hasQuery = filters.length > 0 || search.length > 0;

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

  return (
    <div className="lp-card lp-list-page">
      <div className="lp-list-head flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-line bg-surface px-3 py-2.5 sm:px-4">
        <div className="order-1 min-w-0">
          <h1 className="font-serif text-lg leading-tight text-fg">Calls</h1>
          <p className="text-xs text-ink-soft">
            {pagination.total} {hasQuery ? "matching " : ""}
            {pagination.total === 1 ? "lead / contact" : "leads / contacts"}
            {hasQuery ? "" : " with calls"}
          </p>
        </div>
        <div className="order-3 flex w-full min-w-0 flex-wrap items-center gap-2 sm:order-2 sm:w-auto sm:flex-1 sm:px-2">
          <SearchBox
            value={search}
            onSearchChange={onSearchChange}
            placeholder="Search calls"
            ariaLabel="Search calls"
          />
          <FilterBar fields={fields} filters={filters} onChange={onFiltersChange} />
        </div>
        <div className="order-2 ml-auto flex gap-2 sm:order-3">
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
          <p className="font-serif text-lg text-fg">
            {hasQuery ? "No calls match your search or filters" : "No calls yet"}
          </p>
          <p className="max-w-sm text-sm text-ink-soft">
            {hasQuery
              ? "Try a different search term, or remove a filter."
              : "Log a call with a lead or contact to keep a record of every conversation."}
          </p>
          {!hasQuery && (
            <button
              type="button"
              onClick={onCreateClick}
              className="mt-1 rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white transition hover:bg-ink-2 active:scale-[0.98]"
            >
              + Log a Call
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="lp-table-scroll">
            <table className="w-full min-w-[1100px] border-separate border-spacing-0 text-left text-sm">
              <thead>
                <tr className="border-b border-line text-xs font-semibold uppercase tracking-wide text-ink-soft">
                  <th className="w-10 px-4 py-3" aria-label="Actions" />
                  <SortableHeader label="Related To" field="record_name" sort={sort} onSortChange={onSortChange} />
                  <SortableHeader label="Calls" field="call_count" sort={sort} onSortChange={onSortChange} />
                  <SortableHeader label="Latest Outcome" field="outcome" sort={sort} onSortChange={onSortChange} />
                  <SortableHeader label="Latest Call" field="call_start_time" sort={sort} onSortChange={onSortChange} />
                  <SortableHeader label="Duration" field="duration_seconds" sort={sort} onSortChange={onSortChange} />
                  <SortableHeader label="Latest Update" field="last_updated_at" sort={sort} onSortChange={onSortChange} />
                  <SortableHeader label="Owner" field="owner" sort={sort} onSortChange={onSortChange} />
                  <SortableHeader label="Latest Notes" field="description" sort={sort} onSortChange={onSortChange} />
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

          <ServerPagination
            pagination={pagination}
            pageSize={pageSize}
            onPageChange={onPageChange}
            onPageSizeChange={onPageSizeChange}
          />
        </>
      )}
    </div>
  );
}
