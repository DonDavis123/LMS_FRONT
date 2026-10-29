"use client";

import { AlertTriangle, ArrowLeft, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type MouseEvent } from "react";
import { isAdmin } from "@/features/auth/types/auth.types";
import { authStorage } from "@/infrastructure/auth/tokenStorage";
import ImportConfirmDialog from "@/features/leadImport/components/ImportConfirmDialog";
import ImportStepper from "@/features/leadImport/components/ImportStepper";
import MappingStep from "@/features/leadImport/components/MappingStep";
import OptionsStep from "@/features/leadImport/components/OptionsStep";
import UploadStep from "@/features/leadImport/components/UploadStep";
import {
  WIZARD_STEPS,
  stepIndex,
  useLeadImportWizard,
  type WizardStep,
} from "@/features/leadImport/hooks/useLeadImportWizard";
import { LeadImportService } from "@/features/leadImport/services/LeadImportService";
import type { StepFooter } from "@/features/leadImport/utils/stepFooter";

const LEADS_PATH = "/dashboard/leads";

type Access = "checking" | "allowed" | "denied";

const secondaryButton =
  "rounded-md border border-line bg-surface px-3 py-1.5 text-sm font-medium text-fg transition hover:bg-paper active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber disabled:cursor-not-allowed disabled:opacity-50";
const primaryButton =
  "rounded-md bg-amber px-3 py-1.5 text-sm font-semibold text-fg transition hover:bg-amber-dark active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fg disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-amber disabled:active:scale-100";

/** Placeholder for steps that later parts build. */
function StepPlaceholder({ step }: { step: WizardStep }) {
  const label = WIZARD_STEPS[stepIndex(step)]?.label ?? step;
  return (
    <div className="rounded-lg border border-dashed border-line bg-paper px-4 py-12 text-center">
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">Placeholder</p>
      <p className="mt-1 text-sm font-semibold text-fg">{label}</p>
      <p className="mt-1 text-sm text-ink-soft">This step is coming in a later part of the import feature.</p>
    </div>
  );
}

function WizardSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading">
      <div className="h-6 w-40 animate-shimmer rounded" />
      <div className="h-8 animate-shimmer rounded" />
      <div className="h-64 animate-shimmer rounded-lg" />
    </div>
  );
}

