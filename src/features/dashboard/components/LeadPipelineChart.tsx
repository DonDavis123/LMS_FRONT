"use client";

import { useEffect, useMemo, useState } from "react";
import { Users } from "lucide-react";
import WidgetCard, { WidgetEmpty } from "@/features/dashboard/components/WidgetCard";
import type { AsyncState, DashboardStats } from "@/features/dashboard/types/dashboard.types";
import { buildPipelineRows, formatPercent, leadStatusTone, TONE_COLOR } from "@/features/dashboard/utils/dashboardMetrics";

interface LeadPipelineChartProps {
  state: AsyncState<DashboardStats>;
  onRetry: () => void;
  delay?: number;
}

const BODY_HEIGHT = 340;

export default function LeadPipelineChart({ state, onRetry, delay }: LeadPipelineChartProps) {
  const stats = state.status === "ready" ? state.data : null;
  const total = stats?.leads.total ?? 0;

  const rows = useMemo(() => (stats ? buildPipelineRows(stats.leads.by_status, stats.leads.total) : []), [stats]);
  const maxCount = Math.max(1, ...rows.map((row) => row.count));

  // Bars mount at 0 and grow on the next frame once the data is on screen, so
  // the width transition runs together with the other charts.
  const hasStats = stats !== null;
  const [grown, setGrown] = useState(false);
  useEffect(() => {
    if (!hasStats) return;
    const frame = requestAnimationFrame(() => setGrown(true));
    return () => cancelAnimationFrame(frame);
  }, [hasStats]);

  return (
    <WidgetCard
      title="Pipeline by status"
      subtitle={stats ? `Total ${total.toLocaleString()} ${total === 1 ? "lead" : "leads"}` : undefined}
      link={{ href: "/dashboard/leads", label: "View leads →" }}
      status={state.status}
      error={state.status === "error" ? state.message : undefined}
      onRetry={onRetry}
      minHeight={BODY_HEIGHT}
      delay={delay}
    >
      {stats && total === 0 ? (
        <WidgetEmpty
          minHeight={BODY_HEIGHT}
          icon={<Users size={20} aria-hidden="true" />}
          title="No leads yet"
          hint="Add your first lead to see the pipeline take shape."
          action={{ href: "/dashboard/leads/new", label: "Add a lead →" }}
        />
      ) : (
        <div className="px-2 py-3 sm:px-3">
          <ul aria-label="Leads by status" className="space-y-0.5">
            {rows.map((row, index) => (
              <li
                key={row.status}
                title={`${row.label}: ${row.count.toLocaleString()} ${row.count === 1 ? "lead" : "leads"}`}
                className="grid grid-cols-[minmax(6.5rem,9rem)_1fr_auto] items-center gap-3 rounded-lg px-2 py-1.5 transition-colors hover:bg-paper sm:px-3"
              >
                <span className="truncate text-sm text-fg">{row.label}</span>
                <span className="h-2.5 overflow-hidden rounded-full bg-paper" aria-hidden="true">
                  <span
                    className="block h-full rounded-full"
                    style={{
                      width: grown ? `${(row.count / maxCount) * 100}%` : "0%",
                      background: TONE_COLOR[leadStatusTone(row.status)],
                      transition: "width 1500ms cubic-bezier(0.22, 0.61, 0.36, 1)",
                      transitionDelay: `${index * 60}ms`,
                    }}
                  />
                </span>
                <span className="flex min-w-[5.5rem] items-baseline justify-end gap-1.5 tabular-nums">
                  <span className="text-sm font-semibold text-fg">{row.count.toLocaleString()}</span>
                  <span className="w-10 text-right text-xs text-ink-soft">{formatPercent(row.count, total)}</span>
                </span>
              </li>
            ))}
          </ul>
          {stats?.is_partial && (
            <p className="px-3 pt-2 text-[11px] text-ink-soft">Some status counts couldn&apos;t be loaded and are shown as 0.</p>
          )}
        </div>
      )}
    </WidgetCard>
  );
}
