"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import LeadConvert from "@/features/leads/components/LeadConvert";
import { LeadService } from "@/features/leads/services/LeadService";
import type { Lead } from "@/features/leads/types/lead.types";
import DetailLoader from "@/shared/components/DetailLoader";
import DetailSkeleton from "@/shared/components/DetailSkeleton";

export default function ConvertLeadPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [lead, setLead] = useState<Lead | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    LeadService.getLead(params.id)
      .then((data) => {
        if (cancelled) return;
        // Already converted: nothing to convert — show the history page.
        if (data.is_converted) {
          router.replace(`/dashboard/leads/${params.id}`);
          return;
        }
        setLead(data);
      })
      .catch(() => {
        if (!cancelled) setError("Couldn't load this lead.");
      });
    return () => {
      cancelled = true;
    };
  }, [params.id, router]);

  if (error) return <p className="text-sm text-danger">{error}</p>;
  return (
    <DetailLoader ready={!!lead} skeleton={<DetailSkeleton avatar={false} tabs={false} actions={0} cards={1} fields={4} className="max-w-2xl" />}>
      {lead && <LeadConvert lead={lead} />}
    </DetailLoader>
  );
}
