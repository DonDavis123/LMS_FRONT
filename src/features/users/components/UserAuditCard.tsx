"use client";

import { useEffect, useState } from "react";
import { userService } from "@/features/users/services/userService";
import type { UserAuditLogEntry } from "@/features/users/types/user.types";
import { auditActionLabel, describeAuditMetadata } from "@/features/users/utils/userLabels";
import { RecordSection } from "@/shared/components/RecordSection";
import Spinner from "@/shared/components/Spinner";
import type { PaginationMeta } from "@/shared/types/pagination";
import { extractApiError } from "@/shared/utils/apiError";
import { formatDateTime } from "@/shared/utils/formatDate";

interface UserAuditCardProps {
  userId: string;
  /** Bump to reload the history from page 1 after a change was made. */
  refreshKey: number;
}

const PAGE_SIZE = 10;

/**
 * GET /users/audit-logs/?user_id=… — who did what to this account, newest
 * first. The first page reloads whenever `refreshKey` changes; "Show more"
 * appends the following pages.
 */
export default function UserAuditCard({ userId, refreshKey }: UserAuditCardProps) {
  const [entries, setEntries] = useState<UserAuditLogEntry[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    userService
      .getAuditLogs({ user_id: userId, page: 1, page_size: PAGE_SIZE })
      .then((data) => {
        if (cancelled) return;
        setEntries(data.results);
        setPagination(data.pagination);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(extractApiError(err, "Couldn't load the activity history."));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [userId, refreshKey, retryKey]);

  const hasMore = pagination !== null && pagination.page < pagination.total_pages;

  async function handleLoadMore() {
    if (!pagination || isLoadingMore) return;
    setIsLoadingMore(true);
    setError(null);
    try {
      const data = await userService.getAuditLogs({
        user_id: userId,
        page: pagination.page + 1,
        page_size: PAGE_SIZE,
      });
      setEntries((current) => [...current, ...data.results]);
      setPagination(data.pagination);
    } catch (err) {
      setError(extractApiError(err, "Couldn't load more activity."));
    } finally {
      setIsLoadingMore(false);
    }
  }

  return (
    <RecordSection title="Activity history">
      <div className="space-y-3 sm:col-span-2">
        {error && (
          <div className="flex items-center justify-between gap-3 rounded-md border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger">
            <p>{error}</p>
            <button
              type="button"
              onClick={() => setRetryKey((value) => value + 1)}
              className="shrink-0 rounded-md border border-danger/30 px-2.5 py-1 text-xs font-semibold transition hover:bg-surface"
            >
              Retry
            </button>
          </div>
        )}

        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-10 animate-shimmer rounded-md" />
            ))}
          </div>
        ) : entries.length === 0 ? (
          !error && <p className="text-sm text-ink-soft">No recorded activity for this account yet.</p>
        ) : (
          <ul className="divide-y divide-line">
            {entries.map((entry) => {
              const detail = describeAuditMetadata(entry);
              return (
                <li key={entry.id} className="py-2.5 first:pt-0 last:pb-0">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                    <p className="text-sm font-medium text-fg">{auditActionLabel(entry.action)}</p>
                    <p className="text-xs text-ink-soft">{formatDateTime(entry.created_at) || "-"}</p>
                  </div>
                  <p className="text-xs text-ink-soft">by {entry.actor_email || "unknown"}</p>
                  {detail && <p className="mt-0.5 break-words text-xs text-fg">{detail}</p>}
                </li>
              );
            })}
          </ul>
        )}

        {!isLoading && hasMore && (
          <button
            type="button"
            onClick={handleLoadMore}
            disabled={isLoadingMore}
            className="flex items-center gap-2 text-xs font-semibold text-slate hover:text-fg disabled:opacity-60"
          >
            {isLoadingMore && <Spinner size="sm" />}
            Show more
          </button>
        )}
      </div>
    </RecordSection>
  );
}
