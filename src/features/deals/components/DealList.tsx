"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertCircle } from "lucide-react";

import RecordActionsMenu from "@/shared/components/RecordActionsMenu";
import BulkDeleteBar from "@/shared/components/BulkDeleteBar";
import SelectionIndicator from "@/shared/components/SelectionIndicator";
import SortableHeader from "@/shared/components/SortableHeader";
import FilterBar, { type FilterCondition, type FilterFieldConfig } from "@/shared/components/FilterBar";
import ServerPagination from "@/shared/components/ServerPagination";
import { confirmDelete } from "@/shared/utils/confirmDelete";
import { extractApiError } from "@/shared/utils/apiError";
import { useSelectionKeyboard } from "@/shared/hooks/useSelectionKeyboard";
import type { PaginationMeta } from "@/shared/types/pagination";
import type { SortState } from "@/shared/types/sort";
import { userService } from "@/features/users/services/userService";
import type { LeadOwnerOption } from "@/features/auth/types/auth.types";
import { DealService } from "@/features/deals/services/DealService";
import type { Deal } from "@/features/deals/types/deal.types";
import { DEAL_STAGES } from "@/features/deals/utils/dealStages";
import { formatCloseDate, isOverdue } from "@/features/deals/utils/dealDates";
import { formatCurrency } from "@/features/deals/utils/formatCurrency";
import DealStageBadge from "@/features/deals/components/DealStageBadge";

interface DealListProps {
  deals: Deal[];
  isLoading: boolean;
  error: string | null;
  onCreateClick: () => void;
  onEditClick: (deal: Deal) => void;
  onOpenClick: (deal: Deal) => void;
  filters: FilterCondition[];
  onFiltersChange: (filters: FilterCondition[]) => void;
  sort: SortState | null;
  onSortChange: (sort: SortState | null) => void;
  pageSize: number;
  pagination: PaginationMeta;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  onDealDeleted: (id: string, message: string) => void;
  onError: (message: string) => void;
}

function relatedLabel(deal: Deal): string {
  if (deal.account_name && deal.contact_name) return `${deal.account_name} · ${deal.contact_name}`;
  return deal.account_name ?? deal.contact_name ?? "—";
}

