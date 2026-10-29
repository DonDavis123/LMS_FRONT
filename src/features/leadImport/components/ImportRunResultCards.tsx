"use client";

import { AlertTriangle, Ban, CheckCircle2, Info, WifiOff } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, type ReactNode } from "react";
import ImportCounterTiles from "@/features/leadImport/components/ImportCounterTiles";
import type { RunnerError } from "@/features/leadImport/hooks/useImportRunner";
import type { ProgressResult } from "@/features/leadImport/types/leadImport.types";
import { formatCount } from "@/features/leadImport/utils/format";
import {
  IMPORT_HISTORY_PATH,
  IMPORT_PATH,
  LEADS_PATH,
  importReportPath,
  importRunPath,
} from "@/features/leadImport/utils/importRoutes";
import { card, primaryButton, secondaryButton } from "@/features/leadImport/utils/reviewStyles";
import { isCancelled, notAddedHint, rowsLine } from "@/features/leadImport/utils/runProgress";

/** A heading that takes focus when a result appears, so screen reader users hear the outcome. */
function ResultHeading({ id, children }: { id: string; children: ReactNode }) {
  const ref = useRef<HTMLHeadingElement>(null);
  useEffect(() => ref.current?.focus(), []);
  return (
    <h2 id={id} ref={ref} tabIndex={-1} className="font-serif text-lg text-fg outline-none">
      {children}
    </h2>
  );
}

function ErrorText({ error }: { error: RunnerError }) {
  return (
    <>
      <p className="mt-1 text-sm text-fg">{error.message}</p>
      {error.howToFix && <p className="mt-1 text-sm text-ink-soft">{error.howToFix}</p>}
    </>
  );
}

/* ------------------------------ finished ------------------------------ */

