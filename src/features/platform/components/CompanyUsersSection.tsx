"use client";

import { useEffect, useState } from "react";
import { Plus, Search } from "lucide-react";
import CompanyUserCreateDialog from "@/features/platform/components/CompanyUserCreateDialog";
import CompanyUserResetPasswordDialog from "@/features/platform/components/CompanyUserResetPasswordDialog";
import { platformService } from "@/features/platform/services/platformService";
import type { CompanyUser } from "@/features/platform/types/platform.types";
import ConfirmActionDialog from "@/features/users/components/ConfirmActionDialog";
import { USER_ROLES } from "@/features/users/types/user.types";
import { roleLabel } from "@/features/users/utils/userLabels";
import Select from "@/shared/components/Select";
import ServerPagination from "@/shared/components/ServerPagination";
import SortableHeader from "@/shared/components/SortableHeader";
import type { PaginationMeta } from "@/shared/types/pagination";
import type { SortState } from "@/shared/types/sort";
import { extractApiError } from "@/shared/utils/apiError";
import { formatDateTime } from "@/shared/utils/formatDate";

interface CompanyUsersSectionProps {
  companyId: string;
  companyName: string;
  /** Called after the user list changed, so the parent can refresh counts and superadmins. */
  onChanged: () => void;
  onNotify: (message: string) => void;
}

type ActiveFilter = "" | "true" | "false";

const DEFAULT_PAGE_SIZE = 10;
const EMPTY_PAGINATION: PaginationMeta = {
  page: 1,
  page_size: DEFAULT_PAGE_SIZE,
  total: 0,
  total_pages: 0,
};
const SEARCH_MAX_LENGTH = 100;
const SEARCH_DEBOUNCE_MS = 300;

/**
 * The company's users, managed by the platform admin: search, filter,
 * sort, add a user, reset a password, block / unblock. Everything is
 * scoped to one company by the URL, so a platform admin can never touch
 * another company's user through these calls.
 */
