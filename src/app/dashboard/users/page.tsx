"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import UserList from "@/features/users/components/UserList";
import { userService } from "@/features/users/services/userService";
import type { ManagedUser } from "@/features/users/types/user.types";
import { authService } from "@/features/auth/services/authService";
import { isSuperAdmin } from "@/features/auth/types/auth.types";
import type { FilterCondition } from "@/shared/components/FilterBar";
import type { PaginationMeta } from "@/shared/types/pagination";
import type { SortState } from "@/shared/types/sort";
import { extractApiError } from "@/shared/utils/apiError";

const DEFAULT_PAGE_SIZE = 10;
const SEARCH_DEBOUNCE_MS = 300;
const EMPTY_PAGINATION: PaginationMeta = {
  page: 1,
  page_size: DEFAULT_PAGE_SIZE,
  total: 0,
  total_pages: 0,
};

export default function UsersPage() {
  const router = useRouter();
  // Superadmin-only screen: the backend enforces it (403), this just avoids
  // showing a broken page to other roles.
  const [allowed] = useState(() => isSuperAdmin(authService.getSessionUser()));

  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<FilterCondition[]>([]);
  const [sort, setSort] = useState<SortState | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [pagination, setPagination] = useState<PaginationMeta>(EMPTY_PAGINATION);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!allowed) router.replace("/dashboard");
  }, [allowed, router]);

  // Debounce typing so each keystroke doesn't hit the API.
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
    if (!allowed) return;
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    userService
      .getUsersPage({ page, page_size: pageSize, filters, search, sort })
      .then((data) => {
        if (cancelled) return;
        setUsers(data.results);
        setPagination(data.pagination);
        if (data.pagination.total_pages > 0 && page > data.pagination.total_pages) {
          setPage(data.pagination.total_pages);
        }
      })
      .catch((err) => {
        if (cancelled) return;
        const status = (err as { response?: { status?: number } })?.response?.status;
        setError(
          status === 403
            ? "You don't have permission to manage users."
            : extractApiError(err, "Couldn't load users from the server.")
        );
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [allowed, page, pageSize, filters, search, sort]);

  if (!allowed) return null;

  return (
    <UserList
      users={users}
      isLoading={isLoading}
      error={error}
      search={searchInput}
      onSearchChange={setSearchInput}
      filters={filters}
      onFiltersChange={(next) => {
        setFilters(next);
        setPage(1);
      }}
      sort={sort}
      onSortChange={(next) => {
        setSort(next);
        setPage(1);
      }}
      pageSize={pageSize}
      pagination={pagination}
      onPageChange={setPage}
      onPageSizeChange={(next) => {
        setPageSize(next);
        setPage(1);
      }}
    />
  );
}
