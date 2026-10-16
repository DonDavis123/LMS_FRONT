"use client";

import type { ReactNode } from "react";
import { AlertCircle, CheckCircle2, Target, UserPlus, Users, type LucideIcon } from "lucide-react";
import Sparkline from "@/features/dashboard/components/charts/Sparkline";
import type { AsyncState, DashboardRange, DashboardStats as DashboardStatsData, Delta, MyTasksData } from "@/features/dashboard/types/dashboard.types";
import {
  computeDelta,
  describeDelta,
  formatPercent,
  groupTasksByDue,
  sumCounts,
  TONE_TEXT,
  type Tone,
} from "@/features/dashboard/utils/dashboardMetrics";
import { useCountUp } from "@/shared/hooks/useCountUp";

interface DashboardStatsProps {
  stats: AsyncState<DashboardStatsData>;
  /** null when the signed-in user is unknown (personal card is then hidden). */
  tasks: AsyncState<MyTasksData> | null;
  completingIds: ReadonlySet<string>;
  range: DashboardRange;
  onRetryStats: () => void;
  onRetryTasks: () => void;
}

interface CardModel {
  key: string;
  label: string;
  icon: LucideIcon;
  accent: string;
  value: number | null;
  delta: Delta | null;
  deltaTitle: string;
  sub: ReactNode;
  series: number[];
}

const WEEK = 7;

const EMPTY_TASK_CARD: CardModel = {
  key: "tasks",
  label: "My open tasks",
  icon: CheckCircle2,
  accent: "var(--color-ink)",
  value: null,
  delta: null,
  deltaTitle: "",
  sub: <span className="text-ink-soft">Personal view unavailable</span>,
  series: [],
};

function toneStyle(tone: Tone) {
  return { color: TONE_TEXT[tone] };
}

function buildStatCards(stats: DashboardStatsData, range: DashboardRange): CardModel[] {
  const { leads } = stats;
  const series = leads.created_per_day;
  const counts = series.map((item) => item.count);

  const lastWeek = sumCounts(series.slice(-WEEK));
  // A 7-day range has no earlier days in its series, so the API's previous-window count is used.
  const previousWeek = range === 7 ? leads.new_previous_range : sumCounts(series.slice(-WEEK * 2, -WEEK));
  const trustSeries = !stats.is_sampled || range === 7;

  const totalDelta = computeDelta(leads.new_in_range, leads.new_previous_range);
  const weekDelta = trustSeries ? computeDelta(lastWeek, previousWeek) : null;
  const preQualified = leads.by_status.find((item) => item.status === "Pre-Qualified")?.count ?? 0;

  return [
    {
      key: "total",
      label: "Total leads",
      icon: Users,
      accent: "var(--color-slate)",
      value: leads.total,
      delta: totalDelta,
      deltaTitle: totalDelta ? `New leads: ${describeDelta(totalDelta, `the previous ${range} days`)}` : "",
      sub: <span className="text-ink-soft">{leads.new_in_range} added in {range} days</span>,
      series: counts,
    },
    {
      key: "week",
      label: "New this week",
      icon: UserPlus,
      accent: "var(--color-amber)",
      value: lastWeek,
      delta: weekDelta,
      deltaTitle: weekDelta ? `New leads: ${describeDelta(weekDelta, "the previous 7 days")}` : "",
      sub: <span className="text-ink-soft">Last 7 days</span>,
      series: counts.slice(-WEEK),
    },
    {
      key: "qualified",
      label: "Pre-qualified",
      icon: Target,
      accent: "var(--color-success)",
      value: preQualified,
      delta: null,
      deltaTitle: "",
      sub: <span className="text-ink-soft">{formatPercent(preQualified, leads.total)} of all leads</span>,
      series: [],
    },
  ];
}

function buildTaskCard(data: MyTasksData, completingIds: ReadonlySet<string>): CardModel {
  const active = data.tasks.filter((task) => !completingIds.has(task.id));
  const completingInList = data.tasks.length - active.length;
  const overdue = groupTasksByDue(active).overdue.length;
  const truncated = data.total > data.tasks.length;
  const overdueText = truncated && overdue === active.length ? `${overdue}+ overdue` : `${overdue} overdue`;

  return {
    key: "tasks",
    label: "My open tasks",
    icon: CheckCircle2,
    accent: "var(--color-ink)",
    value: Math.max(0, data.total - completingInList),
    delta: null,
    deltaTitle: "",
    sub:
      overdue > 0 ? (
        <span className="font-medium" style={toneStyle("danger")}>
          {overdueText}
        </span>
      ) : (
        <span className="font-medium" style={toneStyle("success")}>
          None overdue
        </span>
      ),
    series: [],
  };
}

