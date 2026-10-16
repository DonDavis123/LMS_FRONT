"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import CompanyStatusBadge from "@/features/platform/components/CompanyStatusBadge";
import type { PlatformOverview as PlatformOverviewData } from "@/features/platform/types/platform.types";
import { formatDateTime } from "@/shared/utils/formatDate";

interface PlatformOverviewProps {
  overview: PlatformOverviewData | null;
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
}

/** Animates a number counting up to `target` whenever it changes. */
function useCountUp(target: number, duration = 600): number {
  const [value, setValue] = useState(0);
  const frameRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    const startTime = performance.now();

    function tick(now: number) {
      const progress = Math.min((now - startTime) / duration, 1);
      // easeOutCubic — quick start, gentle settle at the end.
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(target * eased));
      if (progress < 1) frameRef.current = requestAnimationFrame(tick);
    }

    frameRef.current = requestAnimationFrame(tick);
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [target, duration]);

  return value;
}

export default function PlatformOverview({ overview, isLoading, error, onRetry }: PlatformOverviewProps) {
  const cards = overview
    ? [
        { label: "Total Companies", value: overview.companies.total, accent: "var(--color-slate)" },
        { label: "Active", value: overview.companies.active, accent: "var(--color-success)" },
        { label: "Onboarding", value: overview.companies.onboarding, accent: "var(--color-amber)" },
        { label: "Suspended", value: overview.companies.suspended, accent: "var(--color-danger)" },
        { label: "Company Users", value: overview.users.total, accent: "var(--color-ink)" },
        { label: "Active Users", value: overview.users.active, accent: "var(--color-success)" },
      ]
    : [];

  return (
    <div className="lp-page-bg min-h-full space-y-4 rounded-2xl sm:space-y-6 sm:p-1">
      <div className="relative overflow-hidden rounded-2xl border border-line bg-surface p-4 shadow-sm sm:p-6">
        <div className="pointer-events-none absolute -right-12 -top-16 h-40 w-40 rounded-full bg-amber/10 blur-3xl dark:hidden" />
        <div className="relative">
          <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.2em] text-amber-dark">LeadPulse platform</p>
          <h1 className="font-serif text-2xl tracking-tight text-fg sm:text-3xl">Platform overview</h1>
          <p className="mt-1 max-w-xl text-sm text-ink-soft">
            Every company on LeadPulse, who is using it, and what changed recently.
          </p>
        </div>
      </div>

      {error && (
        <div className="flex items-center justify-between gap-3 rounded-md border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger">
          <p>{error}</p>
          <button
            type="button"
            onClick={onRetry}
            className="shrink-0 rounded-md border border-danger/30 px-2.5 py-1 text-xs font-semibold transition hover:bg-surface"
          >
            Retry
          </button>
        </div>
      )}

      {isLoading && !overview ? (
        <div className="grid grid-cols-2 gap-2.5 sm:gap-4 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-24 animate-shimmer rounded-xl" />
          ))}
        </div>
      ) : (
        overview && (
          <div className="grid grid-cols-2 gap-2.5 sm:gap-4 lg:grid-cols-3">
            {cards.map((card, i) => (
              <StatCard key={card.label} {...card} delay={i * 60} />
            ))}
          </div>
        )
      )}

      <div className="lp-card overflow-hidden">
        <div className="flex items-center justify-between border-b border-line p-3 sm:p-5">
          <h2 className="font-serif text-lg text-fg">Recent Companies</h2>
          <Link href="/platform/companies" className="text-sm font-medium text-slate hover:text-fg">
            View all companies →
          </Link>
        </div>

        {isLoading && !overview ? (
          <div className="space-y-3 p-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-10 animate-shimmer rounded-md" />
            ))}
          </div>
        ) : !overview || overview.recent_companies.length === 0 ? (
          !error && <p className="px-4 py-10 text-center text-sm text-ink-soft">No companies yet.</p>
        ) : (
          <ul className="divide-y divide-line">
            {overview.recent_companies.map((company) => (
              <li key={company.id}>
                <Link
                  href={`/platform/companies/${company.id}`}
                  className="group flex items-center justify-between gap-3 px-3 py-3 transition-all duration-200 hover:bg-paper sm:px-5 sm:py-3.5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-fg">{company.name}</p>
                    <p className="text-xs text-ink-soft">Created {formatDateTime(company.created_at) || "-"}</p>
                  </div>
                  <CompanyStatusBadge status={company.status} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  accent,
  delay,
}: {
  label: string;
  value: number;
  accent: string;
  delay: number;
}) {
  const animatedValue = useCountUp(value);

  return (
    <div
      className="lp-card animate-fade-in-up relative cursor-default overflow-hidden p-3.5 sm:p-5"
      style={{ borderLeft: `3px solid ${accent}`, animationDelay: `${delay}ms` }}
    >
      <p className="text-xs font-medium uppercase tracking-wide text-ink-soft">{label}</p>
      <p className="mt-3 font-serif text-3xl tabular-nums text-fg">{animatedValue}</p>
    </div>
  );
}
