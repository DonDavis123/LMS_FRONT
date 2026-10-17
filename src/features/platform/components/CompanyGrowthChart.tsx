"use client";

import { useEffect, useState } from "react";
import { Building2 } from "lucide-react";
import WidgetCard, { WidgetEmpty } from "@/features/dashboard/components/WidgetCard";
import { niceScale } from "@/features/dashboard/utils/dashboardMetrics";
import type { MonthlyCount } from "@/features/platform/types/platform.types";

interface CompanyGrowthChartProps {
  data: MonthlyCount[];
  status: "loading" | "error" | "ready";
  error?: string;
  onRetry: () => void;
  delay?: number;
}

const BODY_HEIGHT = 300;
const WIDTH = 560;
const HEIGHT = 240;
const MARGIN = { top: 16, right: 12, bottom: 28, left: 32 };
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function monthLabel(key: string): string {
  const [year, month] = key.split("-");
  const name = MONTHS[Number(month) - 1] ?? key;
  return `${name} ’${(year ?? "").slice(2)}`;
}

/** New companies per month — a bar chart in the same SVG style as the user dashboard. */
export default function CompanyGrowthChart({ data, status, error, onRetry, delay }: CompanyGrowthChartProps) {
  const total = data.reduce((sum, row) => sum + row.count, 0);

  return (
    <WidgetCard
      title="Company growth"
      subtitle={status === "ready" ? `${total.toLocaleString()} new ${total === 1 ? "company" : "companies"} · last ${data.length} months` : undefined}
      status={status}
      error={error}
      onRetry={onRetry}
      minHeight={BODY_HEIGHT}
      delay={delay}
    >
      {total === 0 ? (
        <WidgetEmpty
          minHeight={BODY_HEIGHT}
          icon={<Building2 size={20} aria-hidden="true" />}
          title="No new companies yet"
          hint="Monthly sign-ups appear here once companies are created."
          action={{ href: "/platform/companies", label: "Go to companies →" }}
        />
      ) : (
        <GrowthBars data={data} />
      )}
    </WidgetCard>
  );
}

function GrowthBars({ data }: { data: MonthlyCount[] }) {
  const [active, setActive] = useState<number | null>(null);
  const [grown, setGrown] = useState(false);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setGrown(true));
    return () => cancelAnimationFrame(frame);
  }, []);
  const innerWidth = WIDTH - MARGIN.left - MARGIN.right;
  const innerHeight = HEIGHT - MARGIN.top - MARGIN.bottom;
  const baseline = MARGIN.top + innerHeight;
  const scale = niceScale(Math.max(...data.map((row) => row.count)));
  const slot = innerWidth / data.length;
  const barWidth = Math.min(44, slot * 0.55);
  const yAt = (value: number) => MARGIN.top + innerHeight * (1 - value / scale.top);
  const activeRow = active === null ? null : data[active];

  return (
    <div className="px-2 pb-3 pt-3 sm:px-4">
      <div className="relative">
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          role="img"
          aria-label={`New companies per month: ${data.map((row) => `${monthLabel(row.month)} ${row.count}`).join(", ")}`}
          className="block h-auto w-full"
          onMouseLeave={() => setActive(null)}
        >
          {scale.ticks.map((tick) => (
            <g key={tick}>
              <line x1={MARGIN.left} x2={WIDTH - MARGIN.right} y1={yAt(tick)} y2={yAt(tick)} stroke="var(--color-line)" strokeWidth={1} />
              <text x={MARGIN.left - 8} y={yAt(tick)} textAnchor="end" dominantBaseline="middle" fontSize={11} fill="var(--color-ink-soft)" className="tabular-nums">
                {tick}
              </text>
            </g>
          ))}

          {data.map((row, index) => {
            const x = MARGIN.left + slot * index + (slot - barWidth) / 2;
            const height = Math.max(row.count > 0 ? 3 : 0, baseline - yAt(row.count));
            const dimmed = active !== null && active !== index;
            return (
              <g key={row.month} onMouseEnter={() => setActive(index)} onFocus={() => setActive(index)} onBlur={() => setActive(null)} tabIndex={0} className="outline-none">
                <rect x={MARGIN.left + slot * index} y={MARGIN.top} width={slot} height={innerHeight} fill="transparent" />
                <rect
                  x={x}
                  y={baseline - height}
                  width={barWidth}
                  height={height}
                  rx={5}
                  fill="var(--color-slate)"
                  style={{
                    opacity: dimmed ? 0.35 : 1,
                    transform: `scaleY(${grown ? 1 : 0})`,
                    transformOrigin: `${x + barWidth / 2}px ${baseline}px`,
                    transition: `opacity 150ms ease, transform 700ms cubic-bezier(0.22, 0.61, 0.36, 1) ${index * 60}ms`,
                  }}
                />
                <text x={x + barWidth / 2} y={HEIGHT - 8} textAnchor="middle" fontSize={11} fill="var(--color-ink-soft)">
                  {monthLabel(row.month)}
                </text>
              </g>
            );
          })}
        </svg>

        {activeRow && active !== null && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute z-10 whitespace-nowrap rounded-lg border border-line bg-surface px-2.5 py-1.5 text-xs text-fg shadow-lg"
            style={{
              left: `${((MARGIN.left + slot * active + slot / 2) / WIDTH) * 100}%`,
              top: `${(Math.max(0, yAt(activeRow.count) - 40) / HEIGHT) * 100}%`,
              transform: "translateX(-50%)",
            }}
          >
            {monthLabel(activeRow.month)} — {activeRow.count} new {activeRow.count === 1 ? "company" : "companies"}
          </div>
        )}
      </div>
    </div>
  );
}
