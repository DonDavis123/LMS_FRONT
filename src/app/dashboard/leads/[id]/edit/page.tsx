"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import LeadForm from "@/features/leads/components/LeadForm";
import { LeadService } from "@/features/leads/services/LeadService";
import type { CreateLeadPayload, Lead } from "@/features/leads/types/lead.types";

export default function EditLeadPage() {
  const router = useRouter();
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

  async function handleSubmit(payload: CreateLeadPayload) {
    await LeadService.updateLead(params.id, payload);
    router.push(`/dashboard/leads/${params.id}?updated=1`);
  }

  // "Save and Next" saves this lead, then jumps to the next lead in the
  // list so someone can work through records sequentially.
  async function handleSaveAndNext(payload: CreateLeadPayload) {
    await LeadService.updateLead(params.id, payload);
    try {
      const allLeads = await LeadService.getLeads();
      const currentIndex = allLeads.findIndex((l) => l.id === params.id);
      const next = currentIndex >= 0 ? allLeads[currentIndex + 1] : undefined;
      if (next) {
        router.push(`/dashboard/leads/${next.id}/edit`);
      } else {
        router.push(`/dashboard/leads?updated=1`);
      }
    } catch {
      router.push(`/dashboard/leads/${params.id}?updated=1`);
    }
  }

  if (error) {
    return <p className="text-sm text-danger">{error}</p>;
  }

  if (!lead) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-10 animate-shimmer rounded-md" />
        ))}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl rounded-lg border border-line bg-surface p-6">
      <LeadForm
        mode="edit"
        initialLead={lead}
        onSubmit={handleSubmit}
        onSaveAndNext={handleSaveAndNext}
        onCancel={() => router.back()}
      />
    </div>
  );
}
