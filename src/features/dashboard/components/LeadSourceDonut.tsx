"use client";

import { useMemo, useState } from "react";
import { Users } from "lucide-react";
import WidgetCard, { WidgetEmpty } from "@/features/dashboard/components/WidgetCard";
import type { AsyncState, DashboardRange, DashboardStats } from "@/features/dashboard/types/dashboard.types";
import { buildSourceSlices, formatPercent, SOURCE_PALETTE } from "@/features/dashboard/utils/dashboardMetrics";
import { useCountUp } from "@/shared/hooks/useCountUp";

interface LeadSourceDonutProps {
  state: AsyncState<DashboardStats>;
  range: DashboardRange;
  isFetching: boolean;
  onRetry: () => void;
  delay?: number;
}

const BODY_HEIGHT = 300;
const SIZE = 160;
const RADIUS = 62;
const STROKE = 14;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const GAP = (2 / 360) * CIRCUMFERENCE;

export default function LeadSourceDonut({ state, range, isFetching, onRetry, delay }: LeadSourceDonutProps) {
  const stats = state.status === "ready" ? state.data : null;

  return (
    <WidgetCard
      title="Lead sources"
      subtitle={`Created in the last ${range} days`}
      status={state.status}
      error={state.status === "error" ? state.message : undefined}
      onRetry={onRetry}
      minHeight={BODY_HEIGHT}
      delay={delay}
    >
      {stats && (
        <div className={`transition-opacity ${isFetching ? "opacity-60" : ""}`}>
          <DonutBody stats={stats} />
        </div>
      )}
    </WidgetCard>
  );
}

function DonutBody({ stats }: { stats: DashboardStats }) {
  const { slices, total } = useMemo(() => buildSourceSlices(stats.leads.by_source), [stats]);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const animatedTotal = useCountUp(total);

  const segments = useMemo(() => {
    let cursor = 0;
    return slices.map((slice, index) => {
      const full = (slice.percent / 100) * CIRCUMFERENCE;
      const single = slices.length === 1;
      // Round caps extend STROKE/2 past each end, so the dash is shortened to leave a true 2° gap.
      const visible = single ? CIRCUMFERENCE : Math.max(full - GAP - STROKE, 0.5);
      const start = single ? 0 : cursor + GAP / 2 + STROKE / 2;
      cursor += full;
      return {
        key: slice.key,
        color: SOURCE_PALETTE[index % SOURCE_PALETTE.length],
        dash: `${visible} ${CIRCUMFERENCE - visible}`,
        offset: -start,
        cap: single ? "butt" : "round",
      };
    });
  }, [slices]);

  if (total === 0) {
    return (
      <WidgetEmpty
        minHeight={BODY_HEIGHT}
        icon={<Users size={20} aria-hidden="true" />}
        title="No leads in this period"
        hint="Sources appear here once leads are created."
        action={{ href: "/dashboard/leads/new", label: "Add a lead →" }}
      />
    );
  }

  const activeSlice = slices.find((slice) => slice.key === activeKey) ?? null;

  return (
    <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-4 px-4 py-5 sm:px-5" style={{ minHeight: BODY_HEIGHT }}>
      <div className="relative shrink-0" style={{ width: SIZE, height: SIZE }}>
        <div key={`${stats.range_days}:${stats.generated_at}`} className="lp-donut-sweep">
          <svg viewBox={`0 0 ${SIZE} ${SIZE}`} width={SIZE} height={SIZE} role="img" aria-label={`Lead sources, ${total} leads in total`}>
            <circle cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} fill="none" stroke="var(--color-line)" strokeWidth={STROKE} opacity={0.6} />
            {segments.map((segment) => (
              <circle
                key={segment.key}
                cx={SIZE / 2}
                cy={SIZE / 2}
                r={RADIUS}
                fill="none"
                stroke={segment.color}
                strokeWidth={STROKE}
                strokeLinecap={segment.cap === "round" ? "round" : "butt"}
                strokeDasharray={segment.dash}
                strokeDashoffset={segment.offset}
                transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
                onMouseEnter={() => setActiveKey(segment.key)}
                onMouseLeave={() => setActiveKey(null)}
                style={{ opacity: activeKey === null || activeKey === segment.key ? 1 : 0.3, transition: "opacity 150ms ease" }}
              />
            ))}
          </svg>
        </div>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
          <span className="font-serif text-3xl tabular-nums leading-none text-fg">
            {activeSlice ? activeSlice.count.toLocaleString() : animatedTotal.toLocaleString()}
          </span>
          <span className="mt-1 max-w-full truncate text-[11px] text-ink-soft">
            {activeSlice ? `${activeSlice.label} · ${formatPercent(activeSlice.count, total)}` : total === 1 ? "lead" : "leads"}
          </span>
        </div>
      </div>

      <ul aria-label="Lead sources" className="min-w-[12rem] flex-1 space-y-0.5">
        {slices.map((slice, index) => (
          <li
            key={slice.key}
            tabIndex={0}
            onMouseEnter={() => setActiveKey(slice.key)}
            onMouseLeave={() => setActiveKey(null)}
            onFocus={() => setActiveKey(slice.key)}
            onBlur={() => setActiveKey(null)}
            className={`flex min-h-9 items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm outline-none transition-opacity hover:bg-paper focus-visible:bg-paper focus-visible:ring-2 focus-visible:ring-slate ${
              activeKey !== null && activeKey !== slice.key ? "opacity-50" : ""
            }`}
          >
            <span aria-hidden="true" className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: SOURCE_PALETTE[index % SOURCE_PALETTE.length] }} />
            <span className="min-w-0 flex-1 truncate text-fg" title={slice.label}>
              {slice.label}
            </span>
            <span className="font-semibold tabular-nums text-fg">{slice.count.toLocaleString()}</span>
            <span className="w-10 text-right text-xs tabular-nums text-ink-soft">{formatPercent(slice.count, total)}</span>
          </li>
        ))}
        {stats.is_sampled && <li className="px-2 pt-1 text-[11px] text-ink-soft">Based on the latest 300 leads</li>}
      </ul>
    </div>
  );
}
