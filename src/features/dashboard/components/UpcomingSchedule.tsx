"use client";

import { Fragment, useMemo } from "react";
import Link from "next/link";
import { CalendarClock, Phone, Video } from "lucide-react";
import WidgetCard, { WidgetEmpty } from "@/features/dashboard/components/WidgetCard";
import type { AsyncState, ScheduleItem } from "@/features/dashboard/types/dashboard.types";
import { dayHeading, formatClock, toDateKey } from "@/features/dashboard/utils/dashboardMetrics";

interface UpcomingScheduleProps {
  state: AsyncState<ScheduleItem[]>;
  onRetry: () => void;
  delay?: number;
}

const MAX_ITEMS = 6;
const BODY_HEIGHT = 300;

export default function UpcomingSchedule({ state, onRetry, delay }: UpcomingScheduleProps) {
  const items = useMemo(() => (state.status === "ready" ? state.data : []), [state]);
  const now = useMemo(() => new Date(), [items]);
  const shown = items.slice(0, MAX_ITEMS);
  const hiddenCount = items.length - shown.length;

  return (
    <WidgetCard
      title="Upcoming"
      subtitle="Next 7 days"
      link={{ href: "/dashboard/meetings", label: "View all meetings →" }}
      status={state.status}
      error={state.status === "error" ? state.message : undefined}
      onRetry={onRetry}
      minHeight={BODY_HEIGHT}
      delay={delay}
    >
      {shown.length === 0 ? (
        <WidgetEmpty
          minHeight={BODY_HEIGHT}
          icon={<CalendarClock size={20} aria-hidden="true" />}
          title="Nothing scheduled"
          hint="No meetings in the next 7 days."
          action={{ href: "/dashboard/meetings", label: "Schedule a meeting →" }}
        />
      ) : (
        <ul>
          {shown.map((item, index) => {
            const dayKey = toDateKey(item.start);
            const isNewDay = index === 0 || dayKey !== toDateKey(shown[index - 1].start);
            const isNow = item.start.getTime() <= now.getTime() && item.end.getTime() > now.getTime();
            const isPast = item.end.getTime() <= now.getTime();
            const KindIcon = item.kind === "Meeting" ? Video : Phone;

            return (
              <Fragment key={item.id}>
                {isNewDay && (
                  <li aria-hidden="true" className="border-y border-line bg-paper px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-soft first:border-t-0 sm:px-5">
                    {dayHeading(item.start, now)}
                  </li>
                )}
                <li className="border-b border-line last:border-b-0">
                  <Link
                    href={item.href}
                    className={`group flex min-h-[3.5rem] items-center gap-3 px-4 py-2.5 outline-none transition-colors hover:bg-paper focus-visible:bg-paper focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-slate sm:px-5 ${
                      isPast ? "opacity-60" : ""
                    }`}
                  >
                    <span className="w-[4.5rem] shrink-0 text-sm font-medium tabular-nums text-fg">{formatClock(item.start)}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-fg" title={item.title}>
                        <span className="sr-only">{dayHeading(item.start, now)}, </span>
                        {item.title}
                      </span>
                      {item.detail && (
                        <span className="block truncate text-xs text-ink-soft" title={item.detail}>
                          {item.detail}
                        </span>
                      )}
                    </span>
                    <span className="flex shrink-0 flex-col items-end gap-1 sm:flex-row sm:items-center">
                      {isNow && (
                        <span
                          className="rounded-full px-2 py-0.5 text-[11px] font-semibold"
                          style={{
                            background: "color-mix(in srgb, var(--color-amber) 22%, transparent)",
                            color: "color-mix(in srgb, var(--color-amber-dark) 65%, var(--color-fg))",
                          }}
                        >
                          Now
                        </span>
                      )}
                      <span
                        className="inline-flex items-center gap-1 rounded-full border border-line px-2 py-0.5 text-[11px] font-medium text-ink-soft"
                        title={item.kind === "Call" ? "Scheduled call (saved in this browser)" : undefined}
                      >
                        <KindIcon size={11} aria-hidden="true" />
                        {item.kind}
                      </span>
                    </span>
                  </Link>
                </li>
              </Fragment>
            );
          })}
          {hiddenCount > 0 && (
            <li className="px-4 py-2.5 text-xs text-ink-soft sm:px-5">
              +{hiddenCount} more —{" "}
              <Link href="/dashboard/meetings" className="font-medium text-slate hover:text-fg">
                View all meetings
              </Link>
            </li>
          )}
        </ul>
      )}
    </WidgetCard>
  );
}
