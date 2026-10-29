"use client";

import { useEffect, useRef } from "react";
import ImportRunConfirmCard from "@/features/leadImport/components/ImportRunConfirmCard";
import ImportRunningCard from "@/features/leadImport/components/ImportRunningCard";
import {
  BlockedCard,
  FailedCard,
  FinishedCard,
  InterruptedCard,
  NotFoundCard,
  RunSkeleton,
  SettingsInvalidCard,
} from "@/features/leadImport/components/ImportRunResultCards";
import { useImportRunner, type RunnerMode, type RunnerPhase } from "@/features/leadImport/hooks/useImportRunner";
import type { ImportMapping, ImportOptions, ProgressResult } from "@/features/leadImport/types/leadImport.types";
import { clampPercent } from "@/features/leadImport/utils/runProgress";
import type { RunSummary } from "@/features/leadImport/utils/runSummary";

export type RunBackTarget = "mapping" | "options" | "review";

interface CommonProps {
  jobId: string;
  /** Called once, when the import finishes while this screen is following it. */
  onFinished?: (progress: ProgressResult) => void;
  /** Wizard only: go back to a step. */
  onBack?: (step: RunBackTarget) => void;
  /** Wizard only: reset the wizard. Without it, "Import another file" links to the wizard page. */
  onImportAnother?: () => void;
  /** The click on Start made this a real job (the wizard stops treating it as a draft). */
  onStarted?: () => void;
  /** The start was refused, so it is still a draft. */
  onStartFailed?: () => void;
  onPhaseChange?: (phase: RunnerPhase) => void;
}

export type ImportRunPanelProps = CommonProps &
  (
    | { mode: "start"; mapping: ImportMapping; options: ImportOptions; summary: RunSummary | null }
    | { mode: "resume" }
  );

/** Phases in which the tab title shows the percentage. */
const TITLE_PHASES: ReadonlySet<RunnerPhase> = new Set(["starting", "running", "cancelling"]);

/**
 * Step 5: confirm, run, and report the outcome of an import. The loop lives in
 * useImportRunner; this component only shows what it says.
 */
export default function ImportRunPanel(props: ImportRunPanelProps) {
  const { jobId, onFinished, onBack, onImportAnother, onStarted, onStartFailed, onPhaseChange } = props;

  const runnerMode: RunnerMode =
    props.mode === "start" ? { kind: "start", mapping: props.mapping, options: props.options } : { kind: "resume" };
  const runner = useImportRunner({ jobId, mode: runnerMode, onStarted, onStartFailed });
  const { phase, progress } = runner;

  useEffect(() => {
    onPhaseChange?.(phase);
  }, [phase, onPhaseChange]);

  // onFinished fires once, and not for an import that was already finished when opened.
  const finishedReported = useRef(false);
  useEffect(() => {
    if (phase === "finished" && progress && !runner.alreadyFinished && !finishedReported.current) {
      finishedReported.current = true;
      onFinished?.(progress);
    }
  }, [phase, progress, runner.alreadyFinished, onFinished]);

  // The tab title shows the progress while running and is restored afterwards.
  const titleActive = TITLE_PHASES.has(phase);
  const percent = clampPercent(progress?.percent);
  useEffect(() => {
    if (!titleActive) return;
    const original = document.title;
    return () => {
      document.title = original;
    };
  }, [titleActive]);
  useEffect(() => {
    if (titleActive) document.title = `Importing ${percent}%...`;
  }, [titleActive, percent]);

  switch (phase) {
    case "idle":
      return props.mode === "start" ? (
        <ImportRunConfirmCard summary={props.summary} onStart={runner.start} onBack={() => onBack?.("review")} />
      ) : null;

    case "starting":
    case "running":
    case "cancelling":
      if (phase === "starting" && props.mode === "resume" && !progress) return <RunSkeleton />;
      return (
        <ImportRunningCard
          progress={progress}
          cancelling={phase === "cancelling"}
          reconnectAttempt={runner.reconnectAttempt}
          cancelError={runner.cancelError}
          onCancel={runner.cancel}
        />
      );

    case "finished":
      return progress ? (
        <FinishedCard
          jobId={jobId}
          progress={progress}
          alreadyFinished={runner.alreadyFinished}
          onImportAnother={onImportAnother}
        />
      ) : null;

    case "failed":
      return <FailedCard jobId={jobId} progress={progress} error={runner.error} />;

    case "interrupted":
      return (
        <InterruptedCard
          progress={progress}
          checkingStatus={runner.checkingStatus}
          statusNote={runner.statusNote}
          onRetry={runner.retry}
          onCheckStatus={runner.checkStatus}
        />
      );

    case "blocked":
      return <BlockedCard error={runner.error} onBack={onBack ? () => onBack("review") : undefined} />;

    case "failed-before-start":
      return <SettingsInvalidCard error={runner.error} onBack={onBack} />;

    case "not-found":
      return <NotFoundCard />;

    default:
      return null;
  }
}
