"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { Building2, Plus, ShieldCheck, UserCheck, Users, type LucideIcon } from "lucide-react";
import Sparkline from "@/features/dashboard/components/charts/Sparkline";
import WidgetCard from "@/features/dashboard/components/WidgetCard";
import { formatPercent } from "@/features/dashboard/utils/dashboardMetrics";
import CompanyGrowthChart from "@/features/platform/components/CompanyGrowthChart";
import CompanyStatusBadge from "@/features/platform/components/CompanyStatusBadge";
import CompanyStatusDonut from "@/features/platform/components/CompanyStatusDonut";
import { TopCompaniesPanel, UsersByRolePanel } from "@/features/platform/components/PlatformBreakdownPanels";
import type { PlatformOverview as PlatformOverviewData } from "@/features/platform/types/platform.types";
import { useCountUp } from "@/shared/hooks/useCountUp";
import { formatDateTime } from "@/shared/utils/formatDate";

interface PlatformOverviewProps {
  overview: PlatformOverviewData | null;
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
}

interface CardModel {
  key: string;
  label: string;
  icon: LucideIcon;
  accent: string;
  value: number;
  sub: ReactNode;
  series: number[];
}

const COUNT_UP_MS = 1400;

function buildCards(overview: PlatformOverviewData): CardModel[] {
  const { companies, users, companies_growth } = overview;
  const growth = companies_growth.map((row) => row.count);
  const blocked = Math.max(0, users.total - users.active);

  return [
    {
      key: "companies",
      label: "Total companies",
      icon: Building2,
      accent: "var(--color-slate)",
      value: companies.total,
      sub: (
        <span className="text-ink-soft">
          {companies.onboarding} onboarding · {companies.suspended} suspended
        </span>
      ),
      series: growth,
    },
    {
      key: "active",
      label: "Active companies",
      icon: ShieldCheck,
      accent: "var(--color-success)",
      value: companies.active,
      sub: <span className="text-ink-soft">{formatPercent(companies.active, companies.total)} of all companies</span>,
      series: [],
    },
    {
      key: "users",
      label: "Company users",
      icon: Users,
      accent: "var(--color-amber)",
      value: users.total,
      sub: <span className="text-ink-soft">Across {companies.total} {companies.total === 1 ? "company" : "companies"}</span>,
      series: [],
    },
    {
      key: "active-users",
      label: "Active users",
      icon: UserCheck,
      accent: "var(--color-ink)",
      value: users.active,
      sub: <span className="text-ink-soft">{blocked > 0 ? `${blocked} blocked · ` : ""}{formatPercent(users.active, users.total)} active</span>,
      series: [],
    },
  ];
}

