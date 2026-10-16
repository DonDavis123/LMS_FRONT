"use client";

import { Fragment, type ReactNode } from "react";
import Link from "next/link";
import { RefreshCw, UserPlus } from "lucide-react";
import type { AuthUser } from "@/features/auth/types/auth.types";
import type { AsyncState, MyTasksData, ScheduleItem } from "@/features/dashboard/types/dashboard.types";
import {
  buildSummaryParts,
  diffInDays,
  firstNameOf,
  greetingFor,
  groupTasksByDue,
} from "@/features/dashboard/utils/dashboardMetrics";
import { formatDateTime, formatRelativeTime } from "@/shared/utils/formatDate";

interface DashboardHeroProps {
  user: AuthUser | null;
  tasks: AsyncState<MyTasksData> | null;
  schedule: AsyncState<ScheduleItem[]>;
  completingIds: ReadonlySet<string>;
  updatedAt: number | null;
  isRefreshing: boolean;
  onRefresh: () => void;
}

const GENERIC_SUMMARY = "A focused view of your pipeline, activity and recent opportunities.";

/** "a" · "a and b" · "a, b and c" — each part keeps the separator that precedes it. */
function withSeparators(parts: string[]): { text: string; separator: string }[] {
  return parts.map((text, index) => ({
    text,
    separator: index === 0 ? "" : index === parts.length - 1 ? " and " : ", ",
  }));
}

export default function DashboardHero({ user, tasks, schedule, completingIds, updatedAt, isRefreshing, onRefresh }: DashboardHeroProps) {
  const now = new Date();
  const updatedIso = updatedAt === null ? null : new Date(updatedAt).toISOString();

  let summary: ReactNode = GENERIC_SUMMARY;
  let isSummaryLoading = false;

  if (user && tasks) {
    if (tasks.status === "loading" || schedule.status === "loading") {
      isSummaryLoading = true;
    } else if (tasks.status === "ready") {
      const groups = groupTasksByDue(tasks.data.tasks.filter((task) => !completingIds.has(task.id)), now);
      const meetingsToday =
        schedule.status === "ready"
          ? schedule.data.filter((item) => item.kind === "Meeting" && diffInDays(item.start, now) === 0 && item.end.getTime() > now.getTime()).length
          : 0;
      const parts = buildSummaryParts(groups.today.length, groups.overdue.length, meetingsToday);

      summary =
        parts.length === 0 ? (
          "You're all caught up — no tasks due today."
        ) : (
          <>
            You have{" "}
            {withSeparators(parts).map((part) => (
              <Fragment key={part.text}>
                {part.separator}
                <strong className="font-semibold text-fg">{part.text}</strong>
              </Fragment>
            ))}
            .
          </>
        );
    }
  }

  return (
    <div className="animate-fade-in-up relative overflow-hidden rounded-2xl border border-line bg-surface p-4 shadow-sm sm:p-6">
      <div className="pointer-events-none absolute -right-12 -top-16 h-40 w-40 rounded-full bg-amber/10 blur-3xl dark:hidden" />
      <div className="relative flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.2em] text-amber-dark">LeadPulse workspace</p>
          <h1 className="font-serif text-2xl tracking-tight text-fg sm:text-3xl">
            {greetingFor(now)}, {firstNameOf(user?.name)}.
          </h1>
          {isSummaryLoading ? (
            <div className="mt-2 h-5 w-full max-w-sm animate-shimmer rounded" aria-busy="true" aria-label="Loading summary" />
          ) : (
            <p className="mt-1 max-w-xl text-sm text-ink-soft" aria-live="polite">
              {summary}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <Link
            href="/dashboard/leads/new"
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-ink px-4 text-sm font-medium text-white outline-none transition hover:bg-ink-2 focus-visible:ring-2 focus-visible:ring-slate focus-visible:ring-offset-2 focus-visible:ring-offset-surface active:scale-[0.98] dark:bg-slate"
          >
            <UserPlus size={15} aria-hidden="true" />
            New lead
          </Link>
          <button
            type="button"
            onClick={onRefresh}
            disabled={isRefreshing}
            aria-label="Refresh dashboard"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-line bg-surface text-ink-soft outline-none transition hover:bg-paper hover:text-fg focus-visible:ring-2 focus-visible:ring-slate disabled:cursor-wait"
          >
            <RefreshCw size={16} className={isRefreshing ? "animate-spin" : ""} aria-hidden="true" />
          </button>
          {updatedIso && (
            <span className="text-xs text-ink-soft" title={formatDateTime(updatedIso)}>
              Updated {formatRelativeTime(updatedIso)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
