"use client";

import { Info, TrendingUp, Trophy, Wallet } from "lucide-react";
import type { ReactNode } from "react";
import type { Forecast } from "@/features/deals/types/deal.types";
import { formatCurrency } from "@/features/deals/utils/formatCurrency";

interface DealForecastCardsProps {
  forecast: Forecast | null;
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
}

function StatCard({
  icon,
  label,
  value,
  hint,
  tone = "text-fg",
  info,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  hint?: string;
  tone?: string;
  /** Short explanation shown as a tooltip on the info icon. */
  info?: string;
}) {
  return (
    <div className="rounded-xl border border-line bg-surface p-4 shadow-sm animate-fade-in-up">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-ink-soft">
        <span aria-hidden="true" className="text-slate">{icon}</span>
        {label}
        {info && (
          <span title={info} aria-label={info} role="img" className="cursor-help text-ink-soft">
            <Info size={13} />
          </span>
        )}
      </div>
      <p className={`mt-2 truncate font-serif text-2xl ${tone}`}>{value}</p>
      {hint && <p className="mt-0.5 text-xs text-ink-soft">{hint}</p>}
    </div>
  );
}

function StatSkeleton() {
  return (
    <div className="rounded-xl border border-line bg-surface p-4" aria-hidden="true">
      <div className="h-3 w-24 animate-shimmer rounded" />
      <div className="mt-3 h-7 w-32 animate-shimmer rounded" />
      <div className="mt-2 h-3 w-20 animate-shimmer rounded" />
    </div>
  );
}

/** Open pipeline, weighted forecast and won-this-month, straight from /deals/forecast/. */
export default function DealForecastCards({ forecast, isLoading, error, onRetry }: DealForecastCardsProps) {
  if (!forecast && isLoading) {
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3" aria-busy="true" aria-label="Loading forecast">
        <StatSkeleton />
        <StatSkeleton />
        <StatSkeleton />
      </div>
    );
  }

  if (!forecast) {
    return (
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger" role="alert">
        <span>{error ?? "Couldn't load the forecast."}</span>
        <button
          type="button"
          onClick={onRetry}
          className="rounded-md border border-danger/40 px-3 py-1 text-xs font-medium hover:bg-surface"
        >
          Retry
        </button>
      </div>
    );
  }

  const openCount = forecast.open_deal_count;
  return (
    <div className="space-y-1.5">
      <div className={`grid grid-cols-1 gap-3 sm:grid-cols-3 ${isLoading ? "opacity-70 transition-opacity" : ""}`} aria-busy={isLoading}>
        <StatCard
          icon={<Wallet size={14} />}
          label="Open pipeline"
          value={formatCurrency(forecast.open_pipeline)}
          hint={`${openCount} open ${openCount === 1 ? "deal" : "deals"}`}
        />
        <StatCard
          icon={<TrendingUp size={14} />}
          label="Weighted forecast"
          value={formatCurrency(forecast.weighted_forecast)}
          hint="Weighted = amount × win probability"
          info="Weighted = amount × win probability, added up across open deals."
        />
        <StatCard
          icon={<Trophy size={14} />}
          label="Won this month"
          value={formatCurrency(forecast.won_this_month)}
          tone="text-success"
        />
      </div>
      {error && <p className="text-xs text-danger" role="alert">{error}</p>}
    </div>
  );
}
