"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { USER_AUDIT_ACTIONS, type UserAuditAction, type UserAuditLogEntry } from "@/features/users/types/user.types";
import { auditActionLabel, describeAuditMetadata } from "@/features/users/utils/userLabels";
import ServerPagination from "@/shared/components/ServerPagination";
import type { PaginationMeta } from "@/shared/types/pagination";
import { formatDateTime } from "@/shared/utils/formatDate";
import Select from "@/shared/components/Select";

interface UserAuditLogListProps {
  entries: UserAuditLogEntry[];
  isLoading: boolean;
  error: string | null;
  /** `""` means every action. */
  action: UserAuditAction | "";
  onActionChange: (action: UserAuditAction | "") => void;
  pageSize: number;
  pagination: PaginationMeta;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  onRetry: () => void;
}

/**
 * Account-wide activity log (GET /users/audit-logs/ without `user_id`):
 * who changed which account, newest first, filterable by action.
 */
export default function UserAuditLogList({
  entries,
  isLoading,
  error,
  action,
  onActionChange,
  pageSize,
  pagination,
  onPageChange,
  onPageSizeChange,
  onRetry,
}: UserAuditLogListProps) {
  return (
    <div className="space-y-3">
      <Link href="/dashboard/users" className="inline-flex items-center gap-1 text-sm text-slate hover:text-fg">
        <ArrowLeft size={14} />
        Back to users
      </Link>

      <div className="lp-card overflow-hidden">
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-line bg-surface/80 p-5 backdrop-blur-sm">
          <div>
            <h1 className="font-serif text-xl text-fg">User activity log</h1>
            <p className="text-sm text-ink-soft">
              {pagination.total} recorded {pagination.total === 1 ? "change" : "changes"}
            </p>
          </div>

          <label className="block">
            <span className="mb-1 block text-xs font-medium text-ink-soft">Action</span>
            <Select
              value={action}
              onChange={(next) => onActionChange(next as UserAuditAction | "")}
              ariaLabel="Filter by action"
              size="sm"
              className="min-w-48"
              options={[
                { value: "", label: "All actions" },
                ...USER_AUDIT_ACTIONS.map((value) => ({ value, label: auditActionLabel(value) })),
              ]}
            />
          </label>
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
        ) : entries.length === 0 ? (
          !error && (
            <div className="flex flex-col items-center gap-2 px-4 py-16 text-center animate-scale-in">
              <p className="font-serif text-lg text-fg">No activity found</p>
              <p className="max-w-sm text-sm text-ink-soft">
                {action ? "Nothing matches this action. Try another one." : "Changes to user accounts will show up here."}
              </p>
            </div>
          )
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead>
                  <tr className="border-b border-line text-xs font-semibold uppercase tracking-wide text-ink-soft">
                    <th className="px-4 py-3">When</th>
                    <th className="px-4 py-3">Action</th>
                    <th className="px-4 py-3">Account</th>
                    <th className="px-4 py-3">By</th>
                    <th className="px-4 py-3">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry) => (
                    <tr key={entry.id} className="border-b border-line align-top last:border-0">
                      <td className="whitespace-nowrap px-4 py-3 text-ink-soft">
                        {formatDateTime(entry.created_at) || "-"}
                      </td>
                      <td className="px-4 py-3 font-medium text-fg">{auditActionLabel(entry.action)}</td>
                      <td className="px-4 py-3">
                        {entry.target_user_id ? (
                          <Link
                            href={`/dashboard/users/${entry.target_user_id}`}
                            className="break-all text-slate hover:underline"
                          >
                            {entry.target_email || entry.target_user_id}
                          </Link>
                        ) : (
                          <span className="text-ink-soft">{entry.target_email || "-"}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-ink-soft">{entry.actor_email || "unknown"}</td>
                      <td className="break-words px-4 py-3 text-fg">{describeAuditMetadata(entry) ?? "-"}</td>
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
    </div>
  );
}
