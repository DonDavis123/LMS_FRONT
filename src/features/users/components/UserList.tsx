"use client";

import { useMemo, type KeyboardEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MANAGED_USER_ROLES, type ManagedUser } from "@/features/users/types/user.types";
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
  filters: FilterCondition[];
  onFiltersChange: (filters: FilterCondition[]) => void;
  sort: SortState | null;
  onSortChange: (sort: SortState | null) => void;
  pageSize: number;
  pagination: PaginationMeta;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  onRetry: () => void;
}

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Admin",
  SUPERADMIN: "Superadmin",
};

function roleLabel(role: string): string {
  return ROLE_LABELS[role.toUpperCase()] ?? role;
}

export default function UserList({
  users,
  currentUserId,
  isLoading,
  error,
  filters,
  onFiltersChange,
  sort,
  onSortChange,
  pageSize,
  pagination,
  onPageChange,
  onPageSizeChange,
  onRetry,
}: UserListProps) {
  const router = useRouter();

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
        choices: MANAGED_USER_ROLES.map((role) => ({ value: role, label: roleLabel(role) })),
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
        <div>
          <h1 className="font-serif text-xl text-fg">Manage Users</h1>
          <p className="text-sm text-ink-soft">
            {pagination.total} total {pagination.total === 1 ? "user" : "users"}
          </p>
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
      <p className="font-serif text-lg text-fg">No users match these filters</p>
      <p className="max-w-sm text-sm text-ink-soft">Try a different filter, or remove one.</p>
    </div>
  );
}
