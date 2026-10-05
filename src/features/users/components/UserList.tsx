"use client";

import { useEffect, useMemo, useState, type KeyboardEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { History, Plus, Search } from "lucide-react";
import { USER_ROLES, type ManagedUser } from "@/features/users/types/user.types";
import { roleLabel } from "@/features/users/utils/userLabels";
import FilterBar, { type FilterCondition, type FilterFieldConfig } from "@/shared/components/FilterBar";
import SortableHeader from "@/shared/components/SortableHeader";
import ServerPagination from "@/shared/components/ServerPagination";
import type { PaginationMeta } from "@/shared/types/pagination";
import type { SortState } from "@/shared/types/sort";
import { formatDateTime } from "@/shared/utils/formatDate";

interface UserListProps {
  users: ManagedUser[];
  /** Id of the signed-in user, used to mark their own row with "You". */
  currentUserId: string | null;
  isLoading: boolean;
  error: string | null;
  /** Applied search text (name or email); the box debounces before calling `onSearchChange`. */
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
  onRetry: () => void;
  onCreateClick: () => void;
}

// Backend limit for `search`.
const SEARCH_MAX_LENGTH = 100;
const SEARCH_DEBOUNCE_MS = 300;

export default function UserList({
  users,
  currentUserId,
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
  onRetry,
  onCreateClick,
}: UserListProps) {
  const router = useRouter();
  const [searchInput, setSearchInput] = useState(search);

  // Send the search to the server once typing pauses, not on every keystroke.
  useEffect(() => {
    const next = searchInput.trim();
    if (next === search) return;
    const timer = window.setTimeout(() => onSearchChange(next), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [searchInput, search, onSearchChange]);

  // The backend filters users on name, email, role and is_active only —
  // `created_at` is sortable but rejected as a filter, so it isn't offered here.
  const fields = useMemo<FilterFieldConfig[]>(
    () => [
      { field: "name", label: "Name", type: "text" },
      { field: "email", label: "Email", type: "text" },
      {
        field: "role",
        label: "Role",
        type: "choice",
        choices: USER_ROLES.map((role) => ({ value: role, label: roleLabel(role) })),
      },
      { field: "is_active", label: "Status", type: "boolean" },
    ],
    []
  );

  function openUser(id: string) {
    router.push(`/dashboard/users/${id}`);
  }

  function handleRowKeyDown(event: KeyboardEvent<HTMLTableRowElement>, id: string) {
    // Ignore keys pressed on the inner name link so it keeps its own behaviour.
    if (event.target !== event.currentTarget) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openUser(id);
    }
  }

  return (
    <div className="lp-card overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-line bg-surface/80 p-5 backdrop-blur-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="font-serif text-xl text-fg">Manage Users</h1>
            <p className="text-sm text-ink-soft">
              {pagination.total} total {pagination.total === 1 ? "user" : "users"}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/dashboard/users/audit-logs"
              className="flex items-center gap-1.5 rounded-md border border-line px-3 py-2 text-sm font-medium text-fg transition hover:bg-paper"
            >
              <History size={16} />
              Activity log
            </Link>
            <button
              type="button"
              onClick={onCreateClick}
              className="flex items-center gap-1.5 rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white transition hover:bg-ink-2 active:scale-[0.98]"
            >
              <Plus size={16} />
              New user
            </button>
          </div>
        </div>

        <div className="relative max-w-sm">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" />
          <input
            type="search"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            maxLength={SEARCH_MAX_LENGTH}
            placeholder="Search by name or email"
            aria-label="Search users by name or email"
            className="w-full rounded-md border border-line bg-surface py-2 pl-9 pr-3 text-sm text-fg outline-none transition focus:border-slate focus:ring-2 focus:ring-slate-light"
          />
        </div>

        <FilterBar fields={fields} filters={filters} onChange={onFiltersChange} />
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
        <UserListSkeleton />
      ) : users.length === 0 ? (
        <EmptyState hasError={Boolean(error)} />
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
                  <tr
                    key={user.id}
                    tabIndex={0}
                    onClick={() => openUser(user.id)}
                    onKeyDown={(event) => handleRowKeyDown(event, user.id)}
                    aria-label={`Open ${user.name || user.email}`}
                    className="group cursor-pointer border-b border-line outline-none last:border-0 hover:bg-paper hover:shadow-[inset_2px_0_0_var(--color-amber)] focus-visible:bg-paper focus-visible:shadow-[inset_2px_0_0_var(--color-amber)]"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/dashboard/users/${user.id}`}
                          onClick={(event) => event.stopPropagation()}
                          className="font-medium text-slate hover:underline"
                        >
                          {user.name || "(No name)"}
                        </Link>
                        {currentUserId !== null && user.id === currentUserId && (
                          <span className="rounded-full border border-line bg-paper px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-ink-soft">
                            You
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-ink-soft">{user.email || "-"}</td>
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
                        {user.is_active ? "Active" : "Blocked"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-ink-soft">{formatDateTime(user.created_at) || "-"}</td>
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

function UserListSkeleton() {
  return (
    <div className="space-y-3 p-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="h-10 animate-shimmer rounded-md" />
      ))}
    </div>
  );
}

function EmptyState({ hasError }: { hasError: boolean }) {
  // When the request failed, the error banner already explains why — don't
  // also claim that no users match.
  if (hasError) return null;
  return (
    <div className="flex flex-col items-center gap-3 px-4 py-16 text-center animate-scale-in">
      <p className="font-serif text-lg text-fg">No users match</p>
      <p className="max-w-sm text-sm text-ink-soft">Try a different search, or remove a filter.</p>
    </div>
  );
}
