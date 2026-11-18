"use client";

import { Suspense, useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import DealDetail from "@/features/deals/components/DealDetail";
import { DealService } from "@/features/deals/services/DealService";
import type { Deal } from "@/features/deals/types/deal.types";
import { extractApiError } from "@/shared/utils/apiError";
import { getSafeReturnTo, RETURN_TO_PARAM } from "@/shared/utils/returnTo";

function Inner() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const returnTo = getSafeReturnTo(searchParams.get(RETURN_TO_PARAM));
  const initialTab = searchParams.get("tab") === "timeline" ? "timeline" : "overview";
  const [deal, setDeal] = useState<Deal | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    DealService.getDeal(params.id)
      .then((value) => {
        if (!cancelled) setDeal(value);
      })
      .catch((err) => {
        if (!cancelled) setError(extractApiError(err, "Couldn't load this deal."));
      });
    return () => {
      cancelled = true;
    };
  }, [params.id, reloadKey]);

  if (error) {
    return (
      <div role="alert" className="mx-auto flex max-w-5xl flex-wrap items-center gap-3 text-sm text-danger">
        <span>{error}</span>
        <button
          type="button"
          onClick={() => setReloadKey((k) => k + 1)}
          className="rounded-md border border-line px-3 py-1 text-xs font-medium text-fg hover:bg-paper"
        >
          Retry
        </button>
      </div>
    );
  }
  if (!deal) {
    return (
      <div className="mx-auto max-w-5xl space-y-3" aria-busy="true">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-10 animate-shimmer rounded-md" />
        ))}
      </div>
    );
  }
  return <DealDetail deal={deal} onDealChange={setDeal} returnTo={returnTo} initialTab={initialTab} />;
}

export default function DealDetailPage() {
  return (
    <Suspense fallback={null}>
      <Inner />
    </Suspense>
  );
}
