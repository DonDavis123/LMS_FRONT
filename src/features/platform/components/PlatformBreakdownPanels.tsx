"use client";

import Link from "next/link";
import { Building2, Users } from "lucide-react";
import WidgetCard, { WidgetEmpty } from "@/features/dashboard/components/WidgetCard";
import { formatPercent } from "@/features/dashboard/utils/dashboardMetrics";
import CompanyStatusBadge from "@/features/platform/components/CompanyStatusBadge";
import type { RoleCount, TopCompany } from "@/features/platform/types/platform.types";
import { roleLabel } from "@/features/users/utils/userLabels";

type WidgetStatus = "loading" | "error" | "ready";

interface PanelProps {
  status: WidgetStatus;
  error?: string;
  onRetry: () => void;
  delay?: number;
}

const BODY_HEIGHT = 260;
const ROLE_COLORS = ["var(--color-fg)", "var(--color-slate)", "var(--color-amber)", "var(--color-success)", "var(--color-ink-soft)"];

/** Horizontal bars: company users per role. */
export function UsersByRolePanel({ data, status, error, onRetry, delay }: PanelProps & { data: RoleCount[] }) {
  const total = data.reduce((sum, row) => sum + row.count, 0);
  const max = Math.max(1, ...data.map((row) => row.count));

  return (
    <WidgetCard
      title="Users by role"
      subtitle={status === "ready" ? `${total.toLocaleString()} company ${total === 1 ? "user" : "users"}` : undefined}
      status={status}
      error={error}
      onRetry={onRetry}
      minHeight={BODY_HEIGHT}
      delay={delay}
    >
      {data.length === 0 ? (
        <WidgetEmpty minHeight={BODY_HEIGHT} icon={<Users size={20} aria-hidden="true" />} title="No users yet" hint="Roles appear here once companies add users." />
      ) : (
        <ul className="space-y-4 px-4 py-5 sm:px-5" style={{ minHeight: BODY_HEIGHT }}>
          {data.map((row, index) => (
            <li key={row.role}>
              <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
                <span className="truncate text-fg">{roleLabel(row.role)}</span>
                <span className="shrink-0 tabular-nums">
                  <span className="font-semibold text-fg">{row.count.toLocaleString()}</span>
                  <span className="ml-2 text-xs text-ink-soft">{formatPercent(row.count, total)}</span>
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-paper" role="presentation">
                <div
                  className="h-full rounded-full transition-[width] duration-700 ease-out"
                  style={{ width: `${(row.count / max) * 100}%`, background: ROLE_COLORS[index % ROLE_COLORS.length] }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </WidgetCard>
  );
}

/** Ranked list: the five companies with the most users. */
export function TopCompaniesPanel({ data, status, error, onRetry, delay }: PanelProps & { data: TopCompany[] }) {
  const max = Math.max(1, ...data.map((row) => row.users_count));

  return (
    <WidgetCard
      title="Top companies"
      subtitle="Ranked by number of users"
      link={{ href: "/platform/companies", label: "View all →" }}
      status={status}
      error={error}
      onRetry={onRetry}
      minHeight={BODY_HEIGHT}
      delay={delay}
    >
      {data.length === 0 ? (
        <WidgetEmpty minHeight={BODY_HEIGHT} icon={<Building2 size={20} aria-hidden="true" />} title="No companies yet" hint="The busiest companies appear here." />
      ) : (
        <ol className="divide-y divide-line" style={{ minHeight: BODY_HEIGHT }}>
          {data.map((company, index) => (
            <li key={company.id}>
              <Link
                href={`/platform/companies/${company.id}`}
                className="group flex items-center gap-3 px-4 py-3 outline-none transition-colors hover:bg-paper focus-visible:bg-paper focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-slate sm:px-5"
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-light text-xs font-semibold tabular-nums text-fg">
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-semibold text-fg">{company.name}</p>
                    <span className="shrink-0 text-sm font-semibold tabular-nums text-fg">{company.users_count.toLocaleString()}</span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-paper">
                    <div className="h-full rounded-full bg-slate transition-[width] duration-700 ease-out" style={{ width: `${(company.users_count / max) * 100}%` }} />
                  </div>
                </div>
                <span className="hidden shrink-0 sm:block">
                  <CompanyStatusBadge status={company.status} />
                </span>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </WidgetCard>
  );
}
