"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  LEAD_SOURCES,
  LEAD_STATUSES,
  LEAD_RATINGS,
  LEAD_INDUSTRIES,
  type Lead,
  type LeadStatus,
} from "@/features/leads/types/lead.types";
import { LeadService } from "@/features/leads/services/LeadService";
import { userService } from "@/features/users/services/userService";
import RecordActionsMenu from "@/shared/components/RecordActionsMenu";
import BulkDeleteBar from "@/shared/components/BulkDeleteBar";
import SelectionIndicator from "@/shared/components/SelectionIndicator";
import FilterBar, { type FilterCondition, type FilterFieldConfig } from "@/shared/components/FilterBar";
import { applyFilters } from "@/shared/utils/applyFilters";
import type { LeadOwnerOption } from "@/features/auth/types/auth.types";

import { confirmDelete } from "@/shared/utils/confirmDelete";
import { useSelectionKeyboard } from "@/shared/hooks/useSelectionKeyboard";

interface LeadListProps {
  leads: Lead[];
  isLoading: boolean;
  error: string | null;
  highlightId?: string | null;
  onLeadDeleted: (id: string, message: string) => void;
  onLeadUpdated: (lead: Lead) => void;
}

const PAGE_SIZE = 10;
const ROW_REMOVE_MS = 200;

function toChoices(values: readonly string[]) {
  return values.map((v) => ({ value: v, label: v }));
}

