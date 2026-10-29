"use client";

import { AlertTriangle, ArrowLeft, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type MouseEvent } from "react";
import ImportConfirmDialog from "@/features/leadImport/components/ImportConfirmDialog";
import ImportStep from "@/features/leadImport/components/ImportStep";
import ImportStepper from "@/features/leadImport/components/ImportStepper";
import MappingStep from "@/features/leadImport/components/MappingStep";
import OptionsStep from "@/features/leadImport/components/OptionsStep";
import ReviewStep from "@/features/leadImport/components/ReviewStep";
import UploadStep from "@/features/leadImport/components/UploadStep";
import { useImportAdminAccess } from "@/features/leadImport/hooks/useImportAdminAccess";
import type { RunnerPhase } from "@/features/leadImport/hooks/useImportRunner";
import { WIZARD_STEPS, stepIndex, useLeadImportWizard } from "@/features/leadImport/hooks/useLeadImportWizard";
import { LeadImportService } from "@/features/leadImport/services/LeadImportService";
import { LEADS_PATH } from "@/features/leadImport/utils/importRoutes";
import type { StepFooter } from "@/features/leadImport/utils/stepFooter";

/** Phases in which leaving this page is worth a word of reassurance. */
const ACTIVE_RUN_PHASES: ReadonlySet<RunnerPhase> = new Set(["starting", "running", "cancelling", "interrupted"]);

const secondaryButton =
  "rounded-md border border-line bg-surface px-3 py-1.5 text-sm font-medium text-fg transition hover:bg-paper active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber disabled:cursor-not-allowed disabled:opacity-50";
const primaryButton =
  "rounded-md bg-amber px-3 py-1.5 text-sm font-semibold text-fg transition hover:bg-amber-dark active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fg disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-amber disabled:active:scale-100";

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

  const access = useImportAdminAccess();
  const [uploadBusy, setUploadBusy] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  // Steps 2 to 4 tell the footer whether Continue works and why not.
  const [stepFooter, setStepFooter] = useState<StepFooter | null>(null);

  // The phase of step 5, so leaving the page while an import runs can say it keeps running.
  const [runPhase, setRunPhase] = useState<RunnerPhase>("idle");
  const importRunning = state.started && ACTIVE_RUN_PHASES.has(runPhase);

  // A draft exists once a file is uploaded and until the import is started.
  const hasDraft = state.upload !== null && !state.started && state.progress === null;
  const draftRef = useRef<{ jobId: string | null; started: boolean }>({ jobId: null, started: false });
  useEffect(() => {
    draftRef.current = { jobId: state.upload?.job_id ?? null, started: state.started || state.progress !== null };
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
      if ((!hasDraft && !importRunning) || event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
      event.preventDefault();
      setLeaveOpen(true);
    },
    [hasDraft, importRunning],
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
  // Step 5 has its own buttons, so the footer only serves steps 1 to 4.
  const showFooter = state.step !== "import" && !state.started;
  const stepControlsFooter = state.step === "mapping" || state.step === "options" || state.step === "review";

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
          ) : state.step === "review" ? (
            <ReviewStep wizard={wizard} onFooterChange={setStepFooter} />
          ) : (
            <ImportStep wizard={wizard} onPhaseChange={setRunPhase} />
          )}
        </div>

        {showFooter && (
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
        )}
      </div>

      <ImportConfirmDialog
        isOpen={leaveOpen}
        title={importRunning ? "Leave this page?" : "Leave without importing?"}
        message={
          importRunning
            ? "Your import will keep running on the server."
            : "Your uploaded file and column choices will be discarded. Nothing has been added to your leads."
        }
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
