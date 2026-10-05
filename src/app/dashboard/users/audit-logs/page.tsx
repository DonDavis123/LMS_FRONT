"use client";

import { useEffect, useState } from "react";
import UserAuditLogList from "@/features/users/components/UserAuditLogList";
import { userService } from "@/features/users/services/userService";
import type { UserAuditAction, UserAuditLogEntry } from "@/features/users/types/user.types";
import { useRequireSuperAdmin } from "@/features/auth/hooks/useRequireSuperAdmin";
import type { PaginationMeta } from "@/shared/types/pagination";
import { extractApiError } from "@/shared/utils/apiError";

const DEFAULT_PAGE_SIZE = 20;
const EMPTY_PAGINATION: PaginationMeta = {
  page: 1,
  page_size: DEFAULT_PAGE_SIZE,
  total: 0,
  total_pages: 0,
};

export default function UserAuditLogsPage() {
  const { isAllowed } = useRequireSuperAdmin();
  const [entries, setEntries] = useState<UserAuditLogEntry[]>([]);
  const [action, setAction] = useState<UserAuditAction | "">("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [pagination, setPagination] = useState<PaginationMeta>(EMPTY_PAGINATION);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!isAllowed) return;
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    userService
      .getAuditLogs({ action: action || undefined, page, page_size: pageSize })
      .then((data) => {
        if (cancelled) return;
        setEntries(data.results);
        setPagination(data.pagination);
        if (data.pagination.total_pages > 0 && page > data.pagination.total_pages) {
          setPage(data.pagination.total_pages);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(extractApiError(err, "Couldn't load the activity log."));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isAllowed, action, page, pageSize, refreshKey]);

  if (!isAllowed) return null;

  return (
    <UserAuditLogList
      entries={entries}
      isLoading={isLoading}
      error={error}
      action={action}
      onActionChange={(next) => {
        setAction(next);
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
  );
}
