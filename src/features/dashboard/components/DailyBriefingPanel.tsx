"use client";

import { useMemo } from "react";
import Link from "next/link";
import { AlertCircle, CalendarClock, Lightbulb, RefreshCw, Sparkles } from "lucide-react";
import Spinner from "@/shared/components/Spinner";
import type { BriefingTask, DailyBriefing } from "@/features/dashboard/types/dailyBriefing.types";
import {
  BRIEFING_BUCKETS,
  briefingDueLabel,
  briefingPriorityDot,
  groupByBucket,
} from "@/features/dashboard/utils/dailyBriefingMetrics";
import { formatClock, TONE_TEXT } from "@/features/dashboard/utils/dashboardMetrics";

interface DailyBriefingPanelProps {
  /** Id of the region, so the toggle button can point at it with `aria-controls`. */
  id: string;
  briefing: DailyBriefing | null;
  loading: boolean;
  error: string | null;
  onGenerate: () => void;
}

/**
 * The AI "plan my day" panel, shown inside the dashboard greeting card.
 *
 * It lists the user's tasks in the order to do them (grouped as "Do first",
 * "Then, today" and "Can wait"), each with a one-line reason, plus a few
 * heads-ups such as a meeting that squeezes the afternoon. Counts, subjects and
 * dates come from the backend's own data; only the order, the reasons and the
 * headline are written by the model.
 */
