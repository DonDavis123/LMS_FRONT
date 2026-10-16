"use client";

import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import WidgetCard from "@/features/dashboard/components/WidgetCard";
import {
  DASHBOARD_RANGES,
  type AsyncState,
  type DashboardRange,
  type DashboardStats,
} from "@/features/dashboard/types/dashboard.types";
import {
  buildLinePath,
  formatAxisDate,
  formatShortDate,
  niceScale,
  parseDateKey,
  sumCounts,
  type Point,
} from "@/features/dashboard/utils/dashboardMetrics";

interface LeadsTrendChartProps {
  state: AsyncState<DashboardStats>;
  range: DashboardRange;
  onRangeChange: (range: DashboardRange) => void;
  isFetching: boolean;
  onRetry: () => void;
  delay?: number;
}

const MARGIN = { top: 14, right: 14, bottom: 26, left: 34 };
const MAX_X_LABELS = 6;
const BODY_HEIGHT = 300;

function leadsText(count: number): string {
  return `${count} new ${count === 1 ? "lead" : "leads"}`;
}

/** Measured pixel width of an element, so the SVG is drawn 1:1 and text never scales. */
function useElementWidth<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    setWidth(Math.round(element.getBoundingClientRect().width));
    const observer = new ResizeObserver((entries) => {
      const next = entries[0]?.contentRect.width;
      if (next !== undefined) setWidth(Math.round(next));
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return [ref, width] as const;
}

export default function LeadsTrendChart({ state, range, onRangeChange, isFetching, onRetry, delay }: LeadsTrendChartProps) {
  const stats = state.status === "ready" ? state.data : null;
  const total = stats ? sumCounts(stats.leads.created_per_day) : 0;

  return (
    <WidgetCard
      title="Leads over time"
      subtitle={stats ? `${total.toLocaleString()} new ${total === 1 ? "lead" : "leads"} · last ${range} days` : undefined}
      headerAside={<RangeToggle range={range} onChange={onRangeChange} />}
      status={state.status}
      error={state.status === "error" ? state.message : undefined}
      onRetry={onRetry}
      minHeight={BODY_HEIGHT}
      delay={delay}
    >
      {stats && (
        <div className={`px-2 pb-3 pt-3 transition-opacity sm:px-4 ${isFetching ? "opacity-60" : ""}`}>
          <TrendCanvas stats={stats} />
          {stats.is_sampled && <p className="px-2 pt-1 text-[11px] text-ink-soft">Based on the latest 300 leads</p>}
        </div>
      )}
    </WidgetCard>
  );
}

export function RangeToggle({ range, onChange }: { range: DashboardRange; onChange: (range: DashboardRange) => void }) {
  return (
    <div role="group" aria-label="Date range" className="inline-flex rounded-full border border-line bg-paper p-1">
      {DASHBOARD_RANGES.map((option) => {
        const isActive = option === range;
        return (
          <button
            key={option}
            type="button"
            aria-pressed={isActive}
            onClick={() => onChange(option)}
            className={`h-10 rounded-full border px-3.5 text-xs font-medium tabular-nums outline-none transition-colors focus-visible:ring-2 focus-visible:ring-slate sm:h-8 sm:px-3 ${
              isActive ? "border-slate bg-slate-light text-fg" : "border-transparent text-ink-soft hover:text-fg"
            }`}
          >
            {option}d
          </button>
        );
      })}
    </div>
  );
}

function TrendCanvas({ stats }: { stats: DashboardStats }) {
  const series = stats.leads.created_per_day;
  const count = series.length;
  const [wrapRef, width] = useElementWidth<HTMLDivElement>();
  const [active, setActive] = useState<number | null>(null);
  const gradientId = `trend-${useId().replace(/:/g, "")}`;
  const tableId = useId();

  const height = width < 480 ? 210 : 250;
  const innerWidth = Math.max(0, width - MARGIN.left - MARGIN.right);
  const innerHeight = height - MARGIN.top - MARGIN.bottom;
  const baseline = MARGIN.top + innerHeight;

  const total = sumCounts(series);
  const peak = series.reduce((best, item) => (item.count > best.count ? item : best), series[0] ?? { date: "", count: 0 });
  const scale = niceScale(peak.count);

  const xAt = (index: number) => MARGIN.left + (count <= 1 ? 0 : (index / (count - 1)) * innerWidth);
  const yAt = (value: number) => MARGIN.top + innerHeight * (1 - value / scale.top);

  const points: Point[] = series.map((item, index) => ({ x: xAt(index), y: yAt(item.count) }));
  const linePath = buildLinePath(points);
  const areaPath = points.length > 1 ? `${linePath} L${points[count - 1].x} ${baseline} L${points[0].x} ${baseline} Z` : "";

  const labelIndexes = useMemo(() => {
    const wanted = Math.min(MAX_X_LABELS, count);
    if (wanted <= 1) return count === 1 ? [0] : [];
    return [...new Set(Array.from({ length: wanted }, (_, i) => Math.round((i * (count - 1)) / (wanted - 1))))];
  }, [count]);

  const peakDate = peak.date ? parseDateKey(peak.date) : null;
  const summary =
    total === 0
      ? `${stats.range_days}-day lead trend: no leads created in this period`
      : `${stats.range_days}-day lead trend, ${total} ${total === 1 ? "lead" : "leads"}, peak ${peak.count} on ${peakDate ? formatShortDate(peakDate) : peak.date}`;

  function labelFor(index: number): string {
    const date = parseDateKey(series[index].date);
    return `${date ? formatShortDate(date) : series[index].date} — ${leadsText(series[index].count)}`;
  }

  function handlePointer(event: PointerEvent<HTMLDivElement>) {
    if (count === 0 || innerWidth <= 0) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = (event.clientX - rect.left - MARGIN.left) / innerWidth;
    setActive(Math.min(count - 1, Math.max(0, Math.round(ratio * (count - 1)))));
  }

  function handleKey(event: KeyboardEvent<HTMLDivElement>) {
    if (count === 0) return;
    if (event.key === "Escape") {
      setActive(null);
      return;
    }
    let next: number | null = null;
    if (event.key === "ArrowLeft") next = active === null ? count - 1 : Math.max(0, active - 1);
    else if (event.key === "ArrowRight") next = active === null ? count - 1 : Math.min(count - 1, active + 1);
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = count - 1;
    if (next === null) return;
    event.preventDefault();
    setActive(next);
  }

  const activeItem = active === null ? null : series[active];

  return (
    <div
      ref={wrapRef}
      role="group"
      tabIndex={0}
      aria-label={summary}
      aria-describedby={tableId}
      onPointerMove={handlePointer}
      onPointerDown={handlePointer}
      onPointerLeave={() => setActive(null)}
      onKeyDown={handleKey}
      onBlur={() => setActive(null)}
      className="relative w-full touch-pan-y select-none rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-slate"
      style={{ height }}
    >
      {width > 0 && (
        <svg width={width} height={height} aria-hidden="true" className="block">
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" style={{ stopColor: "color-mix(in srgb, var(--color-slate) 30%, transparent)" }} />
              <stop offset="100%" style={{ stopColor: "color-mix(in srgb, var(--color-slate) 0%, transparent)" }} />
            </linearGradient>
          </defs>

          {scale.ticks.map((tick) => (
            <g key={tick}>
              <line x1={MARGIN.left} x2={width - MARGIN.right} y1={yAt(tick)} y2={yAt(tick)} stroke="var(--color-line)" strokeWidth={1} />
              <text x={MARGIN.left - 8} y={yAt(tick)} textAnchor="end" dominantBaseline="middle" fontSize={11} fill="var(--color-ink-soft)" className="tabular-nums">
                {tick}
              </text>
            </g>
          ))}

          {labelIndexes.map((index, position) => (
            <text
              key={series[index].date}
              x={xAt(index)}
              y={height - 6}
              textAnchor={position === 0 ? "start" : position === labelIndexes.length - 1 ? "end" : "middle"}
              fontSize={11}
              fill="var(--color-ink-soft)"
              className="tabular-nums"
            >
              {formatAxisDate(series[index].date)}
            </text>
          ))}

          <g key={`${stats.range_days}:${stats.generated_at}`}>
            {areaPath && <path d={areaPath} fill={`url(#${gradientId})`} className="lp-fade-area" />}
            {linePath && (
              <path
                d={linePath}
                fill="none"
                stroke="var(--color-slate)"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                pathLength={1}
                className="lp-draw-line"
              />
            )}
          </g>

          {active !== null && activeItem && (
            <g>
              <line x1={xAt(active)} x2={xAt(active)} y1={MARGIN.top} y2={baseline} stroke="var(--color-ink-soft)" strokeOpacity={0.5} strokeDasharray="3 3" />
              <circle cx={xAt(active)} cy={yAt(activeItem.count)} r={4.5} fill="var(--color-surface)" stroke="var(--color-amber-dark)" strokeWidth={2.5} />
            </g>
          )}
        </svg>
      )}

      {total === 0 && width > 0 && (
        <p className="pointer-events-none absolute inset-x-0 flex items-center justify-center text-sm text-ink-soft" style={{ top: MARGIN.top, height: innerHeight - 24 }}>
          No leads created in this period
        </p>
      )}

      {active !== null && activeItem && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute z-10 whitespace-nowrap rounded-lg border border-line bg-surface px-2.5 py-1.5 text-xs text-fg shadow-lg"
          style={{
            left: Math.min(Math.max(xAt(active), 80), Math.max(80, width - 80)),
            top: Math.max(0, yAt(activeItem.count) - 46),
            transform: "translateX(-50%)",
          }}
        >
          {labelFor(active)}
        </div>
      )}

      <span className="sr-only" aria-live="polite">
        {active !== null ? labelFor(active) : ""}
      </span>

      <table id={tableId} className="sr-only">
        <caption>Leads created per day</caption>
        <thead>
          <tr>
            <th scope="col">Date</th>
            <th scope="col">New leads</th>
          </tr>
        </thead>
        <tbody>
          {series.map((item) => (
            <tr key={item.date}>
              <td>{item.date}</td>
              <td>{item.count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
