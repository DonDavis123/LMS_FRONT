"use client";

import { useEffect, useState } from "react";
import UserAuditTimeline from "@/features/users/components/UserAuditTimeline";
import { userService } from "@/features/users/services/userService";
import type { UserAuditLogEntry } from "@/features/users/types/user.types";
import Modal from "@/shared/components/Modal";
import Spinner from "@/shared/components/Spinner";
import type { PaginationMeta } from "@/shared/types/pagination";
import { extractApiError } from "@/shared/utils/apiError";

interface UserHistoryDialogProps {
  isOpen: boolean;
  userId: string;
  userLabel: string;
  onClose: () => void;
}

const PAGE_SIZE = 10;

/**
 * GET /users/audit-logs/?user_id=… shown as a timeline. `Modal` only mounts
 * its children while open, so the history is fetched fresh on every open and
 * never goes stale after an edit, block or password reset.
 */
export default function UserHistoryDialog({ isOpen, userId, userLabel, onClose }: UserHistoryDialogProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidthClass="max-w-xl" ariaLabelledBy="user-history-title">
      <HistoryContent userId={userId} userLabel={userLabel} />
    </Modal>
  );
}

function HistoryContent({ userId, userLabel }: Pick<UserHistoryDialogProps, "userId" | "userLabel">) {
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
  }, [userId, retryKey]);

  const hasMore = pagination !== null && pagination.page < pagination.total_pages;

  async function handleLoadMore() {
    if (!pagination || isLoadingMore) return;
    setIsLoadingMore(true);
    setError(null);
    try {
      const data = await userService.getAuditLogs({ user_id: userId, page: pagination.page + 1, page_size: PAGE_SIZE });
      setEntries((current) => [...current, ...data.results]);
      setPagination(data.pagination);
    } catch (err) {
      setError(extractApiError(err, "Couldn't load more activity."));
    } finally {
      setIsLoadingMore(false);
    }
  }

  return (
    <div className="flex min-h-0 flex-col">
      <div className="border-b border-line p-5">
        <h2 id="user-history-title" className="pr-6 text-base font-semibold text-fg">
          Activity history
        </h2>
        <p className="mt-1 truncate text-sm text-ink-soft">Changes made to {userLabel}, newest first.</p>
      </div>

      <div className="min-h-0 space-y-4 overflow-y-auto p-5">
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
          <div className="space-y-4" aria-label="Loading history">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex gap-3">
                <div className="h-3 w-[4.25rem] animate-shimmer rounded" />
                <div className="h-8 w-8 shrink-0 animate-shimmer rounded-full" />
                <div className="h-10 flex-1 animate-shimmer rounded-md" />
              </div>
            ))}
          </div>
        ) : entries.length === 0 ? (
          !error && <p className="py-10 text-center text-sm text-ink-soft">No recorded activity for this account yet.</p>
        ) : (
          <UserAuditTimeline entries={entries} />
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
    </div>
  );
}
