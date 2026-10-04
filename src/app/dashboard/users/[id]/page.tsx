"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import UserDetail from "@/features/users/components/UserDetail";
import { userService } from "@/features/users/services/userService";
import type { ManagedUserDetail } from "@/features/users/types/user.types";
import { useRequireSuperAdmin } from "@/features/auth/hooks/useRequireSuperAdmin";
import { extractApiError } from "@/shared/utils/apiError";

type LoadState = "loading" | "ready" | "not-found" | "error";

function readStatus(error: unknown): number | null {
  const status = (error as { response?: { status?: number } } | null)?.response?.status;
  return typeof status === "number" ? status : null;
}

function UserDetailPageInner() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user: currentUser, isAllowed } = useRequireSuperAdmin();
  const [user, setUser] = useState<ManagedUserDetail | null>(null);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<number | null>(null);

  useEffect(() => {
    if (!isAllowed) return;
    let cancelled = false;
    setLoadState("loading");
    setErrorMessage(null);

    userService
      .getUser(params.id)
      .then((data) => {
        if (cancelled) return;
        setUser(data);
        setLoadState("ready");
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (readStatus(err) === 404) {
          setLoadState("not-found");
          return;
        }
        setErrorMessage(extractApiError(err, "Couldn't load this user."));
        setLoadState("error");
      });

    return () => {
      cancelled = true;
    };
  }, [isAllowed, params.id, refreshKey]);

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

  useEffect(() => {
    if (searchParams.get("updated") === "1") {
      showToast("User updated successfully");
      router.replace(`/dashboard/users/${params.id}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  if (!isAllowed) return null;

  if (loadState === "not-found") {
    return (
      <div className="mx-auto max-w-5xl space-y-3">
        <Link href="/dashboard/users" className="text-sm text-slate hover:text-fg">
          ← Back to users
        </Link>
        <div className="rounded-lg border border-line bg-surface p-6">
          <p className="font-serif text-lg text-fg">User not found</p>
          <p className="mt-1 text-sm text-ink-soft">This user doesn&apos;t exist or has been deleted.</p>
        </div>
      </div>
    );
  }

  if (loadState === "error") {
    return (
      <div className="mx-auto max-w-5xl space-y-3">
        <Link href="/dashboard/users" className="text-sm text-slate hover:text-fg">
          ← Back to users
        </Link>
        <div className="flex items-center justify-between gap-3 rounded-md border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger">
          <p>{errorMessage ?? "Couldn't load this user."}</p>
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

  if (loadState === "loading" || !user) {
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
      <UserDetail
        user={user}
        currentUserId={currentUser?.id ?? null}
        onUserChange={setUser}
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

export default function UserDetailPage() {
  return (
    <Suspense fallback={null}>
      <UserDetailPageInner />
    </Suspense>
  );
}
