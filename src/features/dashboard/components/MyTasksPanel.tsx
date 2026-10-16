"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import Link from "next/link";
import { AlertCircle, Check, CheckCircle2 } from "lucide-react";
import WidgetCard, { WidgetEmpty } from "@/features/dashboard/components/WidgetCard";
import type { AsyncState, MyTasksData } from "@/features/dashboard/types/dashboard.types";
import {
  dueLabel,
  groupTasksByDue,
  priorityTone,
  taskRelatedName,
  TONE_TEXT,
  type PriorityTone,
} from "@/features/dashboard/utils/dashboardMetrics";
import type { Task } from "@/features/tasks/types/task.types";
import { extractApiError } from "@/shared/utils/apiError";

type TaskTab = "overdue" | "today" | "upcoming";

const TABS: { value: TaskTab; label: string }[] = [
  { value: "overdue", label: "Overdue" },
  { value: "today", label: "Today" },
  { value: "upcoming", label: "Upcoming" },
];

const EMPTY_COPY: Record<TaskTab, { title: string; hint: string }> = {
  overdue: { title: "Nothing overdue", hint: "You're all caught up." },
  today: { title: "Nothing due today", hint: "Enjoy the breathing room." },
  upcoming: { title: "No upcoming tasks", hint: "Tasks assigned to you will appear here." },
};

const MAX_ROWS = 8;
const BODY_HEIGHT = 340;
const LEAVE_MS = 200;
const TOAST_MS = 3500;

const PRIORITY_DOT: Record<PriorityTone, string> = {
  danger: "var(--color-danger)",
  slate: "var(--color-slate)",
  muted: "color-mix(in srgb, var(--color-ink-soft) 55%, transparent)",
};

interface MyTasksPanelProps {
  state: AsyncState<MyTasksData>;
  /** Tasks whose completion request is in flight (already excluded from counts). */
  completingIds: ReadonlySet<string>;
  /** Rejects when the server refuses; the hook has already rolled its state back. */
  onComplete: (task: Task) => Promise<void>;
  onRetry: () => void;
  delay?: number;
}

interface ToastState {
  kind: "success" | "error";
  message: string;
}

