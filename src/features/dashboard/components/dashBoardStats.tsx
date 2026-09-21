"use client";

import { useEffect, useRef, useState } from "react";
import type { Lead } from "@/features/leads/types/lead.types";

interface DashboardStatsProps {
  leads: Lead[];
}

function isWithinLastDays(dateString: string, days: number): boolean {
  const date = new Date(dateString);
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  return date >= cutoff;
}

/** Animates a number counting up to `target` whenever it changes. */
function useCountUp(target: number, duration = 600): number {
  const [value, setValue] = useState(0);
  const frameRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    const startValue = 0;
    const startTime = performance.now();

    function tick(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // easeOutCubic — quick start, gentle settle at the end.
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(startValue + (target - startValue) * eased));

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(tick);
      }
    }

    frameRef.current = requestAnimationFrame(tick);
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  return value;
}

export default function DashboardStats({ leads }: DashboardStatsProps) {
  const total = leads.length;
  const newThisWeek = leads.filter((lead) => isWithinLastDays(lead.created_at, 7)).length;
  const qualified = leads.filter((lead) => lead.lead_source !== "None").length;
  const uniqueOwners = new Set(leads.map((lead) => lead.owner?.id).filter(Boolean)).size;

  const cards = [
    { label: "Total Leads", value: total, accent: "var(--color-slate)" },
    { label: "New This Week", value: newThisWeek, accent: "var(--color-amber)" },
    { label: "With a Source", value: qualified, accent: "var(--color-success)" },
    { label: "Active Owners", value: uniqueOwners, accent: "var(--color-ink)" },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {cards.map((card, i) => (
        <StatCard key={card.label} {...card} delay={i * 60} />
      ))}
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
      className="animate-fade-in-up cursor-default rounded-lg border border-line bg-surface p-4 transition hover:-translate-y-0.5 hover:shadow-md"
      style={{ borderLeft: `3px solid ${accent}`, animationDelay: `${delay}ms` }}
    >
      <p className="text-xs font-medium uppercase tracking-wide text-ink-soft">{label}</p>
      <p className="mt-2 font-serif text-3xl text-fg tabular-nums">{animatedValue}</p>
    </div>
  );
}
