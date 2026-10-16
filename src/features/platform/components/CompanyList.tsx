"use client";

import { useEffect, useState, type KeyboardEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { History, Plus, Search } from "lucide-react";
import CompanyStatusBadge from "@/features/platform/components/CompanyStatusBadge";
import {
  COMPANY_STATUSES,
  type CompanyListQuery,
  type CompanyStatus,
  type CompanySummary,
} from "@/features/platform/types/platform.types";
import { companyStatusLabel } from "@/features/platform/utils/platformLabels";
import Select from "@/shared/components/Select";
import ServerPagination from "@/shared/components/ServerPagination";
import SortableHeader from "@/shared/components/SortableHeader";
import type { PaginationMeta } from "@/shared/types/pagination";
import type { SortState } from "@/shared/types/sort";
import { formatDateTime } from "@/shared/utils/formatDate";

interface CompanyListProps {
  companies: CompanySummary[];
  isLoading: boolean;
  error: string | null;
  /** Applied search text (name or slug); the box debounces before calling `onSearchChange`. */
  search: string;
  onSearchChange: (search: string) => void;
  /** `""` means every status. */
  status: CompanyListQuery["status"];
  onStatusChange: (status: CompanyStatus | "") => void;
  sort: SortState | null;
  onSortChange: (sort: SortState | null) => void;
  pageSize: number;
  pagination: PaginationMeta;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  onRetry: () => void;
  onCreateClick: () => void;
}

const SEARCH_MAX_LENGTH = 100;
const SEARCH_DEBOUNCE_MS = 300;

export default function CompanyList({
  companies,
  isLoading,
  error,
  search,
  onSearchChange,
  status,
  onStatusChange,
  sort,
  onSortChange,
  pageSize,
  pagination,
  onPageChange,
  onPageSizeChange,
  onRetry,
  onCreateClick,
}: CompanyListProps) {
  const router = useRouter();
  const [searchInput, setSearchInput] = useState(search);

  // Send the search to the server once typing pauses, not on every keystroke.
  useEffect(() => {
    const next = searchInput.trim();
    if (next === search) return;
    const timer = window.setTimeout(() => onSearchChange(next), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [searchInput, search, onSearchChange]);

  function openCompany(id: string) {
    router.push(`/platform/companies/${id}`);
  }

  function handleRowKeyDown(event: KeyboardEvent<HTMLTableRowElement>, id: string) {
    // Ignore keys pressed on the inner name link so it keeps its own behaviour.
    if (event.target !== event.currentTarget) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openCompany(id);
    }
  }

  return (
    <div className="lp-card lp-list-page">
      <div className="lp-list-head flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-line bg-surface px-3 py-2.5 sm:px-4">
        <div className="order-1 min-w-0">
          <h1 className="font-serif text-lg leading-tight text-fg">Companies</h1>
          <p className="text-xs text-ink-soft">
            {pagination.total} total {pagination.total === 1 ? "company" : "companies"}
          </p>
        </div>

        <div className="order-3 flex w-full min-w-0 flex-wrap items-center gap-2 sm:order-2 sm:w-auto sm:flex-1 sm:px-2">
          <div className="relative w-full sm:w-64">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" />
            <input
              type="search"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              maxLength={SEARCH_MAX_LENGTH}
              placeholder="Search by name or slug"
              aria-label="Search companies by name or slug"
              className="w-full rounded-md border border-line bg-surface py-1.5 pl-9 pr-3 text-sm text-fg outline-none transition focus:border-slate focus:ring-2 focus:ring-slate-light"
            />
          </div>
          <Select
            size="sm"
            value={status ?? ""}
            onChange={(next) => onStatusChange(next as CompanyStatus | "")}
            ariaLabel="Filter by status"
            className="min-w-36"
            options={[
              { value: "", label: "All statuses" },
              ...COMPANY_STATUSES.map((value) => ({ value, label: companyStatusLabel(value) })),
            ]}
          />
        </div>

        <div className="order-2 ml-auto flex items-center gap-2 sm:order-3">
          <Link
            href="/platform/audit-logs"
            className="flex items-center gap-1.5 rounded-md border border-line px-3 py-1.5 text-sm font-medium text-fg transition hover:bg-paper"
          >
            <History size={16} />
            Audit log
          </Link>
          <button
            type="button"
            onClick={onCreateClick}
            className="flex items-center gap-1.5 rounded-md bg-ink px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-ink-2 active:scale-[0.98]"
          >
            <Plus size={16} />
            New company
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center justify-between gap-3 border-b border-line bg-danger-soft px-4 py-3 text-sm text-danger">
          <p>{error}</p>
          <button
            type="button"
            onClick={onRetry}
            className="shrink-0 rounded-md border border-danger/30 px-2.5 py-1 text-xs font-semibold transition hover:bg-surface"
          >
            Retry
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3 p-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-10 animate-shimmer rounded-md" />
          ))}
        </div>
      ) : companies.length === 0 ? (
        !error && (
          <div className="flex flex-col items-center gap-3 px-4 py-16 text-center animate-scale-in">
            <p className="font-serif text-lg text-fg">No companies match</p>
            <p className="max-w-sm text-sm text-ink-soft">
              Try a different search or status, or create a new company.
            </p>
          </div>
        )
      ) : (
        <>
          <div className="lp-table-scroll">
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead>
                <tr className="border-b border-line text-xs font-semibold uppercase tracking-wide text-ink-soft">
                  <SortableHeader label="Company" field="name" sort={sort} onSortChange={onSortChange} />
                  <SortableHeader label="Slug" field="slug" sort={sort} onSortChange={onSortChange} />
                  <th className="px-4 py-3">Website</th>
                  <SortableHeader label="Status" field="status" sort={sort} onSortChange={onSortChange} />
                  <SortableHeader label="Users" field="users_count" sort={sort} onSortChange={onSortChange} />
                  <SortableHeader label="Created" field="created_at" sort={sort} onSortChange={onSortChange} />
                </tr>
              </thead>
              <tbody>
                {companies.map((company) => (
                  <tr
                    key={company.id}
                    tabIndex={0}
                    onClick={() => openCompany(company.id)}
                    onKeyDown={(event) => handleRowKeyDown(event, company.id)}
                    aria-label={`Open ${company.name}`}
                    className="group cursor-pointer border-b border-line outline-none last:border-0 hover:bg-paper hover:shadow-[inset_2px_0_0_var(--color-amber)] focus-visible:bg-paper focus-visible:shadow-[inset_2px_0_0_var(--color-amber)]"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/platform/companies/${company.id}`}
                        onClick={(event) => event.stopPropagation()}
                        className="font-medium text-slate hover:underline"
                      >
                        {company.name || "(No name)"}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-ink-soft">{company.slug || "-"}</td>
                    <td className="max-w-[16rem] truncate px-4 py-3 text-ink-soft" title={company.website ?? undefined}>
                      {company.website || "-"}
                    </td>
                    <td className="px-4 py-3">
                      <CompanyStatusBadge status={company.status} />
                    </td>
                    <td className="px-4 py-3 tabular-nums text-fg">{company.users_count}</td>
                    <td className="px-4 py-3 text-ink-soft">{formatDateTime(company.created_at) || "-"}</td>
                  </tr>
                ))}
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
