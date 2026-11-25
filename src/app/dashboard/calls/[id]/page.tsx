"use client";

import { Suspense, useEffect, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { CALLS_ENABLED } from "@/features/calls/config";
import CallDetail from "@/features/calls/components/CallDetail";
import { CallService } from "@/features/calls/services/CallService";
import type { CallDetail as CallDetailData } from "@/features/calls/types/call.types";
import { getSafeReturnTo, RETURN_TO_PARAM } from "@/shared/utils/returnTo";
import DetailLoader from "@/shared/components/DetailLoader";
import DetailSkeleton from "@/shared/components/DetailSkeleton";

function CallDetailPageInner() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = getSafeReturnTo(searchParams.get(RETURN_TO_PARAM));
  const [call, setCall] = useState<CallDetailData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!CALLS_ENABLED) {
      router.replace("/dashboard");
      return;
    }
    if (!params.id) return;

    let cancelled = false;
    setCall(null);
    setError(null);
    CallService.getCall(params.id)
      .then((data) => {
        if (!cancelled) setCall(data);
      })
      .catch(() => {
        if (!cancelled) setError("Couldn't load this call. It may have been deleted.");
      });
    return () => {
      cancelled = true;
    };
  }, [params.id, router]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 3000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  if (!CALLS_ENABLED) return null;

  if (error) {
    return <p className="text-sm text-danger">{error}</p>;
  }

  return (
    <>
      <DetailLoader ready={!!call} skeleton={<DetailSkeleton actions={3} cards={2} fields={6} />}>
        {call && (
          <CallDetail
            call={call}
            returnTo={returnTo}
            onNotice={setToast}
            onCallChange={(next) => {
              setCall(next);
              setToast("Call updated successfully");
            }}
          />
        )}
      </DetailLoader>
      {toast && (
        <div className="fixed bottom-6 right-6 z-[60] flex items-center gap-2 rounded-md border border-success/30 bg-success-soft px-4 py-3 text-sm font-medium text-success shadow-lg animate-toast-in">
          <CheckCircle2 size={16} className="shrink-0 animate-pop-in" />
          {toast}
        </div>
      )}
    </>
  );
}

export default function CallDetailPage() {
  return (
    <Suspense fallback={null}>
      <CallDetailPageInner />
    </Suspense>
  );
}