export default function DashboardStats({ stats, tasks, completingIds, range, onRetryStats, onRetryTasks }: DashboardStatsProps) {
  const statCards = stats.status === "ready" ? buildStatCards(stats.data, range) : null;
  const taskCard =
    tasks === null
      ? { ...EMPTY_TASK_CARD }
      : tasks.status === "ready"
        ? buildTaskCard(tasks.data, completingIds)
        : null;

  // Order: Total · New this week · My open tasks · Pre-qualified
  const slots: { key: string; card: CardModel | null; state: AsyncState<unknown> | null; retry: () => void }[] = [
    { key: "total", card: statCards?.[0] ?? null, state: stats, retry: onRetryStats },
    { key: "week", card: statCards?.[1] ?? null, state: stats, retry: onRetryStats },
    { key: "tasks", card: taskCard, state: tasks, retry: onRetryTasks },
    { key: "qualified", card: statCards?.[2] ?? null, state: stats, retry: onRetryStats },
  ];

  return (
    <div className="grid grid-cols-2 gap-2.5 sm:gap-4 lg:grid-cols-4" aria-label="Key figures">
      {slots.map((slot, index) =>
        slot.card ? (
          <StatCard key={slot.key} card={slot.card} delay={index * 60} />
        ) : (
          <PlaceholderCard key={slot.key} state={slot.state} onRetry={slot.retry} delay={index * 60} />
        ),
      )}
    </div>
  );
}

function DeltaChip({ delta, title }: { delta: Delta; title: string }) {
  const tone: Tone | null = delta.kind === "up" || delta.kind === "new" ? "success" : delta.kind === "down" ? "danger" : null;
  const text = delta.kind === "new" ? "New" : delta.kind === "flat" ? "— 0%" : `${delta.kind === "up" ? "▲" : "▼"} ${delta.percent}%`;

  return (
    <span
      title={title}
      aria-label={title}
      className="inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums"
      style={
        tone
          ? { ...toneStyle(tone), background: `color-mix(in srgb, var(--color-${tone}) 14%, transparent)` }
          : { background: "var(--color-paper)", color: "var(--color-ink-soft)" }
      }
    >
      {text}
    </span>
  );
}

function StatCard({ card, delay }: { card: CardModel; delay: number }) {
  const shown = useCountUp(card.value ?? 0);
  const Icon = card.icon;

  return (
    <div
      className="lp-card lp-kpi animate-fade-in-up relative flex min-h-[148px] cursor-default flex-col justify-between overflow-hidden p-3.5 sm:p-5"
      style={{ borderLeft: `3px solid ${card.accent}`, animationDelay: `${delay}ms` }}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-ink-soft">{card.label}</p>
        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
          style={{ background: `color-mix(in srgb, ${card.accent} 14%, transparent)`, color: "var(--color-fg)" }}
        >
          <Icon size={16} aria-hidden="true" />
        </span>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
        <p className="font-serif text-3xl tabular-nums text-fg" aria-hidden="true">
          {card.value === null ? "—" : shown}
        </p>
        <span className="sr-only" aria-live="polite">
          {card.label}: {card.value === null ? "not available" : card.value}
        </span>
        {card.delta && <DeltaChip delta={card.delta} title={card.deltaTitle} />}
      </div>
      <p className="mt-0.5 text-xs">{card.sub}</p>

      <div className="mt-2">
        <Sparkline values={card.series} color={card.accent === "var(--color-ink)" ? "var(--color-fg)" : card.accent} />
      </div>
    </div>
  );
}

function PlaceholderCard({ state, onRetry, delay }: { state: AsyncState<unknown> | null; onRetry: () => void; delay: number }) {
  if (state?.status === "error") {
    return (
      <div
        role="alert"
        className="lp-card animate-fade-in-up flex min-h-[148px] flex-col items-start justify-center gap-2 p-3.5 sm:p-5"
        style={{ animationDelay: `${delay}ms` }}
      >
        <AlertCircle size={18} className="text-danger" aria-hidden="true" />
        <p className="text-xs text-ink-soft">Couldn&apos;t load this figure.</p>
        <button
          type="button"
          onClick={onRetry}
          className="rounded text-xs font-medium text-slate outline-none hover:text-fg focus-visible:ring-2 focus-visible:ring-slate"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="lp-card animate-fade-in-up min-h-[148px] p-3.5 sm:p-5" style={{ animationDelay: `${delay}ms` }} aria-busy="true">
      <div className="h-3 w-20 animate-shimmer rounded" />
      <div className="mt-5 h-8 w-16 animate-shimmer rounded" />
      <div className="mt-4 h-8 w-full animate-shimmer rounded" />
    </div>
  );
}
