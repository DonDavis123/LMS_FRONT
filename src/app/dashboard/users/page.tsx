"use client";

import { Suspense, useEffect, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import UserList from "@/features/users/components/UserList";
import { userService } from "@/features/users/services/userService";
import type { ManagedUser } from "@/features/users/types/user.types";
import { useRequireSuperAdmin } from "@/features/auth/hooks/useRequireSuperAdmin";
import type { FilterCondition } from "@/shared/components/FilterBar";
import type { PaginationMeta } from "@/shared/types/pagination";
import type { SortState } from "@/shared/types/sort";
import { extractApiError } from "@/shared/utils/apiError";

const DEFAULT_PAGE_SIZE = 10;
const EMPTY_PAGINATION: PaginationMeta = {
  page: 1,
  page_size: DEFAULT_PAGE_SIZE,
  total: 0,
  total_pages: 0,
};

function UsersPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user: currentUser, isAllowed } = useRequireSuperAdmin();
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [filters, setFilters] = useState<FilterCondition[]>([]);
  const [sort, setSort] = useState<SortState | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [pagination, setPagination] = useState<PaginationMeta>(EMPTY_PAGINATION);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!isAllowed) return;
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    userService
      .getUsersPage({ page, page_size: pageSize, filters, sort })
      .then((data) => {
        if (cancelled) return;
        setUsers(data.results);
        setPagination(data.pagination);
        if (data.pagination.total_pages > 0 && page > data.pagination.total_pages) {
          setPage(data.pagination.total_pages);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(extractApiError(err, "Couldn't load users from the server."));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isAllowed, page, pageSize, filters, sort, refreshKey]);

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(null), 3000);
  }

  useEffect(() => {
    const deletedMessage = searchParams.get("deletedMessage");
    const message =
      searchParams.get("updated") === "1"
        ? "User updated successfully"
        : deletedMessage
        ? decodeURIComponent(deletedMessage)
        : null;

    if (message) {
      showToast(message);
      router.replace("/dashboard/users");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  if (!isAllowed) return null;

  return (
    <>
      <UserList
        users={users}
        currentUserId={currentUser?.id ?? null}
        isLoading={isLoading}
        error={error}
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
        onRetry={() => setRefreshKey((value) => value + 1)}
      />

      {toast && (
        <div className="fixed bottom-6 right-6 z-[60] flex items-center gap-2 rounded-md border border-success/30 bg-success-soft px-4 py-3 text-sm font-medium text-success shadow-lg animate-toast-in">
          <CheckCircle2 size={16} className="shrink-0 animate-pop-in" />
          {toast}
        </div>
      )}
    </>
  );
}

export default function UsersPage() {
  return (
    <Suspense fallback={null}>
      <UsersPageInner />
    </Suspense>
  );
}
