"use client";

import { Suspense } from "react";

import { useEffect, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import LeadDetail from "@/features/leads/components/LeadDetail";
import { LeadService } from "@/features/leads/services/LeadService";
import type { Lead } from "@/features/leads/types/lead.types";

function LeadDetailPageInner() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [lead, setLead] = useState<Lead | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

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

  useEffect(() => {
    const message =
      searchParams.get("updated") === "1"
        ? "Lead updated successfully"
        : searchParams.get("converted") === "1"
        ? "Lead converted successfully"
        : null;

    if (message) {
      setToast(message);
      router.replace(`/dashboard/leads/${params.id}`);
      const timer = window.setTimeout(() => setToast(null), 3000);
      return () => window.clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  if (error) {
    return <p className="text-sm text-danger">{error}</p>;
  }

  if (!lead) {
    return (
      <div className="mx-auto max-w-5xl space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-10 animate-shimmer rounded-md" />
        ))}
      </div>
    );
  }

  return (
    <>
      <LeadDetail lead={lead} onLeadChange={setLead} />
      {toast && (
        <div className="fixed bottom-6 right-6 z-[60] flex items-center gap-2 rounded-md border border-success/30 bg-success-soft px-4 py-3 text-sm font-medium text-success shadow-lg animate-toast-in">
          <CheckCircle2 size={16} className="shrink-0 animate-pop-in" />
          {toast}
        </div>
      )}
    </>
  );
}

export default function LeadDetailPage() {
  return (
    <Suspense fallback={null}>
      <LeadDetailPageInner />
    </Suspense>
  );
}
