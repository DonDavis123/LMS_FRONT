"use client";

import { useMemo } from "react";
import { Search, X } from "lucide-react";
import { MANAGED_USER_ROLES, type ManagedUser } from "@/features/users/types/user.types";
import FilterBar, { type FilterCondition, type FilterFieldConfig } from "@/shared/components/FilterBar";
import SortableHeader from "@/shared/components/SortableHeader";
import ServerPagination from "@/shared/components/ServerPagination";
import type { PaginationMeta } from "@/shared/types/pagination";
import type { SortState } from "@/shared/types/sort";
import { formatDateTime } from "@/shared/utils/formatDate";

interface UserListProps {
  users: ManagedUser[];
  isLoading: boolean;
  error: string | null;
  search: string;
  onSearchChange: (search: string) => void;
  filters: FilterCondition[];
  onFiltersChange: (filters: FilterCondition[]) => void;
  sort: SortState | null;
  onSortChange: (sort: SortState | null) => void;
  pageSize: number;
  pagination: PaginationMeta;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}

function roleLabel(role: string): string {
  return role.replace(/[\s_-]+/g, " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
}

export default function UserList({
  users,
  isLoading,
  error,
  search,
  onSearchChange,
  filters,
  onFiltersChange,
  sort,
  onSortChange,
  pageSize,
  pagination,
  onPageChange,
  onPageSizeChange,
}: UserListProps) {
  const fields = useMemo<FilterFieldConfig[]>(
    () => [
      {
        field: "role",
        label: "Role",
        type: "choice",
        choices: MANAGED_USER_ROLES.map((r) => ({ value: r, label: roleLabel(r) })),
      },
      { field: "is_active", label: "Active", type: "boolean" },
    ],
    []
  );

  const hasFilters = filters.length > 0 || search.trim() !== "";

  return (
    <div className="lp-card overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-line bg-surface/80 p-5 backdrop-blur-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-serif text-xl text-fg">Manage Users</h1>
            <p className="text-sm text-ink-soft">
              {pagination.total} total {pagination.total === 1 ? "user" : "users"}
            </p>
          </div>

          <label className="relative block w-full sm:w-72">
            <span className="sr-only">Search users by name or email</span>
            <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" />
            <input
              type="text"
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Search name or email"
              className="w-full rounded-md border border-line bg-paper py-2 pl-9 pr-8 text-sm text-fg outline-none transition focus:border-slate focus:bg-surface focus:ring-2 focus:ring-slate-light"
            />
            {search && (
              <button
                type="button"
                onClick={() => onSearchChange("")}
                aria-label="Clear search"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-ink-soft hover:text-fg"
              >
                <X size={14} />
              </button>
            )}
          </label>
        </div>

        <FilterBar fields={fields} filters={filters} onChange={onFiltersChange} />
      </div>

      {error && <p className="border-b border-line bg-danger-soft px-4 py-3 text-sm text-danger">{error}</p>}

      {isLoading ? (
        <div className="space-y-3 p-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-10 animate-shimmer rounded-md" />
          ))}
        </div>
      ) : users.length === 0 ? (
        <div className="flex flex-col items-center gap-3 px-4 py-16 text-center animate-scale-in">
          <p className="font-serif text-lg text-fg">{hasFilters ? "No users match your search" : "No users yet"}</p>
          {hasFilters && (
            <p className="max-w-sm text-sm text-ink-soft">Try a different search term, or remove a filter.</p>
          )}
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-line text-xs font-semibold uppercase tracking-wide text-ink-soft">
                  <SortableHeader label="Name" field="name" sort={sort} onSortChange={onSortChange} />
                  <SortableHeader label="Email" field="email" sort={sort} onSortChange={onSortChange} />
                  <SortableHeader label="Role" field="role" sort={sort} onSortChange={onSortChange} />
                  <SortableHeader label="Status" field="is_active" sort={sort} onSortChange={onSortChange} />
                  <SortableHeader label="Created" field="created_at" sort={sort} onSortChange={onSortChange} />
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b border-line last:border-0 hover:bg-paper">
                    <td className="px-4 py-3 font-medium text-fg">{user.name || "(No name)"}</td>
                    <td className="px-4 py-3 text-ink-soft">{user.email}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-slate-light px-2.5 py-1 text-xs font-medium text-slate">
                        {roleLabel(user.role)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                          user.is_active ? "bg-success-soft text-success" : "bg-danger-soft text-danger"
                        }`}
                      >
                        {user.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-ink-soft">{formatDateTime(user.created_at) || "—"}</td>
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