export default function DealList({
  deals,
  isLoading,
  error,
  onCreateClick,
  onEditClick,
  onOpenClick,
  filters,
  onFiltersChange,
  sort,
  onSortChange,
  pageSize,
  pagination,
  onPageChange,
  onPageSizeChange,
  onDealDeleted,
  onError,
}: DealListProps) {
  const [owners, setOwners] = useState<LeadOwnerOption[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectionMode, setSelectionMode] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    userService.getLeadOwners().then(setOwners).catch(() => setOwners([]));
  }, []);

  const fields = useMemo<FilterFieldConfig[]>(
    () => [
      { field: "name", label: "Deal Name", type: "text" },
      { field: "stage", label: "Stage", type: "choice", choices: DEAL_STAGES.map((stage) => ({ value: stage, label: stage })) },
      { field: "amount", label: "Amount (₹)", type: "number" },
      { field: "expected_close_date", label: "Expected Close", type: "date" },
      { field: "owner", label: "Owner", type: "uuid", choices: owners.map((o) => ({ value: o.id, label: o.name })) },
    ],
    [owners],
  );

  useSelectionKeyboard(selectionMode, selectedIds.size, handleBulkDelete);

  function toggleSelected(id: string) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    setSelectedIds((current) => {
      const next = new Set(current);
      const allSelected = deals.length > 0 && deals.every((row) => next.has(row.id));
      if (allSelected) deals.forEach((row) => next.delete(row.id));
      else deals.forEach((row) => next.add(row.id));
      return next;
    });
  }

  async function handleBulkDelete() {
    const ids = Array.from(selectedIds);
    if (!ids.length) return;
    if (!(await confirmDelete(`Delete ${ids.length} selected ${ids.length === 1 ? "deal" : "deals"}? This can't be undone.`))) return;
    setBulkDeleting(true);
    try {
      const results = await Promise.allSettled(ids.map((id) => DealService.deleteDeal(id)));
      let deleted = 0;
      results.forEach((result, index) => {
        if (result.status === "fulfilled") {
          deleted += 1;
          onDealDeleted(ids[index], result.value);
        }
      });
      setSelectedIds(new Set());
      setSelectionMode(false);
      if (deleted < ids.length) onError(`${deleted} deleted. ${ids.length - deleted} could not be deleted.`);
    } finally {
      setBulkDeleting(false);
    }
  }

  async function handleDelete(deal: Deal) {
    if (!(await confirmDelete(`Delete "${deal.name}"? This can't be undone.`))) return;
    setDeletingId(deal.id);
    try {
      const message = await DealService.deleteDeal(deal.id);
      onDealDeleted(deal.id, message);
    } catch (err) {
      onError(extractApiError(err, "Couldn't delete this deal. Try again."));
    } finally {
      setDeletingId(null);
    }
  }

  const hasFilters = filters.length > 0;

  return (
    <div className="lp-card lp-list-page">
      <div className="lp-list-head flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-line bg-surface px-3 py-2.5 sm:px-4">
        <p className="order-1 min-w-0 text-xs text-ink-soft">
          {pagination.total} total {pagination.total === 1 ? "deal" : "deals"}
        </p>
        <div className="order-2 w-full min-w-0 sm:flex-1 sm:px-2">
          <FilterBar fields={fields} filters={filters} onChange={onFiltersChange} />
        </div>
      </div>

      {error && <p role="alert" className="border-b border-line bg-danger-soft px-4 py-3 text-sm text-danger">{error}</p>}

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
        <div className="space-y-3 p-4" aria-busy="true" aria-label="Loading deals">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-10 animate-shimmer rounded-md" />
          ))}
        </div>
      ) : deals.length === 0 ? (
        <div className="flex flex-col items-center gap-3 px-4 py-16 text-center animate-scale-in">
          <p className="font-serif text-lg text-fg">{hasFilters ? "No deals match your filters" : "No deals yet"}</p>
          <p className="max-w-sm text-sm text-ink-soft">
            {hasFilters
              ? "Try a different filter, or remove one."
              : "Create a deal to start tracking your pipeline from first quote to close."}
          </p>
          {!hasFilters && (
            <button
              type="button"
              onClick={onCreateClick}
              className="mt-1 rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white transition hover:bg-ink-2 active:scale-[0.98]"
            >
              + Create Deal
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="lp-table-scroll">
            <table className="w-full min-w-[920px] border-separate border-spacing-0 text-left text-sm">
              <thead>
                <tr className="border-b border-line text-xs font-semibold uppercase tracking-wide text-ink-soft">
                  <th className="w-10 px-4 py-3" aria-label="Selection and actions">
                    {selectionMode && (
                      <input
                        type="checkbox"
                        aria-label="Select all"
                        checked={deals.length > 0 && deals.every((row) => selectedIds.has(row.id))}
                        onChange={toggleSelectAll}
                        className="h-4 w-4 rounded border-line accent-slate"
                      />
                    )}
                  </th>
                  <SortableHeader label="Deal Name" field="name" sort={sort} onSortChange={onSortChange} />
                  <SortableHeader label="Amount" field="amount" sort={sort} onSortChange={onSortChange} />
                  <SortableHeader label="Stage" field="stage" sort={sort} onSortChange={onSortChange} />
                  <SortableHeader label="Probability" field="probability" sort={sort} onSortChange={onSortChange} />
                  <SortableHeader label="Expected Close" field="expected_close_date" sort={sort} onSortChange={onSortChange} />
                  <th className="px-4 py-3">Account / Contact</th>
                  <SortableHeader label="Owner" field="owner" sort={sort} onSortChange={onSortChange} />
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {deals.map((deal) => {
                  const overdue = isOverdue(deal.expected_close_date, deal.stage);
                  return (
                    <tr
                      key={deal.id}
                      data-record-row={deal.id}
                      onClick={(event) => {
                        if (!selectionMode) return;
                        const target = event.target as HTMLElement;
                        if (target.closest('button[aria-label="Record actions"]')) return;
                        event.preventDefault();
                        toggleSelected(deal.id);
                      }}
                      onDoubleClick={() => {
                        if (!selectionMode) onOpenClick(deal);
                      }}
                      title="Double-click to open deal details"
                      className="group cursor-pointer hover:bg-paper hover:shadow-[inset_2px_0_0_var(--color-amber)]"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {selectionMode && <SelectionIndicator selected={selectedIds.has(deal.id)} />}
                          <RecordActionsMenu
                            onEdit={() => onEditClick(deal)}
                            onDelete={() => handleDelete(deal)}
                            onSelect={() => setSelectionMode(true)}
                            recordId={deal.id}
                            disabled={deletingId === deal.id}
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
                              toggleSelected(deal.id);
                            } else onOpenClick(deal);
                          }}
                          className="text-left font-medium text-slate hover:underline"
                        >
                          {deal.name}
                        </button>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 font-medium text-fg">{formatCurrency(deal.amount)}</td>
                      <td className="px-4 py-3">
                        <DealStageBadge stage={deal.stage} />
                      </td>
                      <td className="px-4 py-3 text-ink-soft">{deal.probability}%</td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 ${overdue ? "font-medium text-danger" : "text-ink-soft"}`}>
                          {formatCloseDate(deal.expected_close_date)}
                          {overdue && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-danger-soft px-1.5 py-0.5 text-[11px] font-semibold">
                              <AlertCircle size={11} aria-hidden="true" />
                              Overdue
                            </span>
                          )}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-ink-soft">{relatedLabel(deal)}</td>
                      <td className="px-4 py-3 text-ink-soft">{deal.owner_name ?? "Unassigned"}</td>
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