export default function DailyBriefingPanel({ id, briefing, loading, error, onGenerate }: DailyBriefingPanelProps) {
  const groups = useMemo(() => groupByBucket(briefing?.priorities ?? []), [briefing]);
  const now = useMemo(() => new Date(), [briefing]);

  return (
    <section id={id} aria-label="Your plan for today" aria-busy={loading} className="animate-fade-in relative mt-3 border-t border-line pt-3">
      <div className="flex items-center gap-2.5">
        <span aria-hidden="true" className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-slate-light text-slate">
          <Sparkles size={14} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold leading-tight text-fg">Plan for today</h2>
          <p className="truncate text-xs leading-snug text-ink-soft">
            {loading
              ? "Reading your tasks and meetings…"
              : briefing
                ? `Written at ${formatClock(new Date(briefing.generated_at))}`
                : "What to do first, and why."}
          </p>
        </div>
        {briefing && (
          <button
            type="button"
            onClick={onGenerate}
            disabled={loading}
            title="Write a new plan from your current tasks."
            className="flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-line px-2.5 text-xs font-semibold text-fg outline-none transition hover:bg-paper focus-visible:ring-2 focus-visible:ring-slate disabled:opacity-60"
          >
            {loading ? <Spinner size="sm" /> : <RefreshCw size={13} aria-hidden="true" />}
            {loading ? "Updating…" : "Refresh"}
          </button>
        )}
      </div>

      {loading && !briefing && (
        <div className="mt-3 space-y-2" aria-hidden="true">
          <div className="h-3.5 w-4/5 animate-shimmer rounded-md" />
          <div className="h-3.5 w-3/5 animate-shimmer rounded-md" />
          <div className="h-3.5 w-2/3 animate-shimmer rounded-md" />
        </div>
      )}

      {error && (
        <div role="alert" className="mt-3 flex items-center gap-2 rounded-lg border border-danger/20 bg-danger-soft px-3 py-2 text-xs text-danger">
          <AlertCircle size={14} className="shrink-0" aria-hidden="true" />
          <span className="min-w-0 flex-1">{error}</span>
          <button
            type="button"
            onClick={onGenerate}
            disabled={loading}
            className="shrink-0 font-semibold underline underline-offset-2 outline-none focus-visible:ring-2 focus-visible:ring-danger disabled:opacity-60"
          >
            Retry
          </button>
        </div>
      )}

      {briefing && (
        <div className={`mt-3 transition-opacity ${loading ? "opacity-60" : ""}`}>
          <p className="text-sm font-medium leading-relaxed text-fg">{briefing.headline}</p>

          <ul className="mt-2.5 flex flex-wrap gap-1.5 text-xs" aria-label="Today at a glance">
            <CountChip
              value={briefing.counts.overdue_tasks}
              label="overdue"
              tone={briefing.counts.overdue_tasks > 0 ? "danger" : undefined}
            />
            <CountChip value={briefing.counts.due_today_tasks} label="due today" />
            <CountChip value={briefing.counts.meetings_today} label={briefing.counts.meetings_today === 1 ? "meeting left" : "meetings left"} />
          </ul>

          {briefing.priorities.length > 0 && (
            <div className="mt-3 space-y-3">
              {BRIEFING_BUCKETS.map((bucket) =>
                groups[bucket.value].length === 0 ? null : (
                  <div key={bucket.value}>
                    <h3 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-ink-soft">
                      <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full" style={{ background: bucket.dot }} />
                      {bucket.label}
                      <span className="font-medium normal-case tracking-normal">· {bucket.hint}</span>
                    </h3>
                    <ol className="mt-1 divide-y divide-line">
                      {groups[bucket.value].map((task) => (
                        <PlanRow key={task.task_id} task={task} now={now} muted={bucket.value === "can_wait"} />
                      ))}
                    </ol>
                  </div>
                ),
              )}
            </div>
          )}

          {briefing.heads_up.length > 0 && (
            <div className="mt-3 rounded-lg bg-paper px-3 py-2.5">
              <h3 className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-ink-soft">
                <Lightbulb size={12} aria-hidden="true" />
                Heads up
              </h3>
              <ul className="mt-1.5 space-y-1">
                {briefing.heads_up.map((note, index) => (
                  <li key={index} className="flex items-start gap-2 text-[13px] leading-snug text-fg">
                    <CalendarClock size={13} className="mt-0.5 shrink-0 text-slate" aria-hidden="true" />
                    <span className="min-w-0 flex-1">{note}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <p className="mt-2.5 text-[11px] leading-snug text-ink-soft">
            {briefing.counts.open_tasks_total > briefing.counts.tasks_considered
              ? `Based on your ${briefing.counts.tasks_considered} soonest-due of ${briefing.counts.open_tasks_total} open tasks`
              : `Based on your ${briefing.counts.open_tasks_total} open ${briefing.counts.open_tasks_total === 1 ? "task" : "tasks"}`}
            {briefing.model_name ? " · AI-written, check important details." : "."}
          </p>
        </div>
      )}
    </section>
  );
}

function CountChip({ value, label, tone }: { value: number; label: string; tone?: "danger" }) {
  return (
    <li
      className="inline-flex items-center gap-1 rounded-full border border-line bg-paper px-2.5 py-1 text-ink-soft"
      style={tone === "danger" ? { color: TONE_TEXT.danger } : undefined}
    >
      <span className="font-semibold tabular-nums text-fg" style={tone === "danger" ? { color: TONE_TEXT.danger } : undefined}>
        {value}
      </span>
      {label}
    </li>
  );
}

function PlanRow({ task, now, muted }: { task: BriefingTask; now: Date; muted: boolean }) {
  const due = briefingDueLabel(task, now);

  return (
    <li className="flex items-start gap-2.5 py-2">
      <span
        aria-hidden="true"
        className={`mt-px grid h-5 w-5 shrink-0 place-items-center rounded-full text-[10px] font-semibold tabular-nums ${
          muted ? "border border-line bg-paper text-ink-soft" : "bg-ink text-white dark:ring-1 dark:ring-white/20"
        }`}
      >
        {task.rank}
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3">
          <Link
            href={`/dashboard/tasks/${task.task_id}`}
            title={task.subject}
            className="min-w-0 max-w-full truncate rounded text-sm font-medium text-fg outline-none hover:text-slate focus-visible:ring-2 focus-visible:ring-slate"
          >
            {task.subject}
          </Link>
          <span
            className="shrink-0 text-xs font-medium tabular-nums text-ink-soft"
            style={due.overdue ? { color: TONE_TEXT.danger } : undefined}
          >
            {due.text}
          </span>
        </div>

        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-soft">
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full" style={{ background: briefingPriorityDot(task.priority) }} />
            {task.priority}
          </span>
          {task.status !== "Not Started" && <span>· {task.status}</span>}
          {task.related_to && (
            <span className="max-w-[10rem] truncate rounded-full bg-paper px-2 py-0.5" title={task.related_to}>
              {task.related_to}
            </span>
          )}
        </div>

        {task.reason && <p className="mt-1 text-[13px] leading-snug text-ink-soft">{task.reason}</p>}
      </div>
    </li>
  );
}
