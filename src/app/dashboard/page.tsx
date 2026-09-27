"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import DashboardStats from "@/features/dashboard/components/dashBoardStats";
import { LeadService } from "@/features/leads/services/LeadService";
import type { Lead } from "@/features/leads/types/lead.types";

export default function HomePage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    LeadService.getLeads()
      .then((data) => {
        if (!cancelled) setLeads(data);
      })
      .catch(() => {
        /* stats just render empty — the Leads page surfaces the real error */
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const recentLeads = [...leads]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  return (
    <div className="lp-page-bg min-h-full space-y-6 rounded-2xl p-1">
      <div className="relative overflow-hidden rounded-2xl border border-line bg-surface p-6 shadow-sm">
        <div className="pointer-events-none absolute -right-12 -top-16 h-40 w-40 rounded-full bg-amber/10 blur-3xl" />
        <div className="relative">
          <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.2em] text-amber-dark">LeadPulse workspace</p>
          <h1 className="font-serif text-3xl tracking-tight text-fg">Good to see you.</h1>
          <p className="mt-1 max-w-xl text-sm text-ink-soft">A focused view of your pipeline, activity and recent opportunities.</p>
        </div>
      </div>

      <DashboardStats leads={leads} />

      <div className="lp-card overflow-hidden">
        <div className="flex items-center justify-between border-b border-line p-5">
          <h2 className="font-serif text-lg text-fg">Recent Leads</h2>
          <Link href="/dashboard/leads" className="text-sm font-medium text-slate hover:text-fg">
            View all leads →
          </Link>
        </div>

        {isLoading ? (
          <div className="space-y-3 p-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-10 animate-shimmer rounded-md" />
            ))}
          </div>
        ) : recentLeads.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-ink-soft">No leads yet.</p>
        ) : (
          <ul className="divide-y divide-line">
            {recentLeads.map((lead) => (
              <li key={lead.id}>
                <Link
                  href={`/dashboard/leads/${lead.id}`}
                  className="group flex items-center justify-between px-5 py-3.5 transition-all duration-200 hover:bg-paper"
                >
                  <div>
                    <p className="text-sm font-semibold text-fg group-hover:translate-x-0.5">{lead.name || "(No name)"}</p>
                    <p className="text-xs text-ink-soft">{lead.company_name || "—"}</p>
                  </div>
                  <span className="rounded-full bg-slate-light px-2.5 py-1 text-xs font-medium text-slate">
                    {lead.lead_status}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