export default function MyTasksPanel({ state, completingIds, onComplete, onRetry, delay }: MyTasksPanelProps) {
  const [chosenTab, setChosenTab] = useState<TaskTab | null>(null);
  const [leaving, setLeaving] = useState<ReadonlySet<string>>(new Set());
  const [hidden, setHidden] = useState<ReadonlySet<string>>(new Set());
  const [toast, setToast] = useState<ToastState | null>(null);
  const tabRefs = useRef<Record<TaskTab, HTMLButtonElement | null>>({ overdue: null, today: null, upcoming: null });

  const data = state.status === "ready" ? state.data : null;
  const now = useMemo(() => new Date(), [data]);
  const groups = useMemo(() => groupTasksByDue(data?.tasks ?? [], now), [data, now]);

  const activeCount = (tab: TaskTab) => groups[tab].filter((task) => !completingIds.has(task.id)).length;
  const counts: Record<TaskTab, number> = { overdue: activeCount("overdue"), today: activeCount("today"), upcoming: activeCount("upcoming") };

  const firstFilled = TABS.find((tab) => counts[tab.value] > 0)?.value ?? "overdue";
  const tab = chosenTab ?? firstFilled;
  const rows = groups[tab].filter((task) => !hidden.has(task.id));
  const shownRows = rows.slice(0, MAX_ROWS);
  const moreCount = Math.max(0, counts[tab] - MAX_ROWS);
  const hasAnyOpen = counts.overdue + counts.today + counts.upcoming > 0;

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), TOAST_MS);
    return () => window.clearTimeout(timer);
  }, [toast]);

  function withId(set: ReadonlySet<string>, id: string, present: boolean): ReadonlySet<string> {
    const next = new Set(set);
    if (present) next.add(id);
    else next.delete(id);
    return next;
  }

  async function handleComplete(task: Task) {
    if (leaving.has(task.id) || completingIds.has(task.id)) return;
    setLeaving((current) => withId(current, task.id, true));
    const hideTimer = window.setTimeout(() => setHidden((current) => withId(current, task.id, true)), LEAVE_MS);

    try {
      await onComplete(task);
      setToast({ kind: "success", message: "Task completed" });
    } catch (error) {
      window.clearTimeout(hideTimer);
      setToast({ kind: "error", message: extractApiError(error, "Couldn't complete the task. It was restored.") });
    } finally {
      setLeaving((current) => withId(current, task.id, false));
      setHidden((current) => withId(current, task.id, false));
    }
  }

  function handleTabKey(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const last = TABS.length - 1;
    const next =
      event.key === "ArrowRight" ? (index === last ? 0 : index + 1)
      : event.key === "ArrowLeft" ? (index === 0 ? last : index - 1)
      : event.key === "Home" ? 0
      : event.key === "End" ? last
      : null;
    if (next === null) return;
    event.preventDefault();
    setChosenTab(TABS[next].value);
    tabRefs.current[TABS[next].value]?.focus();
  }

  return (
    <>
      <WidgetCard
        title="My tasks"
        subtitle="Assigned to you"
        link={{ href: "/dashboard/tasks", label: "View all tasks →" }}
        status={state.status}
        error={state.status === "error" ? state.message : undefined}
        onRetry={onRetry}
        minHeight={BODY_HEIGHT}
        delay={delay}
      >
        <div className="px-4 pt-3 sm:px-5">
          <div role="tablist" aria-label="Task due date" className="inline-flex max-w-full rounded-full border border-line bg-paper p-1">
            {TABS.map((item, index) => {
              const isActive = item.value === tab;
              return (
                <button
                  key={item.value}
                  ref={(node) => {
                    tabRefs.current[item.value] = node;
                  }}
                  type="button"
                  role="tab"
                  id={`my-tasks-tab-${item.value}`}
                  aria-selected={isActive}
                  aria-controls="my-tasks-panel"
                  tabIndex={isActive ? 0 : -1}
                  onClick={() => setChosenTab(item.value)}
                  onKeyDown={(event) => handleTabKey(event, index)}
                  className={`min-h-10 rounded-full border px-3 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-slate sm:px-4 ${
                    isActive ? "border-slate bg-slate-light text-fg" : "border-transparent text-ink-soft hover:text-fg"
                  }`}
                >
                  {item.label}{" "}
                  <span
                    className="tabular-nums"
                    style={item.value === "overdue" && counts.overdue > 0 ? { color: TONE_TEXT.danger } : undefined}
                  >
                    ({counts[item.value]})
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div role="tabpanel" id="my-tasks-panel" aria-labelledby={`my-tasks-tab-${tab}`} className="mt-2">
          {shownRows.length === 0 ? (
            <WidgetEmpty
              minHeight={BODY_HEIGHT - 64}
              icon={<CheckCircle2 size={22} aria-hidden="true" />}
              title={hasAnyOpen ? EMPTY_COPY[tab].title : "You have no open tasks"}
              hint={hasAnyOpen ? EMPTY_COPY[tab].hint : "You're all caught up."}
              action={hasAnyOpen ? undefined : { href: "/dashboard/tasks", label: "Open tasks →" }}
            />
          ) : (
            <ul className="divide-y divide-line">
              {shownRows.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  now={now}
                  isLeaving={leaving.has(task.id)}
                  onComplete={() => void handleComplete(task)}
                />
              ))}
            </ul>
          )}

          {(moreCount > 0 || (data && data.total > data.tasks.length)) && (
            <p className="border-t border-line px-4 py-2.5 text-xs text-ink-soft sm:px-5">
              {moreCount > 0 && (
                <>
                  +{moreCount} more —{" "}
                  <Link href="/dashboard/tasks" className="font-medium text-slate hover:text-fg">
                    View all tasks
                  </Link>
                  .{" "}
                </>
              )}
              {data && data.total > data.tasks.length && `Showing your first ${data.tasks.length} of ${data.total} open tasks.`}
            </p>
          )}
        </div>
      </WidgetCard>

      {/* Outside the card: its entrance animation leaves a transform that would trap `fixed`. */}
      <div role="status" aria-live="polite" className="sr-only">
        {toast?.message}
      </div>
      {toast && (
        <div
          aria-hidden="true"
          className={`animate-toast-in fixed bottom-6 right-4 z-[60] flex items-center gap-2 rounded-md border px-4 py-3 text-sm font-medium shadow-lg sm:right-6 ${
            toast.kind === "success" ? "border-success/30 bg-success-soft" : "border-danger/30 bg-danger-soft"
          }`}
          style={{ color: toast.kind === "success" ? TONE_TEXT.success : TONE_TEXT.danger }}
        >
          {toast.kind === "success" ? (
            <CheckCircle2 size={16} className="shrink-0 animate-pop-in" />
          ) : (
            <AlertCircle size={16} className="shrink-0" />
          )}
          {toast.message}
        </div>
      )}
    </>
  );
}

function TaskRow({ task, now, isLeaving, onComplete }: { task: Task; now: Date; isLeaving: boolean; onComplete: () => void }) {
  const due = dueLabel(task, now);
  const related = taskRelatedName(task);
  const tone = priorityTone(task.priority);

  return (
    <li className={`flex items-center gap-1 pl-1.5 pr-3 transition-colors hover:bg-paper sm:pl-3 sm:pr-5 ${isLeaving ? "animate-row-remove" : "animate-fade-in"}`}>
      <button
        type="button"
        role="checkbox"
        aria-checked={isLeaving}
        aria-label={`Mark "${task.subject}" as completed`}
        disabled={isLeaving}
        onClick={onComplete}
        className="group/check flex h-10 w-10 shrink-0 items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-slate disabled:cursor-wait"
      >
        <span
          className={`flex h-5 w-5 items-center justify-center rounded-full border-2 transition-colors ${
            isLeaving ? "border-success bg-success text-white" : "border-ink-soft/50 text-transparent group-hover/check:border-success group-hover/check:text-success"
          }`}
        >
          <Check size={12} strokeWidth={3} aria-hidden="true" />
        </span>
      </button>

      <Link
        href={`/dashboard/tasks/${task.id}`}
        className="flex min-w-0 flex-1 items-center gap-3 rounded py-2.5 outline-none focus-visible:ring-2 focus-visible:ring-slate"
      >
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-fg" title={task.subject}>
            {task.subject}
          </span>
          <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
            {related && (
              <span className="max-w-[10rem] truncate rounded-full bg-paper px-2 py-0.5 text-ink-soft" title={related}>
                {related}
              </span>
            )}
            <span className="inline-flex items-center gap-1.5 text-ink-soft" style={tone === "danger" ? { color: TONE_TEXT.danger } : undefined}>
              <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full" style={{ background: PRIORITY_DOT[tone] }} />
              {task.priority}
            </span>
          </span>
        </span>
        <span
          className="shrink-0 text-right text-xs font-medium tabular-nums text-ink-soft"
          style={due.overdue ? { color: TONE_TEXT.danger } : undefined}
        >
          {due.text}
        </span>
      </Link>
    </li>
  );
}
