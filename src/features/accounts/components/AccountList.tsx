"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ACCOUNT_OWNERSHIP_OPTIONS, type Account } from "@/features/accounts/types/account.types";
import { AccountService } from "@/features/accounts/services/AccountService";
import { userService } from "@/features/users/services/userService";
import RecordActionsMenu from "@/shared/components/RecordActionsMenu";
import BulkDeleteBar from "@/shared/components/BulkDeleteBar";
import SelectionIndicator from "@/shared/components/SelectionIndicator";
import FilterBar, { type FilterCondition, type FilterFieldConfig } from "@/shared/components/FilterBar";
import { applyFilters } from "@/shared/utils/applyFilters";
import type { LeadOwnerOption } from "@/features/auth/types/auth.types";

import { confirmDelete } from "@/shared/utils/confirmDelete";
import { useSelectionKeyboard } from "@/shared/hooks/useSelectionKeyboard";

interface AccountListProps {
  accounts: Account[];
  isLoading: boolean;
  highlightId?: string | null;
  onAccountDeleted: (id: string) => void;
}

const PAGE_SIZE = 10;
const ROW_REMOVE_MS = 200;

function toChoices(values: readonly string[]) {
  return values.map((v) => ({ value: v, label: v }));
}

export default function AccountList({
  accounts,
  isLoading,
  highlightId,
  onAccountDeleted,
}: AccountListProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<FilterCondition[]>([]);
  const [owners, setOwners] = useState<LeadOwnerOption[]>([]);
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectionMode, setSelectionMode] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  useEffect(() => {
    userService.getLeadOwners().then(setOwners).catch(() => setOwners([]));
  }, []);

  const fields = useMemo<FilterFieldConfig[]>(
    () => [
      { field: "account_number", label: "Account Number", type: "text" },
      { field: "account_type", label: "Account Type", type: "text" },
      { field: "billing_city", label: "Billing City", type: "text" },
      { field: "billing_country", label: "Billing Country", type: "text" },
      { field: "ownership", label: "Ownership", type: "choice", choices: toChoices(ACCOUNT_OWNERSHIP_OPTIONS) },
      { field: "annual_revenue", label: "Annual Revenue", type: "number" },
      {
        field: "account_owner_id",
        label: "Account Owner",
        type: "uuid",
        choices: owners.map((o) => ({ value: o.id, label: o.name })),
      },
      { field: "created_at", label: "Created", type: "datetime" },
    ],
    [owners]
  );

  function getFieldValue(account: Account, field: string): unknown {
    return (account as unknown as Record<string, unknown>)[field];
  }

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    const searched = accounts.filter((a) => a.account_name.toLowerCase().includes(q));
    return applyFilters(searched, filters, getFieldValue);
  }, [accounts, query, filters]);

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
    if (!await confirmDelete(`Delete ${ids.length} selected accounts? This can't be undone.`)) return;
    setBulkDeleting(true);
    try {
      const results = await Promise.allSettled(ids.map((id) => AccountService.deleteAccount(id)));
      const deleted = results.reduce((count, result) => count + (result.status === "fulfilled" ? 1 : 0), 0);
      results.forEach((result, index) => {
        if (result.status === "fulfilled") {
          onAccountDeleted(ids[index]);
        }
      });
      setSelectedIds(new Set());
      setSelectionMode(false);
      if (deleted < ids.length) window.alert(`${deleted} deleted. ${ids.length - deleted} could not be deleted.`);
    } finally {
      setBulkDeleting(false);
    }
  }

  async function handleDelete(account: Account) {
    if (!await confirmDelete(`Delete ${account.account_name}?`)) return;
    try {
      await AccountService.deleteAccount(account.id);
      setRemovingId(account.id);
      window.setTimeout(() => {
        onAccountDeleted(account.id);
        setRemovingId(null);
      }, ROW_REMOVE_MS);
    } catch {
      window.alert("Couldn't delete this account. Try again.");
    }
  }


  return (
    <div className="rounded-lg border border-line bg-surface">
      <div className="flex flex-col gap-3 border-b border-line p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-serif text-xl text-fg">Accounts</h1>
            <p className="text-sm text-ink-soft">
              {filtered.length} total {filtered.length === 1 ? "account" : "accounts"}
            </p>
          </div>
          <div className="flex gap-2">
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
              placeholder="Search accounts…"
              className="w-full rounded-md border border-line px-3 py-2 text-sm outline-none focus:border-slate focus:ring-2 focus:ring-slate-light sm:w-56"
            />
            <Link
              href="/dashboard/accounts/new"
              className="whitespace-nowrap rounded-md bg-amber px-4 py-2 text-sm font-semibold text-fg transition hover:bg-amber-dark active:scale-[0.98]"
            >
              + Create Account
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
            {query || filters.length > 0 ? "No accounts match your search or filters" : "No accounts yet"}
          </p>
          <p className="max-w-sm text-sm text-ink-soft">
            {query || filters.length > 0
              ? "Try a different search term, or remove a filter."
              : "Companies you do business with show up here."}
          </p>
          {!(query || filters.length > 0) && (
            <Link
              href="/dashboard/accounts/new"
              className="mt-1 rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white transition hover:bg-ink-2 active:scale-[0.98]"
            >
              + Create Account
            </Link>
          )}
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
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
                  <th className="px-4 py-3">Account Name</th>
                  <th className="px-4 py-3">Website</th>
                  <th className="px-4 py-3">Phone</th>
                  <th className="px-4 py-3">Industry</th>
                  <th className="px-4 py-3">Account Owner</th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((account) => (
                  <tr
                    key={account.id}
                    data-record-row={account.id}
                    onClick={(event) => {
                      if (!selectionMode) return;
                      const target = event.target as HTMLElement;
                      if (target.closest('button[aria-label="Record actions"]')) return;
                      event.preventDefault();
                      setSelectedIds((current) => {
                        const next = new Set(current);
                        if (next.has(account.id)) next.delete(account.id); else next.add(account.id);
                        return next;
                      });
                    }}
                    onDoubleClick={() => { if (!selectionMode) router.push(`/dashboard/accounts/${account.id}`); }}
                    title="Double-click to open account details"
                    className={`group cursor-pointer border-b border-line last:border-0 hover:bg-paper hover:shadow-[inset_2px_0_0_var(--color-amber)] ${
                      removingId === account.id ? "animate-row-remove" : ""
                    } ${highlightId === account.id ? "animate-row-highlight" : ""}`}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {selectionMode && <SelectionIndicator selected={selectedIds.has(account.id)} />}
                        <RecordActionsMenu
                        onEdit={() => router.push(`/dashboard/accounts/${account.id}?edit=1`)}
                        onDelete={() => handleDelete(account)}
                        onSelect={() => setSelectionMode(true)}
                        recordId={account.id}
                      />
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/dashboard/accounts/${account.id}`}
                        onClick={(event) => {
                          if (selectionMode) {
                            event.preventDefault();
                            event.stopPropagation();
                            setSelectedIds((current) => {
                              const next = new Set(current);
                              const id = account.id;
                              if (next.has(id)) next.delete(id); else next.add(id);
                              return next;
                            });
                          }
                        }}
                        className="font-medium text-slate hover:underline"
                      >
                        {account.account_name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-ink-soft">{account.website || "—"}</td>
                    <td className="px-4 py-3 text-ink-soft">{account.phone || "—"}</td>
                    <td className="px-4 py-3 text-ink-soft">{account.industry || "—"}</td>
                    <td className="px-4 py-3 text-ink-soft">{account.account_owner_name ?? "Unassigned"}</td>
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