export function FinishedCard({
  jobId,
  progress,
  alreadyFinished,
  onImportAnother,
}: {
  jobId: string;
  progress: ProgressResult;
  alreadyFinished: boolean;
  onImportAnother?: () => void;
}) {
  const cancelled = isCancelled(progress);
  const hint = notAddedHint(progress);
  const headline = alreadyFinished
    ? "This import has already finished"
    : cancelled
      ? "Import cancelled"
      : progress.message || "Import finished";
  const detail = cancelled
    ? `The import was cancelled after ${rowsLine(progress)}. Rows already added were kept. You can undo them later from the history.`
    : alreadyFinished
      ? progress.message || null
      : null;

  return (
    <section className={`${card} p-4 sm:p-6`} role="status" aria-labelledby="import-finished-title">
      <div className="flex items-start gap-3">
        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full animate-pop-in ${
            cancelled ? "bg-paper text-slate" : "bg-success-soft text-success"
          }`}
        >
          {cancelled ? <Ban size={18} aria-hidden="true" /> : <CheckCircle2 size={18} aria-hidden="true" />}
        </span>
        <div className="min-w-0">
          <ResultHeading id="import-finished-title">{headline}</ResultHeading>
          {detail && <p className="mt-1 text-sm text-ink-soft">{detail}</p>}
          {!cancelled && (
            <p className="mt-1 text-sm tabular-nums text-ink-soft">{rowsLine(progress)} processed.</p>
          )}
        </div>
      </div>

      <div className="mt-4">
        <ImportCounterTiles progress={progress} />
      </div>

      {hint && (
        <p className="mt-4 flex items-start gap-1.5 rounded-md bg-paper px-3 py-2 text-sm text-fg">
          <Info size={14} className="mt-0.5 shrink-0 text-slate" aria-hidden="true" />
          {hint}
        </p>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <Link href={importReportPath(jobId)} className={primaryButton}>
          View report
        </Link>
        {onImportAnother ? (
          <button type="button" className={secondaryButton} onClick={onImportAnother}>
            Import another file
          </button>
        ) : (
          <Link href={IMPORT_PATH} className={secondaryButton}>
            Import another file
          </Link>
        )}
        <Link href={LEADS_PATH} className={secondaryButton}>
          Go to leads
        </Link>
      </div>
    </section>
  );
}

/* ------------------------------- failed ------------------------------- */

export function FailedCard({
  jobId,
  progress,
  error,
}: {
  jobId: string;
  progress: ProgressResult | null;
  error: RunnerError | null;
}) {
  const message = error?.message ?? progress?.message ?? "The import stopped before it finished.";
  const added = progress ? progress.created + progress.updated : 0;
  return (
    <section
      role="alert"
      className="rounded-lg border border-danger/30 bg-danger-soft p-4 sm:p-6"
      aria-labelledby="import-failed-title"
    >
      <div className="flex items-start gap-3">
        <AlertTriangle size={20} className="mt-0.5 shrink-0 text-danger" aria-hidden="true" />
        <div className="min-w-0">
          <ResultHeading id="import-failed-title">The import could not finish</ResultHeading>
          {error ? (
            <ErrorText error={error} />
          ) : (
            <p className="mt-1 text-sm text-fg">{message}</p>
          )}
          {progress && (
            <p className="mt-1 text-sm tabular-nums text-ink-soft">
              {formatCount(added)} {added === 1 ? "lead was" : "leads were"} added or updated before it stopped. The report
              shows what happened to every row.
            </p>
          )}
        </div>
      </div>
      <div className="mt-5 flex flex-wrap items-center gap-2">
        <Link href={importReportPath(jobId)} className={primaryButton}>
          View report
        </Link>
        <Link href={LEADS_PATH} className={secondaryButton}>
          Back to leads
        </Link>
      </div>
    </section>
  );
}

/* ----------------------------- interrupted ---------------------------- */

export function InterruptedCard({
  progress,
  checkingStatus,
  statusNote,
  onRetry,
  onCheckStatus,
}: {
  progress: ProgressResult | null;
  checkingStatus: boolean;
  statusNote: string | null;
  onRetry: () => void;
  onCheckStatus: () => void;
}) {
  return (
    <section className={`${card} p-4 sm:p-6`} aria-labelledby="import-interrupted-title">
      <div className="flex items-start gap-3">
        <WifiOff size={20} className="mt-0.5 shrink-0 text-slate" aria-hidden="true" />
        <div className="min-w-0">
          <ResultHeading id="import-interrupted-title">We lost the connection, but your import is safe on the server</ResultHeading>
          <p className="mt-1 text-sm text-ink-soft">
            It carries on by itself and you will get a notification when it finishes. You can try again now or check how far it
            has got.
          </p>
          {progress && <p className="mt-1 text-sm tabular-nums text-ink-soft">Last seen: {rowsLine(progress)}.</p>}
        </div>
      </div>
      {statusNote && (
        <p role="status" className="mt-3 rounded-md bg-paper px-3 py-2 text-sm text-fg">
          {statusNote}
        </p>
      )}
      <div className="mt-5 flex flex-wrap items-center gap-2">
        <button type="button" className={primaryButton} onClick={onRetry} disabled={checkingStatus}>
          Try again
        </button>
        <button type="button" className={secondaryButton} onClick={onCheckStatus} disabled={checkingStatus}>
          {checkingStatus ? "Checking..." : "Check status"}
        </button>
        <Link href={IMPORT_HISTORY_PATH} className={secondaryButton}>
          Go to import history
        </Link>
      </div>
    </section>
  );
}

/* ------------------------------- blocked ------------------------------ */

export function BlockedCard({ error, onBack }: { error: RunnerError | null; onBack?: () => void }) {
  const runningId = error?.extra.running_job_id;
  const fileName = error?.extra.running_file_name;
  return (
    <section role="alert" className={`${card} p-4 sm:p-6`} aria-labelledby="import-blocked-title">
      <div className="flex items-start gap-3">
        <Info size={20} className="mt-0.5 shrink-0 text-slate" aria-hidden="true" />
        <div className="min-w-0">
          <ResultHeading id="import-blocked-title">Another import is already running</ResultHeading>
          <p className="mt-1 break-words text-sm text-fg">
            {fileName
              ? `${fileName} is being imported right now. Only one import can run at a time.`
              : "Only one import can run at a time."}
          </p>
          {error && (
            <p className="mt-1 text-sm text-ink-soft">
              {error.message}
              {error.howToFix ? ` ${error.howToFix}` : ""}
            </p>
          )}
        </div>
      </div>
      <div className="mt-5 flex flex-wrap items-center gap-2">
        {runningId && (
          <Link href={importRunPath(runningId)} className={primaryButton}>
            Open it
          </Link>
        )}
        {onBack && (
          <button type="button" className={secondaryButton} onClick={onBack}>
            Back to review
          </button>
        )}
        <Link href={IMPORT_HISTORY_PATH} className={secondaryButton}>
          Go to import history
        </Link>
      </div>
    </section>
  );
}

/* ------------------------- failed before start ------------------------ */

export function SettingsInvalidCard({
  error,
  onBack,
}: {
  error: RunnerError | null;
  onBack?: (step: "mapping" | "options" | "review") => void;
}) {
  const problems = error?.extra.errors ?? [];
  return (
    <section
      role="alert"
      className="rounded-lg border border-danger/30 bg-danger-soft p-4 sm:p-6"
      aria-labelledby="import-settings-title"
    >
      <div className="flex items-start gap-3">
        <AlertTriangle size={20} className="mt-0.5 shrink-0 text-danger" aria-hidden="true" />
        <div className="min-w-0">
          <ResultHeading id="import-settings-title">The import did not start</ResultHeading>
          {error ? (
            <ErrorText error={error} />
          ) : (
            <p className="mt-1 text-sm text-fg">Some of your settings need to change. Nothing was imported.</p>
          )}
          {problems.length > 0 && (
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-fg">
              {problems.map((problem, index) => (
                <li key={`${index}-${problem}`} className="break-words">
                  {problem}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      {onBack && (
        <div className="mt-5 flex flex-wrap items-center gap-2">
          <button type="button" className={secondaryButton} onClick={() => onBack("mapping")}>
            Back to column mapping
          </button>
          <button type="button" className={secondaryButton} onClick={() => onBack("options")}>
            Back to options
          </button>
          <button type="button" className={secondaryButton} onClick={() => onBack("review")}>
            Back to review
          </button>
        </div>
      )}
    </section>
  );
}

/* ------------------------------ not found ----------------------------- */

export function NotFoundCard() {
  return (
    <section className={`${card} p-4 sm:p-6`} aria-labelledby="import-notfound-title">
      <ResultHeading id="import-notfound-title">This import was not found</ResultHeading>
      <p className="mt-1 text-sm text-ink-soft">
        It may have been discarded, or the link may be wrong. Your import history lists every import you can open.
      </p>
      <div className="mt-5 flex flex-wrap items-center gap-2">
        <Link href={IMPORT_HISTORY_PATH} className={primaryButton}>
          Go to import history
        </Link>
        <Link href={LEADS_PATH} className={secondaryButton}>
          Go to leads
        </Link>
      </div>
    </section>
  );
}

/* ------------------------------ skeleton ------------------------------ */

export function RunSkeleton() {
  return (
    <div className={`${card} space-y-4 p-4 sm:p-6`} aria-busy="true" aria-label="Loading import">
      <div className="h-6 w-48 animate-shimmer rounded" />
      <div className="h-2.5 animate-shimmer rounded-full" />
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {Array.from({ length: 5 }, (_, index) => (
          <div key={index} className="h-14 animate-shimmer rounded-md" />
        ))}
      </div>
    </div>
  );
}
