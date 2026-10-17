"use client";

import { useMemo, useState } from "react";
import { Building2 } from "lucide-react";
import WidgetCard, { WidgetEmpty } from "@/features/dashboard/components/WidgetCard";
import { formatPercent } from "@/features/dashboard/utils/dashboardMetrics";
import type { PlatformOverview } from "@/features/platform/types/platform.types";
import { useCountUp } from "@/shared/hooks/useCountUp";

interface CompanyStatusDonutProps {
  companies: PlatformOverview["companies"];
  status: "loading" | "error" | "ready";
  error?: string;
  onRetry: () => void;
  delay?: number;
}

const BODY_HEIGHT = 300;
const SIZE = 160;
const RADIUS = 62;
const STROKE = 14;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const GAP = (2 / 360) * CIRCUMFERENCE;

export default function CompanyStatusDonut({ companies, status, error, onRetry, delay }: CompanyStatusDonutProps) {
  return (
    <WidgetCard
      title="Company status"
      subtitle="Share of companies by lifecycle stage"
      status={status}
      error={error}
      onRetry={onRetry}
      minHeight={BODY_HEIGHT}
      delay={delay}
    >
      <DonutBody companies={companies} />
    </WidgetCard>
  );
}

function DonutBody({ companies }: { companies: PlatformOverview["companies"] }) {
  const total = companies.total;
  const slices = useMemo(
    () =>
      [
        { key: "active", label: "Active", count: companies.active, color: "var(--color-success)" },
        { key: "onboarding", label: "Onboarding", count: companies.onboarding, color: "var(--color-amber)" },
        { key: "suspended", label: "Suspended", count: companies.suspended, color: "var(--color-danger)" },
      ].filter((slice) => slice.count > 0),
    [companies],
  );
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const animatedTotal = useCountUp(total, 1400);

  const segments = useMemo(() => {
    let cursor = 0;
    return slices.map((slice) => {
      const full = (slice.count / total) * CIRCUMFERENCE;
      const single = slices.length === 1;
      const visible = single ? CIRCUMFERENCE : Math.max(full - GAP - STROKE, 0.5);
      const start = single ? 0 : cursor + GAP / 2 + STROKE / 2;
      cursor += full;
      return { ...slice, dash: `${visible} ${CIRCUMFERENCE - visible}`, offset: -start, cap: single ? "butt" : "round" };
    });
  }, [slices, total]);

  if (total === 0) {
    return (
      <WidgetEmpty
        minHeight={BODY_HEIGHT}
        icon={<Building2 size={20} aria-hidden="true" />}
        title="No companies yet"
        hint="Statuses appear here once a company is created."
        action={{ href: "/platform/companies", label: "Add a company →" }}
      />
    );
  }

  const activeSlice = slices.find((slice) => slice.key === activeKey) ?? null;

  return (
    <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-4 px-4 py-5 sm:px-5" style={{ minHeight: BODY_HEIGHT }}>
      <div className="relative shrink-0" style={{ width: SIZE, height: SIZE }}>
        <div className="lp-donut-sweep">
          <svg viewBox={`0 0 ${SIZE} ${SIZE}`} width={SIZE} height={SIZE} role="img" aria-label={`Company status, ${total} companies in total`}>
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
            {activeSlice ? `${activeSlice.label} · ${formatPercent(activeSlice.count, total)}` : total === 1 ? "company" : "companies"}
          </span>
        </div>
      </div>

      <ul aria-label="Company status" className="min-w-[12rem] flex-1 space-y-0.5">
        {slices.map((slice) => (
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
            <span aria-hidden="true" className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: slice.color }} />
            <span className="min-w-0 flex-1 truncate text-fg">{slice.label}</span>
            <span className="font-semibold tabular-nums text-fg">{slice.count.toLocaleString()}</span>
            <span className="w-10 text-right text-xs tabular-nums text-ink-soft">{formatPercent(slice.count, total)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
