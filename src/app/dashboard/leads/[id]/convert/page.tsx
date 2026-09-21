"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import LeadConvert from "@/features/leads/components/LeadConvert";
import { LeadService } from "@/features/leads/services/LeadService";
import type { Lead } from "@/features/leads/types/lead.types";

export default function ConvertLeadPage() {
  const params = useParams<{ id: string }>();
  const [lead, setLead] = useState<Lead | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    LeadService.getLead(params.id)
      .then((data) => {
        if (!cancelled) setLead(data);
      })
      .catch(() => {
        if (!cancelled) setError("Couldn't load this lead.");
      });
    return () => {
      cancelled = true;
    };
  }, [params.id]);

  if (error) return <p className="text-sm text-danger">{error}</p>;
  if (!lead) {
    return (
      <div className="mx-auto max-w-2xl space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-10 animate-shimmer rounded-md" />
        ))}
      </div>
    );
  }

  return <LeadConvert lead={lead} />;
}
