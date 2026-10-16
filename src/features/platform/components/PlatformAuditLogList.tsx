"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import {
  PLATFORM_AUDIT_ACTIONS,
  type PlatformAuditAction,
  type PlatformAuditLogEntry,
} from "@/features/platform/types/platform.types";
import {
  describePlatformAuditMetadata,
  platformAuditActionLabel,
} from "@/features/platform/utils/platformLabels";
import Select from "@/shared/components/Select";
import ServerPagination from "@/shared/components/ServerPagination";
import type { PaginationMeta } from "@/shared/types/pagination";
import { formatDateTime } from "@/shared/utils/formatDate";

interface PlatformAuditLogListProps {
  entries: PlatformAuditLogEntry[];
  isLoading: boolean;
  error: string | null;
  /** `""` means every action. */
  action: PlatformAuditAction | "";
  onActionChange: (action: PlatformAuditAction | "") => void;
  /** `""` means every company. */
  companyId: string;
  companyOptions: { value: string; label: string }[];
  onCompanyChange: (companyId: string) => void;
  /** company id → name for the "Company" column; unknown ids fall back to a short id. */
  companyNames: Record<string, string>;
  pageSize: number;
  pagination: PaginationMeta;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  onRetry: () => void;
}

/**
 * Platform-wide audit trail (GET /platform/audit-logs/): who changed which
 * company or company user, newest first, filterable by company and action.
 */
export default function PlatformAuditLogList({
  entries,
  isLoading,
  error,
  action,
  onActionChange,
  companyId,
  companyOptions,
  onCompanyChange,
  companyNames,
  pageSize,
  pagination,
  onPageChange,
  onPageSizeChange,
  onRetry,
}: PlatformAuditLogListProps) {
  const hasFilter = Boolean(action || companyId);

  return (
    <div className="lp-list-page lp-list-wrap gap-3">
      <Link
        href={companyId ? `/platform/companies/${companyId}` : "/platform/companies"}
        className="inline-flex shrink-0 items-center gap-1 self-start text-sm text-slate hover:text-fg"
      >
        <ArrowLeft size={14} />
        {companyId ? "Back to company" : "Back to companies"}
      </Link>

      <div className="lp-card lp-list-page">
        <div className="lp-list-head flex flex-wrap items-center justify-between gap-3 border-b border-line bg-surface px-3 py-2.5 sm:px-4">
          <div>
            <h1 className="font-serif text-lg leading-tight text-fg">Platform audit log</h1>
            <p className="text-xs text-ink-soft">
              {pagination.total} recorded {pagination.total === 1 ? "change" : "changes"}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2">
              <span className="text-xs font-medium text-ink-soft">Company</span>
              <Select
                value={companyId}
                onChange={onCompanyChange}
                ariaLabel="Filter by company"
                size="sm"
                className="min-w-44"
                options={[{ value: "", label: "All companies" }, ...companyOptions]}
              />
            </label>

            <label className="flex items-center gap-2">
              <span className="text-xs font-medium text-ink-soft">Action</span>
              <Select
                value={action}
                onChange={(next) => onActionChange(next as PlatformAuditAction | "")}
                ariaLabel="Filter by action"
                size="sm"
                className="min-w-48"
                options={[
                  { value: "", label: "All actions" },
                  ...PLATFORM_AUDIT_ACTIONS.map((value) => ({ value, label: platformAuditActionLabel(value) })),
                ]}
              />
            </label>
          </div>
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
                {hasFilter
                  ? "Nothing matches these filters. Try another company or action."
                  : "Changes to companies and their users will show up here."}
              </p>
            </div>
          )
        ) : (
          <>
            <div className="lp-table-scroll">
              <table className="w-full min-w-[860px] text-left text-sm">
                <thead>
                  <tr className="border-b border-line text-xs font-semibold uppercase tracking-wide text-ink-soft">
                    <th className="px-4 py-3">When</th>
                    <th className="px-4 py-3">Action</th>
                    <th className="px-4 py-3">Company</th>
                    <th className="px-4 py-3">User</th>
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
                      <td className="px-4 py-3 font-medium text-fg">{platformAuditActionLabel(entry.action)}</td>
                      <td className="px-4 py-3">
                        {entry.company_id ? (
                          <Link
                            href={`/platform/companies/${entry.company_id}`}
                            className="break-words text-slate hover:underline"
                          >
                            {companyNames[entry.company_id] ?? `${entry.company_id.slice(0, 8)}…`}
                          </Link>
                        ) : (
                          <span className="text-ink-soft">-</span>
                        )}
                      </td>
                      <td className="break-all px-4 py-3 text-ink-soft">{entry.target_email || "-"}</td>
                      <td className="px-4 py-3 text-ink-soft">{entry.actor_email || "unknown"}</td>
                      <td className="break-words px-4 py-3 text-fg">{describePlatformAuditMetadata(entry) ?? "-"}</td>
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