export default function CompanyUsersSection({
  companyId,
  companyName,
  onChanged,
  onNotify,
}: CompanyUsersSectionProps) {
  const [users, setUsers] = useState<CompanyUser[]>([]);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>("");
  const [sort, setSort] = useState<SortState | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [pagination, setPagination] = useState<PaginationMeta>(EMPTY_PAGINATION);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [resetTarget, setResetTarget] = useState<CompanyUser | null>(null);
  const [statusTarget, setStatusTarget] = useState<CompanyUser | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Send the search to the server once typing pauses, not on every keystroke.
  useEffect(() => {
    const next = searchInput.trim();
    if (next === search) return;
    const timer = window.setTimeout(() => {
      setSearch(next);
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [searchInput, search]);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    platformService
      .getCompanyUsersPage(companyId, {
        page,
        page_size: pageSize,
        search,
        role,
        is_active: activeFilter === "" ? null : activeFilter === "true",
        sort,
      })
      .then((data) => {
        if (cancelled) return;
        setUsers(data.results);
        setPagination(data.pagination);
        if (data.pagination.total_pages > 0 && page > data.pagination.total_pages) {
          setPage(data.pagination.total_pages);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(extractApiError(err, "Couldn't load this company's users."));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [companyId, page, pageSize, search, role, activeFilter, sort, refreshKey]);

  function reload() {
    setRefreshKey((value) => value + 1);
    onChanged();
  }

  async function handleStatusConfirm() {
    if (!statusTarget) return;
    const target = statusTarget;
    const wasBlocked = target.is_active === false;

    setIsBusy(true);
    setActionError(null);
    try {
      if (wasBlocked) await platformService.unblockCompanyUser(companyId, target.id);
      else await platformService.blockCompanyUser(companyId, target.id);
      onNotify(wasBlocked ? "User unblocked successfully" : "User blocked successfully");
      reload();
    } catch (err) {
      setActionError(
        extractApiError(
          err,
          wasBlocked ? "Couldn't unblock this user. Try again." : "Couldn't block this user. Try again.",
        ),
      );
    } finally {
      setIsBusy(false);
      setStatusTarget(null);
    }
  }

  const statusTargetLabel = statusTarget ? statusTarget.name || statusTarget.email : "";
  const statusTargetBlocked = statusTarget?.is_active === false;
  const resetTargetLabel = resetTarget ? resetTarget.name || resetTarget.email : "";

  return (
    <div className="lp-card overflow-hidden">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-line bg-surface px-3 py-2.5 sm:px-4">
        <div className="min-w-0">
          <h2 className="font-serif text-lg leading-tight text-fg">Users</h2>
          <p className="text-xs text-ink-soft">
            {pagination.total} {pagination.total === 1 ? "user" : "users"} in {companyName}
          </p>
        </div>

        <div className="order-3 flex w-full min-w-0 flex-wrap items-center gap-2 sm:order-2 sm:w-auto sm:flex-1 sm:px-2">
          <div className="relative w-full sm:w-56">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" />
            <input
              type="search"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              maxLength={SEARCH_MAX_LENGTH}
              placeholder="Search by name or email"
              aria-label="Search company users by name or email"
              className="w-full rounded-md border border-line bg-surface py-1.5 pl-9 pr-3 text-sm text-fg outline-none transition focus:border-slate focus:ring-2 focus:ring-slate-light"
            />
          </div>
          <Select
            size="sm"
            value={role}
            onChange={(next) => {
              setRole(next);
              setPage(1);
            }}
            ariaLabel="Filter by role"
            className="min-w-32"
            options={[
              { value: "", label: "All roles" },
              ...USER_ROLES.map((value) => ({ value, label: roleLabel(value) })),
            ]}
          />
          <Select
            size="sm"
            value={activeFilter}
            onChange={(next) => {
              setActiveFilter(next as ActiveFilter);
              setPage(1);
            }}
            ariaLabel="Filter by status"
            className="min-w-32"
            options={[
              { value: "", label: "All statuses" },
              { value: "true", label: "Active" },
              { value: "false", label: "Blocked" },
            ]}
          />
        </div>

        <div className="order-2 ml-auto sm:order-3">
          <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            className="flex items-center gap-1.5 rounded-md bg-ink px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-ink-2 active:scale-[0.98]"
          >
            <Plus size={16} />
            New user
          </button>
        </div>
      </div>

      {(error || actionError) && (
        <div className="flex items-center justify-between gap-3 border-b border-line bg-danger-soft px-4 py-3 text-sm text-danger">
          <p>{error ?? actionError}</p>
          <button
            type="button"
            onClick={() => {
              setActionError(null);
              if (error) setRefreshKey((value) => value + 1);
            }}
            className="shrink-0 rounded-md border border-danger/30 px-2.5 py-1 text-xs font-semibold transition hover:bg-surface"
          >
            {error ? "Retry" : "Dismiss"}
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3 p-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-10 animate-shimmer rounded-md" />
          ))}
        </div>
      ) : users.length === 0 ? (
        !error && (
          <div className="flex flex-col items-center gap-2 px-4 py-12 text-center animate-scale-in">
            <p className="font-serif text-lg text-fg">No users match</p>
            <p className="max-w-sm text-sm text-ink-soft">Try a different search, or remove a filter.</p>
          </div>
        )
      ) : (
        <>
          <div className="lp-table-scroll">
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead>
                <tr className="border-b border-line text-xs font-semibold uppercase tracking-wide text-ink-soft">
                  <SortableHeader label="Name" field="name" sort={sort} onSortChange={setSort} />
                  <SortableHeader label="Email" field="email" sort={sort} onSortChange={setSort} />
                  <SortableHeader label="Role" field="role" sort={sort} onSortChange={setSort} />
                  <SortableHeader label="Status" field="is_active" sort={sort} onSortChange={setSort} />
                  <SortableHeader label="Created" field="created_at" sort={sort} onSortChange={setSort} />
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => {
                  const isBlocked = user.is_active === false;
                  return (
                    <tr key={user.id} className="border-b border-line last:border-0">
                      <td className="px-4 py-3 font-medium text-fg">{user.name || "(No name)"}</td>
                      <td className="px-4 py-3 text-ink-soft">{user.email || "-"}</td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-slate-light px-2.5 py-1 text-xs font-medium text-slate">
                          {roleLabel(user.role)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                            isBlocked ? "bg-danger-soft text-danger" : "bg-success-soft text-success"
                          }`}
                        >
                          {isBlocked ? "Blocked" : "Active"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-ink-soft">{formatDateTime(user.created_at) || "-"}</td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setResetTarget(user)}
                            className="rounded-md border border-line px-2.5 py-1 text-xs font-medium text-fg transition hover:bg-paper"
                          >
                            Reset password
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setActionError(null);
                              setStatusTarget(user);
                            }}
                            className={`rounded-md border px-2.5 py-1 text-xs font-medium transition hover:opacity-90 ${
                              isBlocked
                                ? "border-line text-fg hover:bg-paper"
                                : "border-danger/40 bg-danger-soft text-danger"
                            }`}
                          >
                            {isBlocked ? "Unblock" : "Block"}
                          </button>
                        </div>
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
            onPageChange={setPage}
            onPageSizeChange={(next) => {
              setPageSize(next);
              setPage(1);
            }}
          />
        </>
      )}

      <CompanyUserCreateDialog
        isOpen={isCreateOpen}
        companyId={companyId}
        companyName={companyName}
        onClose={() => setIsCreateOpen(false)}
        onCreated={(created) => {
          setIsCreateOpen(false);
          onNotify(`${created.name || created.email} was created`);
          // Newest first by default, so page 1 shows the new user.
          setSort(null);
          setPage(1);
          reload();
        }}
      />

      <CompanyUserResetPasswordDialog
        isOpen={resetTarget !== null}
        companyId={companyId}
        userId={resetTarget?.id ?? ""}
        userLabel={resetTargetLabel}
        onClose={() => setResetTarget(null)}
        onReset={() => {
          setResetTarget(null);
          onNotify("Password reset successfully");
          onChanged();
        }}
      />

      <ConfirmActionDialog
        isOpen={statusTarget !== null}
        title={statusTargetBlocked ? "Unblock this user?" : "Block this user?"}
        message={
          statusTargetBlocked
            ? `${statusTargetLabel} will be able to sign in again.`
            : `${statusTargetLabel} will no longer be able to sign in and will be signed out of every session.`
        }
        confirmLabel={statusTargetBlocked ? "Unblock" : "Block"}
        tone={statusTargetBlocked ? "primary" : "danger"}
        isBusy={isBusy}
        onConfirm={handleStatusConfirm}
        onCancel={() => setStatusTarget(null)}
      />
    </div>
  );
}
