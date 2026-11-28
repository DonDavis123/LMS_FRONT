"use client";

import { Fragment, useId, useState, type ReactNode } from "react";
import Link from "next/link";
import { Sparkles, UserPlus } from "lucide-react";
import type { AuthUser } from "@/features/auth/types/auth.types";
import DailyBriefingPanel from "@/features/dashboard/components/DailyBriefingPanel";
import { useDailyBriefing } from "@/features/dashboard/hooks/useDailyBriefing";
import type { AsyncState, MyTasksData, ScheduleItem } from "@/features/dashboard/types/dashboard.types";
import Spinner from "@/shared/components/Spinner";
import {
  buildSummaryParts,
  diffInDays,
  firstNameOf,
  greetingFor,
  groupTasksByDue,
} from "@/features/dashboard/utils/dashboardMetrics";

interface DashboardHeroProps {
  user: AuthUser | null;
  tasks: AsyncState<MyTasksData> | null;
  schedule: AsyncState<ScheduleItem[]>;
  completingIds: ReadonlySet<string>;
}

const GENERIC_SUMMARY = "A focused view of your pipeline, activity and recent opportunities.";

/** "a" · "a and b" · "a, b and c" — each part keeps the separator that precedes it. */
function withSeparators(parts: string[]): { text: string; separator: string }[] {
  return parts.map((text, index) => ({
    text,
    separator: index === 0 ? "" : index === parts.length - 1 ? " and " : ", ",
  }));
}

export default function DashboardHero({ user, tasks, schedule, completingIds }: DashboardHeroProps) {
  const now = new Date();
  const { briefing, loading: briefingLoading, error: briefingError, generate: generateBriefing } = useDailyBriefing();
  const [briefingOpen, setBriefingOpen] = useState(false);
  const briefingPanelId = useId();
  const hasBriefingResult = briefing !== null || briefingError !== null;

  // First click writes the plan (one model request); after that it only shows / hides it.
  function handlePlanClick() {
    if (briefingLoading) return;
    if (hasBriefingResult) {
      setBriefingOpen((open) => !open);
      return;
    }
    setBriefingOpen(true);
    void generateBriefing();
  }

  const planLabel = briefingLoading
    ? "Planning…"
    : hasBriefingResult
      ? briefingOpen
        ? "Hide plan"
        : "Show plan"
      : "Plan my day";

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
    <div className="animate-fade-in-up relative overflow-hidden rounded-2xl border border-line bg-surface px-4 py-3 shadow-sm sm:px-5 sm:py-3.5">
      <div className="pointer-events-none absolute -right-12 -top-16 h-40 w-40 rounded-full bg-amber/10 blur-3xl dark:hidden" />
      <div className="relative flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase leading-none tracking-[0.2em] text-amber-dark">LeadPulse workspace</p>
          <h1 className="mt-1 font-serif text-xl leading-tight tracking-tight text-fg sm:text-2xl">
            {greetingFor(now)}, {firstNameOf(user?.name)}.
          </h1>
          {isSummaryLoading ? (
            <div className="mt-1.5 h-4 w-full max-w-sm animate-shimmer rounded" aria-busy="true" aria-label="Loading summary" />
          ) : (
            <p className="mt-0.5 max-w-xl text-sm text-ink-soft" aria-live="polite">
              {summary}
            </p>
          )}
        </div>

        <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-wrap sm:items-center">
          {user && (
            <button
              type="button"
              onClick={handlePlanClick}
              disabled={briefingLoading}
              aria-expanded={briefingOpen}
              aria-controls={briefingPanelId}
              title="Let AI sort today's tasks and meetings by what to do first."
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-line bg-surface px-4 sm:h-10 text-sm font-medium text-fg outline-none transition hover:bg-paper focus-visible:ring-2 focus-visible:ring-slate focus-visible:ring-offset-2 focus-visible:ring-offset-surface active:scale-[0.98] disabled:opacity-60"
            >
              {briefingLoading ? <Spinner size="sm" /> : <Sparkles size={15} aria-hidden="true" />}
              {planLabel}
            </button>
          )}

          <Link
            href="/dashboard/leads/new"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-ink px-4 sm:h-10 text-sm font-medium text-white outline-none transition hover:bg-ink-2 focus-visible:ring-2 focus-visible:ring-slate focus-visible:ring-offset-2 focus-visible:ring-offset-surface active:scale-[0.98] dark:bg-slate"
          >
            <UserPlus size={15} aria-hidden="true" />
            New lead
          </Link>
        </div>
      </div>

      {user && briefingOpen && (
        <DailyBriefingPanel
          id={briefingPanelId}
          briefing={briefing}
          loading={briefingLoading}
          error={briefingError}
          onGenerate={() => void generateBriefing()}
        />
      )}
    </div>
  );
}
