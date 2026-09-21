"use client";

import { Suspense } from "react";

import { useEffect, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import LeadList from "@/features/leads/components/LeadList";
import { LeadService } from "@/features/leads/services/LeadService";
import type { Lead } from "@/features/leads/types/lead.types";

function LeadsPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [highlightId, setHighlightId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    LeadService.getLeads()
      .then((data) => {
        if (!cancelled) setLeads(data);
      })
      .catch(() => {
        if (!cancelled) setError("Couldn't load leads from the server.");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(null), 3000);
  }

  useEffect(() => {
    const createdId = searchParams.get("created");
    const message =
      createdId
        ? "Lead created successfully"
        : searchParams.get("updated") === "1"
        ? "Lead updated successfully"
        : searchParams.get("deletedMessage")
        ? decodeURIComponent(searchParams.get("deletedMessage") as string)
        : null;

    if (message) {
      showToast(message);
      router.replace("/dashboard/leads");
    }
    if (createdId && createdId !== "1") {
      setHighlightId(createdId);
      const timer = window.setTimeout(() => setHighlightId(null), 2000);
      return () => window.clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  return (
    <>
      <LeadList
        leads={leads}
        isLoading={isLoading}
        error={error}
        highlightId={highlightId}
        onLeadDeleted={(id, message) => {
          setLeads((prev) => prev.filter((l) => l.id !== id));
          showToast(message);
        }}
        onLeadUpdated={(updated) => {
          setLeads((prev) => prev.map((lead) => (lead.id === updated.id ? updated : lead)));
          showToast("Lead status updated successfully");
        }}
      />

      {toast && (
        <div className="fixed bottom-6 right-6 z-[60] flex items-center gap-2 rounded-md border border-success/30 bg-success-soft px-4 py-3 text-sm font-medium text-success shadow-lg animate-toast-in">
          <CheckCircle2 size={16} className="shrink-0 animate-pop-in" />
          {toast}
        </div>
      )}
    </>
  );
}

export default function LeadsPage() {
  return (
    <Suspense fallback={null}>
      <LeadsPageInner />
    </Suspense>
  );
}
