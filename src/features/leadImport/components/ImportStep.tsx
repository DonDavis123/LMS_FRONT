"use client";

import { useCallback, useMemo } from "react";
import ImportRunPanel from "@/features/leadImport/components/ImportRunPanel";
import type { LeadImportWizard } from "@/features/leadImport/hooks/useLeadImportWizard";
import type { RunnerPhase } from "@/features/leadImport/hooks/useImportRunner";
import { buildRunSummary } from "@/features/leadImport/utils/runSummary";

interface ImportStepProps {
  wizard: LeadImportWizard;
  onPhaseChange: (phase: RunnerPhase) => void;
}

/** Step 5 inside the wizard: connects the run panel to the wizard state. */
export default function ImportStep({ wizard, onPhaseChange }: ImportStepProps) {
  const { state, setStarted, setProgress, goTo, reset } = wizard;
  const { upload, mapping, options, check, checkIsStale, owners } = state;

  const summary = useMemo(
    () => (upload ? buildRunSummary({ upload, check, checkIsStale, options, owners }) : null),
    [upload, check, checkIsStale, options, owners],
  );

  const handleStarted = useCallback(() => setStarted(true), [setStarted]);
  const handleStartFailed = useCallback(() => setStarted(false), [setStarted]);
  // Starting is over when this fires, so going back is allowed again for a refused start.
  const handleBack = useCallback((step: "mapping" | "options" | "review") => goTo(step), [goTo]);

  if (!upload) return null;
  return (
    <ImportRunPanel
      mode="start"
      jobId={upload.job_id}
      mapping={mapping}
      options={options}
      summary={summary}
      onStarted={handleStarted}
      onStartFailed={handleStartFailed}
      onFinished={setProgress}
      onBack={handleBack}
      onImportAnother={reset}
      onPhaseChange={onPhaseChange}
    />
  );
}