export default function PlatformOverview({ overview, isLoading, error, onRetry }: PlatformOverviewProps) {
  const loading = isLoading && !overview;
  const failed = !overview && !!error;
  const status: "loading" | "error" | "ready" = overview ? "ready" : failed ? "error" : "loading";
  const cards = overview ? buildCards(overview) : [];

  return (
    <div className="lp-page-bg min-h-full space-y-4 rounded-2xl sm:space-y-6 sm:p-1">
      <div className="animate-fade-in-up relative overflow-hidden rounded-2xl border border-line bg-surface px-4 py-3 shadow-sm sm:px-5 sm:py-3.5">
        <div className="pointer-events-none absolute -right-12 -top-16 h-40 w-40 rounded-full bg-amber/10 blur-3xl dark:hidden" />
        <div className="relative flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase leading-none tracking-[0.2em] text-amber-dark">LeadPulse platform</p>
            <h1 className="mt-1 font-serif text-xl leading-tight tracking-tight text-fg sm:text-2xl">Platform overview</h1>
            <p className="mt-0.5 max-w-xl text-sm text-ink-soft">
              Every company on LeadPulse, who is using it, and what changed recently.
            </p>
          </div>
          <Link
            href="/platform/companies"
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-ink px-4 text-sm font-medium text-white outline-none transition hover:bg-ink-2 focus-visible:ring-2 focus-visible:ring-slate focus-visible:ring-offset-2 focus-visible:ring-offset-surface active:scale-[0.98] dark:bg-slate"
          >
            <Plus size={15} aria-hidden="true" />
            Manage companies
          </Link>
        </div>
      </div>

      {error && overview && (
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

      <div className="grid grid-cols-2 gap-2.5 sm:gap-4 lg:grid-cols-4" aria-label="Key figures">
        {overview
          ? cards.map((card, i) => <StatCard key={card.key} card={card} delay={i * 60} />)
          : Array.from({ length: 4 }, (_, i) => (
              <PlaceholderCard key={i} failed={failed} message={error} onRetry={onRetry} />
            ))}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:gap-6 xl:grid-cols-3">
        <div className="min-w-0 xl:col-span-2">
          <CompanyGrowthChart
            data={overview?.companies_growth ?? []}
            status={status}
            error={error ?? undefined}
            onRetry={onRetry}
            delay={120}
          />
        </div>
        <div className="min-w-0">
          <CompanyStatusDonut
            companies={overview?.companies ?? { total: 0, active: 0, onboarding: 0, suspended: 0 }}
            status={status}
            error={error ?? undefined}
            onRetry={onRetry}
            delay={180}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-2 xl:grid-cols-3">
        <div className="min-w-0">
          <UsersByRolePanel data={overview?.users_by_role ?? []} status={status} error={error ?? undefined} onRetry={onRetry} delay={240} />
        </div>
        <div className="min-w-0">
          <TopCompaniesPanel data={overview?.top_companies ?? []} status={status} error={error ?? undefined} onRetry={onRetry} delay={300} />
        </div>
        <div className="min-w-0 lg:col-span-2 xl:col-span-1">
          <WidgetCard
            title="Recent companies"
            subtitle="Newest five on the platform"
            link={{ href: "/platform/companies", label: "View all →" }}
            status={status}
            error={error ?? undefined}
            onRetry={onRetry}
            minHeight={260}
            delay={360}
          >
            {!overview || overview.recent_companies.length === 0 ? (
              !loading && <p className="px-4 py-10 text-center text-sm text-ink-soft">No companies yet.</p>
            ) : (
              <ul className="divide-y divide-line">
                {overview.recent_companies.map((company) => (
                  <li key={company.id}>
                    <Link
                      href={`/platform/companies/${company.id}`}
                      className="group flex items-center justify-between gap-3 px-4 py-3 outline-none transition-colors hover:bg-paper focus-visible:bg-paper focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-slate sm:px-5 sm:py-3.5"
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
          </WidgetCard>
        </div>
      </div>
    </div>
  );
}

function StatCard({ card, delay }: { card: CardModel; delay: number }) {
  const shown = useCountUp(card.value, COUNT_UP_MS);
  const Icon = card.icon;

  return (
    <div
      className="lp-card lp-kpi animate-fade-in-up relative flex min-h-[148px] cursor-default flex-col justify-between overflow-hidden p-3.5 sm:p-5"
      style={{ borderLeft: `3px solid ${card.accent}`, animationDelay: `${delay}ms` }}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-ink-soft">{card.label}</p>
        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
          style={{ background: `color-mix(in srgb, ${card.accent} 14%, transparent)`, color: "var(--color-fg)" }}
        >
          <Icon size={16} aria-hidden="true" />
        </span>
      </div>

      <div className="mt-2">
        <p className="font-serif text-3xl tabular-nums text-fg" aria-hidden="true">
          {shown.toLocaleString()}
        </p>
        <span className="sr-only" aria-live="polite">
          {card.label}: {card.value}
        </span>
      </div>
      <p className="mt-0.5 text-xs">{card.sub}</p>

      <div className="mt-2">
        <Sparkline values={card.series} color={card.accent === "var(--color-ink)" ? "var(--color-fg)" : card.accent} />
      </div>
    </div>
  );
}

function PlaceholderCard({ failed, message, onRetry }: { failed: boolean; message: string | null; onRetry: () => void }) {
  if (failed) {
    return (
      <div role="alert" className="lp-card flex min-h-[148px] flex-col items-start justify-center gap-2 p-3.5 sm:p-5">
        <p className="text-xs text-danger">{message ?? "Couldn't load this figure."}</p>
        <button
          type="button"
          onClick={onRetry}
          className="rounded text-xs font-medium text-slate outline-none hover:text-fg focus-visible:ring-2 focus-visible:ring-slate"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="lp-card min-h-[148px] p-3.5 sm:p-5" aria-busy="true">
      <div className="h-3 w-20 animate-shimmer rounded" />
      <div className="mt-5 h-8 w-16 animate-shimmer rounded" />
      <div className="mt-4 h-8 w-full animate-shimmer rounded" />
    </div>
  );
}
