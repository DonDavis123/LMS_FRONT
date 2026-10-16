"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { useParams } from "next/navigation";
import CompanyDetail from "@/features/platform/components/CompanyDetail";
import { platformService } from "@/features/platform/services/platformService";
import type { Company, CompanyDetail as CompanyDetailData } from "@/features/platform/types/platform.types";
import { extractApiError } from "@/shared/utils/apiError";

type LoadState = "loading" | "ready" | "not-found" | "error";

function readStatus(error: unknown): number | null {
  const status = (error as { response?: { status?: number } } | null)?.response?.status;
  return typeof status === "number" ? status : null;
}

export default function PlatformCompanyDetailPage() {
  const params = useParams<{ id: string }>();
  const [company, setCompany] = useState<CompanyDetailData | null>(null);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoadState("loading");
    setErrorMessage(null);

    platformService
      .getCompany(params.id)
      .then((data) => {
        if (cancelled) return;
        setCompany(data);
        setLoadState("ready");
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (readStatus(err) === 404) {
          setLoadState("not-found");
          return;
        }
        setErrorMessage(extractApiError(err, "Couldn't load this company."));
        setLoadState("error");
      });

    return () => {
      cancelled = true;
    };
  }, [params.id, refreshKey]);

  function showToast(message: string) {
    if (toastTimer.current !== null) window.clearTimeout(toastTimer.current);
    setToast(message);
    toastTimer.current = window.setTimeout(() => setToast(null), 3000);
  }

  useEffect(() => {
    return () => {
      if (toastTimer.current !== null) window.clearTimeout(toastTimer.current);
    };
  }, []);

  // Update/suspend/activate return the plain company; keep the detail-only
  // fields (users_count, superadmins) we already have.
  const handleCompanyChange = useCallback((updated: Company) => {
    setCompany((current) => (current ? { ...current, ...updated } : current));
  }, []);

  // Re-read the detail quietly (no skeleton) so the user count and the
  // superadmin list follow user changes made in the users section.
  const handleUsersChanged = useCallback(() => {
    platformService
      .getCompany(params.id)
      .then((data) => setCompany(data))
      .catch(() => {
        /* the counts stay as they were; the next full load corrects them */
      });
  }, [params.id]);

  if (loadState === "not-found") {
    return (
      <div className="mx-auto max-w-5xl space-y-3">
        <Link href="/platform/companies" className="text-sm text-slate hover:text-fg">
          ← Back to companies
        </Link>
        <div className="rounded-lg border border-line bg-surface p-6">
          <p className="font-serif text-lg text-fg">Company not found</p>
          <p className="mt-1 text-sm text-ink-soft">This company doesn&apos;t exist.</p>
        </div>
      </div>
    );
  }

  if (loadState === "error") {
    return (
      <div className="mx-auto max-w-5xl space-y-3">
        <Link href="/platform/companies" className="text-sm text-slate hover:text-fg">
          ← Back to companies
        </Link>
        <div className="flex items-center justify-between gap-3 rounded-md border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger">
          <p>{errorMessage ?? "Couldn't load this company."}</p>
          <button
            type="button"
            onClick={() => setRefreshKey((value) => value + 1)}
            className="shrink-0 rounded-md border border-danger/30 px-2.5 py-1 text-xs font-semibold transition hover:bg-surface"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (loadState === "loading" || !company) {
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
      <CompanyDetail
        company={company}
        onCompanyChange={handleCompanyChange}
        onUsersChanged={handleUsersChanged}
        onNotify={showToast}
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
