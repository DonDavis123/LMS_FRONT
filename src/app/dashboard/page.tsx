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
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl text-fg">Home</h1>
        <p className="text-sm text-ink-soft">A quick look at your pipeline.</p>
      </div>

      <DashboardStats leads={leads} />

      <div className="rounded-lg border border-line bg-surface">
        <div className="flex items-center justify-between border-b border-line p-4">
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
                  className="flex items-center justify-between px-4 py-3 hover:bg-paper"
                >
                  <div>
                    <p className="text-sm font-medium text-fg">{lead.name || "(No name)"}</p>
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
