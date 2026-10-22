"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, RefreshCw } from "lucide-react";
import { extractApiError } from "@/shared/utils/apiError";
import { userService } from "@/features/users/services/userService";
import type { LeadOwnerOption } from "@/features/auth/types/auth.types";
import { LeadCaptureService } from "@/features/leadCapture/services/LeadCaptureService";
import type { LeadForm, UpdateLeadFormPayload } from "@/features/leadCapture/types/leadCapture.types";
import LeadFormStatusHeader from "@/features/leadCapture/components/LeadFormStatusHeader";
import LeadFormLinkCard from "@/features/leadCapture/components/LeadFormLinkCard";
import LeadFormSettings from "@/features/leadCapture/components/LeadFormSettings";

interface ToastState {
  kind: "success" | "error";
  message: string;
}

/**
 * Superadmin screen for the company's single Lead Form: share the public
 * link / QR code, block or unblock it and choose its settings. Everything
 * goes through /api/lead-capture/form/…; the backend owns every rule.
 */
export default function LeadFormManager() {
  const [form, setForm] = useState<LeadForm | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const [owners, setOwners] = useState<LeadOwnerOption[]>([]);
  const [isOwnersLoading, setIsOwnersLoading] = useState(true);
  const [ownersError, setOwnersError] = useState<string | null>(null);
  const [ownersReloadKey, setOwnersReloadKey] = useState(0);

  const [isToggling, setIsToggling] = useState(false);

  const [toast, setToast] = useState<ToastState | null>(null);
  const toastTimer = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setLoadError(null);

    LeadCaptureService.getForm()
      .then((data) => {
        if (!cancelled) setForm(data);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        const status = (error as { response?: { status?: number } } | null)?.response?.status;
        setLoadError(
          status !== undefined && status >= 500
            ? "The server couldn't load the lead form. If the backend was just updated, its database update (migrations) may not have been applied yet — please contact your administrator."
            : extractApiError(error, "Couldn't load the lead form from the server."),
        );
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  // Eligible owners: the same list (active Admin / Superadmin) the backend
  // checks the form's owners against.
  useEffect(() => {
    let cancelled = false;
    setIsOwnersLoading(true);
    setOwnersError(null);

    userService
      .getLeadOwners()
      .then((data) => {
        if (cancelled) return;
        if (!Array.isArray(data)) throw new Error("Invalid owners response from the server.");
        setOwners(data);
      })
      .catch((error: unknown) => {
        if (!cancelled) setOwnersError(extractApiError(error, "Couldn't load the list of owners."));
      })
      .finally(() => {
        if (!cancelled) setIsOwnersLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [ownersReloadKey]);

  useEffect(() => {
    return () => {
      if (toastTimer.current !== null) window.clearTimeout(toastTimer.current);
    };
  }, []);

  const showToast = useCallback((kind: ToastState["kind"], message: string) => {
    if (toastTimer.current !== null) window.clearTimeout(toastTimer.current);
    setToast({ kind, message });
    toastTimer.current = window.setTimeout(() => setToast(null), kind === "error" ? 5000 : 3000);
  }, []);

  async function handleToggle(accepting: boolean) {
    if (isToggling) return;
    setIsToggling(true);
    try {
      const updated = accepting ? await LeadCaptureService.unblockForm() : await LeadCaptureService.blockForm();
      setForm(updated);
      showToast("success", accepting ? "The form is live" : "The form is blocked");
    } catch (error) {
      // e.g. 400 "Set a lead source and at least one eligible owner before unblocking the form."
      showToast(
        "error",
        extractApiError(error, accepting ? "Couldn't unblock the form. Try again." : "Couldn't block the form. Try again."),
      );
    } finally {
      setIsToggling(false);
    }
  }

  async function handleSave(payload: UpdateLeadFormPayload): Promise<LeadForm> {
    const updated = await LeadCaptureService.updateForm(payload);
    setForm(updated);
    showToast("success", "Settings saved");
    return updated;
  }

  async function handleRegenerate(): Promise<void> {
    const updated = await LeadCaptureService.regenerateLink();
    setForm(updated);
    showToast("success", "New link created — the old link no longer works");
  }

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      {loadError ? (
        <div className="lp-card flex items-center justify-between gap-3 bg-danger-soft px-4 py-3 text-sm text-danger">
          <p>{loadError}</p>
          <button
            type="button"
            onClick={() => setReloadKey((value) => value + 1)}
            className="flex shrink-0 items-center gap-1.5 rounded-md border border-danger/30 px-2.5 py-1 text-xs font-semibold transition hover:bg-surface"
          >
            <RefreshCw size={12} />
            Retry
          </button>
        </div>
      ) : isLoading || !form ? (
        <LeadFormSkeleton />
      ) : (
        <>
          <LeadFormStatusHeader form={form} isToggling={isToggling} onToggle={(next) => void handleToggle(next)} />
          <LeadFormLinkCard form={form} onRegenerate={handleRegenerate} />
          <LeadFormSettings
            form={form}
            owners={owners}
            isOwnersLoading={isOwnersLoading}
            ownersError={ownersError}
            onRetryOwners={() => setOwnersReloadKey((value) => value + 1)}
            onSave={handleSave}
          />
        </>
      )}

      <div aria-live="polite" role="status">
        {toast && (
          <div
            className={`fixed bottom-6 right-6 z-[60] flex max-w-[calc(100vw-3rem)] items-center gap-2 rounded-md border px-4 py-3 text-sm font-medium shadow-lg animate-toast-in ${
              toast.kind === "success"
                ? "border-success/30 bg-success-soft text-success"
                : "border-danger/30 bg-danger-soft text-danger"
            }`}
          >
            {toast.kind === "success" ? (
              <CheckCircle2 size={16} className="shrink-0 animate-pop-in" />
            ) : (
              <AlertCircle size={16} className="shrink-0" />
            )}
            {toast.message}
          </div>
        )}
      </div>
    </div>
  );
}

function LeadFormSkeleton() {
  return (
    <div className="animate-pulse space-y-4" aria-hidden="true">
      <div className="lp-card h-24" />
      <div className="lp-card h-72" />
      <div className="lp-card h-96" />
    </div>
  );
}
