import { useCallback, useEffect, useRef, useState } from "react";
import { DashboardService } from "@/features/dashboard/services/DashboardService";
import {
  DASHBOARD_RANGES,
  DEFAULT_DASHBOARD_RANGE,
  type DashboardRange,
  type DashboardStats,
} from "@/features/dashboard/types/dashboard.types";
import { useAsyncResource } from "@/features/dashboard/hooks/useAsyncResource";
import { TaskService } from "@/features/tasks/services/TaskService";
import type { Task, TaskStatus } from "@/features/tasks/types/task.types";

const COMPLETED_STATUS: TaskStatus = "Completed";
/** A preloaded range is only used if it is this fresh, so switching never shows old numbers. */
const PREFETCH_TTL_MS = 30_000;

/**
 * Everything the dashboard home needs. Every widget loads independently and
 * in parallel, so one failing request only affects its own card.
 */
export function useDashboardData(userId: string | null) {
  const [range, setRange] = useState<DashboardRange>(DEFAULT_DASHBOARD_RANGE);
  const [completingIds, setCompletingIds] = useState<ReadonlySet<string>>(new Set());

  // The other date ranges are fetched in the background once the first one is on
  // screen, so clicking 7d / 30d / 90d is answered from memory instead of the network.
  const prefetched = useRef(new Map<DashboardRange, { at: number; promise: Promise<DashboardStats> }>());

  const stats = useAsyncResource(
    () => {
      const hit = prefetched.current.get(range);
      prefetched.current.delete(range);
      if (hit && Date.now() - hit.at < PREFETCH_TTL_MS) return hit.promise;
      return DashboardService.getStats(range);
    },
    `stats-${range}`,
    "Couldn't load lead statistics.",
  );
  const tasks = useAsyncResource(
    userId ? () => DashboardService.getMyTasks(userId) : null,
    `tasks-${userId ?? "none"}`,
    "Couldn't load your tasks.",
  );
  const schedule = useAsyncResource(() => DashboardService.getUpcomingSchedule(), "schedule", "Couldn't load your schedule.");
  const recent = useAsyncResource(() => DashboardService.getRecentLeads(), "recent", "Couldn't load recent leads.");

  const { patch: patchTasks } = tasks;

  const statsStatus = stats.state.status;
  useEffect(() => {
    // Only with the single-call endpoint: the composed fallback costs ~15 requests per range.
    if (statsStatus !== "ready" || !DashboardService.hasStatsEndpoint()) return;
    for (const other of DASHBOARD_RANGES) {
      if (other === range || prefetched.current.has(other)) continue;
      const promise = DashboardService.getStats(other);
      promise.catch(() => prefetched.current.delete(other)); // a failed preload is simply refetched on click
      prefetched.current.set(other, { at: Date.now(), promise });
    }
  }, [statsStatus, range]);

  /**
   * Marks the task done. `completingIds` flips immediately (counts update
   * optimistically); the list only drops the task once the server confirms.
   * On failure the flag is cleared again and the error is rethrown to the
   * caller, which restores the row and shows the message.
   */
  const completeTask = useCallback(
    async (task: Task): Promise<void> => {
      setCompletingIds((current) => new Set(current).add(task.id));
      try {
        await TaskService.updateTask(task.id, { status: COMPLETED_STATUS });
        patchTasks((current) => ({
          tasks: current.tasks.filter((item) => item.id !== task.id),
          total: Math.max(0, current.total - 1),
        }));
      } finally {
        setCompletingIds((current) => {
          const next = new Set(current);
          next.delete(task.id);
          return next;
        });
      }
    },
    [patchTasks],
  );

  const resources = [stats, tasks, schedule, recent];
  const loadedTimes = resources.map((resource) => resource.loadedAt).filter((time): time is number => time !== null);

  const refreshAll = () => resources.forEach((resource) => resource.reload());

  return {
    range,
    setRange,
    stats,
    tasks,
    schedule,
    recent,
    completingIds,
    completeTask,
    refreshAll,
    isRefreshing: resources.some((resource) => resource.isFetching),
    updatedAt: loadedTimes.length > 0 ? Math.max(...loadedTimes) : null,
  };
}