export default function ImportWizard() {
  const router = useRouter();
  const wizard = useLeadImportWizard();
  const { state } = wizard;

  const [access, setAccess] = useState<Access>("checking");
  const [uploadBusy, setUploadBusy] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  // Steps 2 and 3 tell the footer whether Continue works and why not.
  const [stepFooter, setStepFooter] = useState<StepFooter | null>(null);

  // Admin guard. Read once on mount so server and client markup match.
  useEffect(() => {
    if (isAdmin(authStorage.getUser())) {
      setAccess("allowed");
    } else {
      setAccess("denied");
      router.replace(LEADS_PATH);
    }
  }, [router]);

  // A draft exists once a file is uploaded and until the import is started.
  const hasDraft = state.upload !== null && state.progress === null;
  const draftRef = useRef<{ jobId: string | null; started: boolean }>({ jobId: null, started: false });
  useEffect(() => {
    draftRef.current = { jobId: state.upload?.job_id ?? null, started: state.progress !== null };
  });

  // Warn before the tab is closed or reloaded while a draft exists.
  useEffect(() => {
    if (!hasDraft) return;
    function warn(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = "";
    }
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [hasDraft]);

  // Leaving the screen with an unstarted draft discards it. Best effort:
  // a failure here never blocks leaving.
  useEffect(
    () => () => {
      const { jobId, started } = draftRef.current;
      if (jobId && !started) void LeadImportService.discard(jobId).catch(() => undefined);
    },
    [],
  );

  const handleBackToLeads = useCallback(
    (event: MouseEvent<HTMLAnchorElement>) => {
      if (!hasDraft || event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
      event.preventDefault();
      setLeaveOpen(true);
    },
    [hasDraft],
  );

  if (access !== "allowed") {
    // Non-admins are being redirected; show nothing meaningful meanwhile.
    return access === "checking" ? <WizardSkeleton /> : null;
  }

  const currentIndex = stepIndex(state.step);
  const isFirst = currentIndex === 0;
  const nextStep = WIZARD_STEPS[currentIndex + 1]?.id;
  const previousStep = WIZARD_STEPS[currentIndex - 1]?.id;

  // A footer that belongs to a screen the user has just left is ignored.
  const footer = stepFooter && stepFooter.step === state.step ? stepFooter : null;
  const stepControlsFooter = state.step === "mapping" || state.step === "options";

  let continueDisabled = true;
  if (state.step === "upload") continueDisabled = !state.upload || uploadBusy;
  else if (stepControlsFooter) continueDisabled = !footer || !footer.canContinue;
  else if (nextStep) continueDisabled = !wizard.canGoTo(nextStep);

  const continueLabel = footer?.continueLabel ?? "Continue";
  const continueReason = continueDisabled ? (footer?.reason ?? null) : null;

  function handleContinue() {
    if (continueDisabled || !nextStep) return;
    // advanceTo unlocks the next step as it moves, so a valid screen can always continue.
    wizard.advanceTo(nextStep);
  }

  return (
    <div className="mx-auto w-full max-w-5xl">
      <div className="rounded-lg border border-line bg-surface">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-line px-3 py-2.5 sm:px-4">
          <div className="min-w-0 flex-1">
            <h1 className="font-serif text-lg leading-tight text-fg">Import leads</h1>
            <p className="text-xs text-ink-soft">Add many leads at once from a CSV or Excel file.</p>
          </div>
          <Link
            href={LEADS_PATH}
            onClick={handleBackToLeads}
            className={`${secondaryButton} inline-flex items-center gap-1.5 whitespace-nowrap`}
          >
            <ArrowLeft size={14} aria-hidden="true" />
            Back to leads
          </Link>
        </div>

        <div className="border-b border-line px-3 py-3 sm:px-4">
          <ImportStepper current={state.step} canGoTo={wizard.canGoTo} onSelect={wizard.goTo} />
        </div>

        <div className="px-3 py-4 sm:px-4">
          {state.step === "upload" ? (
            <UploadStep wizard={wizard} onBusyChange={setUploadBusy} />
          ) : state.step === "mapping" ? (
            <MappingStep wizard={wizard} onFooterChange={setStepFooter} />
          ) : state.step === "options" ? (
            <OptionsStep wizard={wizard} onFooterChange={setStepFooter} />
          ) : (
            <StepPlaceholder step={state.step} />
          )}
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-line px-3 py-3 sm:px-4">
          {isFirst || !previousStep ? (
            <span />
          ) : (
            <button type="button" className={secondaryButton} onClick={() => wizard.goTo(previousStep)}>
              Back
            </button>
          )}
          {footer ? (
            <p
              id="import-footer-status"
              role="status"
              aria-live="polite"
              className={`order-last flex w-full items-start gap-1.5 text-xs sm:order-none sm:w-auto sm:flex-1 sm:justify-end sm:text-right ${
                footer.tone === "success" ? "text-success" : footer.tone === "warning" ? "text-fg" : "text-ink-soft"
              }`}
            >
              {footer.tone === "success" && <CheckCircle2 size={14} className="mt-px shrink-0" aria-hidden="true" />}
              {footer.tone === "warning" && (
                <AlertTriangle size={14} className="mt-px shrink-0 text-amber-dark" aria-hidden="true" />
              )}
              <span className="min-w-0">{footer.status}</span>
            </p>
          ) : (
            <span className="flex-1" />
          )}
          {nextStep && (
            <span title={continueReason ?? undefined} className="ml-auto sm:ml-0">
              <button
                type="button"
                className={primaryButton}
                disabled={continueDisabled}
                onClick={handleContinue}
                aria-describedby={continueReason ? "import-footer-status" : undefined}
              >
                {continueLabel}
              </button>
            </span>
          )}
        </div>
      </div>

      <ImportConfirmDialog
        isOpen={leaveOpen}
        title="Leave without importing?"
        message="Your uploaded file and column choices will be discarded. Nothing has been added to your leads."
        confirmLabel="Leave"
        cancelLabel="Stay"
        onCancel={() => setLeaveOpen(false)}
        onConfirm={() => {
          setLeaveOpen(false);
          router.push(LEADS_PATH);
        }}
      />
    </div>
  );
}