export default function LeadList({
  leads,
  isLoading,
  error,
  highlightId,
  onLeadDeleted,
  onLeadUpdated,
}: LeadListProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<FilterCondition[]>([]);
  const [owners, setOwners] = useState<LeadOwnerOption[]>([]);
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectionMode, setSelectionMode] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);

  useEffect(() => {
    userService.getLeadOwners().then(setOwners).catch(() => setOwners([]));
  }, []);

  const fields = useMemo<FilterFieldConfig[]>(
    () => [
      { field: "company_name", label: "Company", type: "text" },
      { field: "email", label: "Email", type: "text" },
      { field: "city", label: "City", type: "text" },
      { field: "lead_source", label: "Lead Source", type: "choice", choices: toChoices(LEAD_SOURCES) },
      { field: "lead_status", label: "Lead Status", type: "choice", choices: toChoices(LEAD_STATUSES) },
      { field: "rating", label: "Rating", type: "choice", choices: toChoices(LEAD_RATINGS) },
      { field: "industry", label: "Industry", type: "choice", choices: toChoices(LEAD_INDUSTRIES) },
      { field: "owner", label: "Lead Owner", type: "uuid", choices: owners.map((o) => ({ value: o.id, label: o.name })) },
      { field: "annual_revenue", label: "Annual Revenue", type: "number" },
      { field: "created_at", label: "Created", type: "datetime" },
    ],
    [owners]
  );

  function getFieldValue(lead: Lead, field: string): unknown {
    switch (field) {
      case "owner":
        return lead.owner?.id;
      default:
        return (lead as unknown as Record<string, unknown>)[field];
    }
  }

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    const searched = leads.filter((lead) => {
      const haystack = `${lead.name} ${lead.company_name} ${lead.email ?? ""}`.toLowerCase();
      return haystack.includes(q);
    });
    return applyFilters(searched, filters, getFieldValue);
  }, [leads, query, filters]);

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
    if (!await confirmDelete(`Delete ${ids.length} selected leads? This can't be undone.`)) return;
    setBulkDeleting(true);
    try {
      const results = await Promise.allSettled(ids.map((id) => LeadService.deleteLead(id)));
      const deleted = results.reduce((count, result) => count + (result.status === "fulfilled" ? 1 : 0), 0);
      results.forEach((result, index) => {
        if (result.status === "fulfilled") {
          onLeadDeleted(ids[index], result.value);
        }
      });
      setSelectedIds(new Set());
      setSelectionMode(false);
      if (deleted < ids.length) window.alert(`${deleted} deleted. ${ids.length - deleted} could not be deleted.`);
    } finally {
      setBulkDeleting(false);
    }
  }

  async function handleDelete(lead: Lead) {
    if (!await confirmDelete(`Delete ${lead.name || lead.email}? This can't be undone.`)) return;
    setDeletingId(lead.id);
    try {
      const message = await LeadService.deleteLead(lead.id);
      // Play the fade/collapse animation before the row actually leaves —
      // removing it from `leads` immediately would just make it vanish.
      setRemovingId(lead.id);
      window.setTimeout(() => {
        onLeadDeleted(lead.id, message);
        setRemovingId(null);
      }, ROW_REMOVE_MS);
    } catch {
      window.alert("Couldn't delete this lead. Try again.");
    } finally {
      setDeletingId(null);
    }
  }


  async function handleStatusChange(lead: Lead, status: LeadStatus) {
    if (status === lead.lead_status || updatingStatusId) return;
    setUpdatingStatusId(lead.id);
    try {
      await LeadService.updateLead(lead.id, { lead_status: status });
      const updated = await LeadService.getLead(lead.id);
      onLeadUpdated(updated);
    } catch (error) {
      console.error("Failed to update lead status:", error);
      window.alert("Couldn't update the lead status. Try again.");
    } finally {
      setUpdatingStatusId(null);
    }
  }

  return (
    <div className="rounded-lg border border-line bg-surface">
      <div className="flex flex-col gap-3 border-b border-line p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-serif text-xl text-fg">Leads</h1>
            <p className="text-sm text-ink-soft">
              {filtered.length} total {filtered.length === 1 ? "lead" : "leads"}
            </p>
          </div>
          <div className="flex gap-2">
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
              placeholder="Search leads…"
              className="w-full rounded-md border border-line px-3 py-2 text-sm outline-none focus:border-slate focus:ring-2 focus:ring-slate-light sm:w-56"
            />
            <Link
              href="/dashboard/leads/new"
              className="whitespace-nowrap rounded-md bg-amber px-4 py-2 text-sm font-semibold text-fg transition hover:bg-amber-dark active:scale-[0.98]"
            >
              + Create Lead
            </Link>
          </div>
        </div>

        <FilterBar
          fields={fields}
          filters={filters}
          onChange={(next) => {
            setFilters(next);
            setPage(1);
          }}
        />
      </div>

      {error && (
        <p className="border-b border-line bg-danger-soft px-4 py-3 text-sm text-danger">{error}</p>
      )}

      <BulkDeleteBar count={selectedIds.size} onDelete={handleBulkDelete} onClear={() => { setSelectedIds(new Set()); setSelectionMode(false); }} deleting={bulkDeleting} />

      {isLoading ? (
        <LeadListSkeleton />
      ) : pageItems.length === 0 ? (
        <EmptyState hasQuery={query.length > 0 || filters.length > 0} />
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
                        checked={filtered.length > 0 && filtered.every((row) => selectedIds.has(row.id))}
                        onChange={toggleSelectAll}
                        className="h-4 w-4 rounded border-line accent-slate"
                      />
                    )}
                  </th>
                  <th className="px-4 py-3">Lead Name</th>
                  <th className="px-4 py-3">Company</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Lead Source</th>
                  <th className="px-4 py-3">Lead Status</th>
                  <th className="px-4 py-3">Lead Owner</th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((lead) => (
                  <tr
                    key={lead.id}
                    data-record-row={lead.id}
                    onClick={(event) => {
                      if (!selectionMode) return;
                      const target = event.target as HTMLElement;
                      if (target.closest('button[aria-label="Record actions"]')) return;
                      event.preventDefault();
                      setSelectedIds((current) => {
                        const next = new Set(current);
                        if (next.has(lead.id)) next.delete(lead.id); else next.add(lead.id);
                        return next;
                      });
                    }}
                    onDoubleClick={() => { if (!selectionMode) router.push(`/dashboard/leads/${lead.id}`); }}
                    title="Double-click to open lead details"
                    className={`group cursor-pointer border-b border-line last:border-0 hover:bg-paper hover:shadow-[inset_2px_0_0_var(--color-amber)] ${
                      removingId === lead.id ? "animate-row-remove" : ""
                    } ${highlightId === lead.id ? "animate-row-highlight" : ""}`}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {selectionMode && <SelectionIndicator selected={selectedIds.has(lead.id)} />}
                        <RecordActionsMenu
                        onEdit={() => router.push(`/dashboard/leads/${lead.id}/edit`)}
                        onDelete={() => handleDelete(lead)}
                        onSelect={() => setSelectionMode(true)}
                        recordId={lead.id}
                        disabled={deletingId === lead.id}
                      />
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/dashboard/leads/${lead.id}`}
                        onClick={(event) => {
                          if (selectionMode) {
                            event.preventDefault();
                            event.stopPropagation();
                            setSelectedIds((current) => {
                              const next = new Set(current);
                              const id = lead.id;
                              if (next.has(id)) next.delete(id); else next.add(id);
                              return next;
                            });
                          }
                        }}
                        className="font-medium text-slate hover:underline"
                      >
                        {lead.name || "(No name)"}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-ink-soft">{lead.company_name || "—"}</td>
                    <td className="px-4 py-3 text-ink-soft">{lead.email || "—"}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-slate-light px-2.5 py-1 text-xs font-medium text-slate">
                        {lead.lead_source}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="relative inline-flex">
                        <select
                          value={lead.lead_status || "None"}
                          disabled={updatingStatusId === lead.id}
                          aria-label={`Change status for ${lead.name || "lead"}`}
                          onChange={(event) =>
                            handleStatusChange(lead, event.target.value as LeadStatus)
                          }
                          className="appearance-none rounded-full border-0 bg-slate-light py-1 pl-2.5 pr-7 text-xs font-medium text-slate outline-none cursor-pointer disabled:cursor-wait disabled:opacity-60"
                        >
                          {LEAD_STATUSES.map((status) => (
                            <option key={status} value={status}>
                              {status}
                            </option>
                          ))}
                        </select>
                        <ChevronDown size={13} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate" />
                      </div>
                    </td>
                    <td className="px-4 py-3 text-ink-soft">{lead.owner?.name ?? "Unassigned"}</td>
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

function LeadListSkeleton() {
  return (
    <div className="space-y-3 p-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="h-10 animate-shimmer rounded-md" />
      ))}
    </div>
  );
}

function EmptyState({ hasQuery }: { hasQuery: boolean }) {
  return (
    <div className="flex flex-col items-center gap-3 px-4 py-16 text-center animate-scale-in">
      <p className="font-serif text-lg text-fg">
        {hasQuery ? "No leads match that search" : "No leads yet"}
      </p>
      <p className="max-w-sm text-sm text-ink-soft">
        {hasQuery
          ? "Try a different search term, or remove a filter."
          : "Start building your pipeline by creating your first lead."}
      </p>
      {!hasQuery && (
        <Link
          href="/dashboard/leads/new"
          className="mt-1 rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white transition hover:bg-ink-2 active:scale-[0.98]"
        >
          + Create Lead
        </Link>
      )}
    </div>
  );
}
