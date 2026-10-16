"use client";

import Link from "next/link";
import { ChevronRight, Users } from "lucide-react";
import WidgetCard, { WidgetEmpty } from "@/features/dashboard/components/WidgetCard";
import type { AsyncState } from "@/features/dashboard/types/dashboard.types";
import type { Lead } from "@/features/leads/types/lead.types";
import {
  avatarToneFor,
  initialsOf,
  leadStatusTone,
  statusLabel,
  TONE_TEXT,
  toneTint,
} from "@/features/dashboard/utils/dashboardMetrics";
import { formatRelativeTime } from "@/shared/utils/formatDate";

interface RecentLeadsListProps {
  state: AsyncState<Lead[]>;
  onRetry: () => void;
  delay?: number;
}

const BODY_HEIGHT = 300;

export default function RecentLeadsList({ state, onRetry, delay }: RecentLeadsListProps) {
  const leads = state.status === "ready" ? state.data : [];

  return (
    <WidgetCard
      title="Recent leads"
      subtitle="Newest first"
      link={{ href: "/dashboard/leads", label: "View all leads →" }}
      status={state.status}
      error={state.status === "error" ? state.message : undefined}
      onRetry={onRetry}
      minHeight={BODY_HEIGHT}
      delay={delay}
    >
      {leads.length === 0 ? (
        <WidgetEmpty
          minHeight={BODY_HEIGHT}
          icon={<Users size={20} aria-hidden="true" />}
          title="No leads yet"
          hint="New leads will show up here as soon as they are created."
          action={{ href: "/dashboard/leads/new", label: "Add your first lead →" }}
        />
      ) : (
        <ul className="divide-y divide-line">
          {leads.map((lead) => {
            const displayName = lead.name || "(No name)";
            const tone = leadStatusTone(lead.lead_status);
            const avatarTone = avatarToneFor(displayName);

            return (
              <li key={lead.id}>
                <Link
                  href={`/dashboard/leads/${lead.id}`}
                  className="group flex min-h-[3.75rem] items-center gap-3 px-3 py-2.5 outline-none transition-colors duration-200 hover:bg-paper focus-visible:bg-paper focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-slate sm:px-5"
                >
                  <span
                    aria-hidden="true"
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold"
                    style={{ background: `color-mix(in srgb, ${avatarTone} 16%, transparent)`, color: avatarTone }}
                  >
                    {initialsOf(displayName)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-fg" title={displayName}>
                      {displayName}
                    </span>
                    <span className="block truncate text-xs text-ink-soft" title={lead.company_name || undefined}>
                      {lead.company_name || "—"}
                    </span>
                  </span>
                  <span className="flex shrink-0 flex-col items-end gap-1">
                    <span
                      className="rounded-full px-2.5 py-0.5 text-[11px] font-medium"
                      style={{ background: toneTint(tone), color: TONE_TEXT[tone], border: `1px solid ${toneTint(tone, 30)}` }}
                    >
                      {statusLabel(lead.lead_status)}
                    </span>
                    <span className="text-[11px] text-ink-soft">{formatRelativeTime(lead.created_at)}</span>
                  </span>
                  <ChevronRight
                    size={16}
                    aria-hidden="true"
                    className="hidden shrink-0 -translate-x-1 text-ink-soft opacity-0 transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100 group-focus-visible:translate-x-0 group-focus-visible:opacity-100 sm:block"
                  />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </WidgetCard>
  );
}
