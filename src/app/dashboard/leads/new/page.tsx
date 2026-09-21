"use client";

import { useRouter } from "next/navigation";
import LeadForm from "@/features/leads/components/LeadForm";
import { LeadService } from "@/features/leads/services/LeadService";
import type { CreateLeadPayload } from "@/features/leads/types/lead.types";

export default function NewLeadPage() {
  const router = useRouter();

  async function handleSubmit(payload: CreateLeadPayload) {
    const lead = await LeadService.createLead(payload);
    router.push(`/dashboard/leads?created=${lead.id}`);
  }

  // "Save and Next" creates the lead but stays on this page — LeadForm
  // resets its own fields and shows an inline confirmation.
  async function handleSaveAndNext(payload: CreateLeadPayload) {
    await LeadService.createLead(payload);
  }

  return (
    <div className="mx-auto max-w-4xl rounded-lg border border-line bg-surface p-6">
      <LeadForm
        mode="create"
        onSubmit={handleSubmit}
        onSaveAndNext={handleSaveAndNext}
        onCancel={() => router.back()}
      />
    </div>
  );
}
