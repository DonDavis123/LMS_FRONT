"use client";

import { Loader2 } from "lucide-react";
import { useState } from "react";
import ImportConfirmDialog from "@/features/leadImport/components/ImportConfirmDialog";
import ImportCounterTiles from "@/features/leadImport/components/ImportCounterTiles";
import { useRunClock } from "@/features/leadImport/hooks/useRunClock";
import { useThrottledValue } from "@/features/leadImport/hooks/useThrottledValue";
import { MAX_RETRIES, type RunnerError } from "@/features/leadImport/hooks/useImportRunner";
import type { ProgressResult } from "@/features/leadImport/types/leadImport.types";
import { formatDuration } from "@/features/leadImport/utils/format";
import { clampPercent, rowsLine } from "@/features/leadImport/utils/runProgress";
import { card, secondaryButton } from "@/features/leadImport/utils/reviewStyles";

interface ImportRunningCardProps {
  progress: ProgressResult | null;
  /** The cancel was sent; the bar stays where it is. */
  cancelling: boolean;
  reconnectAttempt: number;
  cancelError: RunnerError | null;
  onCancel: () => void;
}

export default function ImportRunningCard({
  progress,
  cancelling,
  reconnectAttempt,
  cancelError,
  onCancel,
}: ImportRunningCardProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const percent = clampPercent(progress?.percent);
  const { elapsed, secondsLeft } = useRunClock(progress, !cancelling);
  const message = useThrottledValue(progress?.message || "Working through your file...", 2000);

  return (
    <section className={`${card} p-4 sm:p-6`} aria-labelledby="import-running-title">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 id="import-running-title" className="font-serif text-lg text-fg">
            {cancelling ? "Stopping the import" : "Importing your leads"}
          </h2>
          <p className="mt-0.5 text-xs text-ink-soft">
            {cancelling ? "Rows already added are kept." : "Leave this page open to watch, or come back later."}
          </p>
        </div>
        <p className="text-2xl font-semibold tabular-nums text-fg" aria-hidden="true">
          {percent}%
        </p>
      </div>

      <div
        role="progressbar"
        aria-label="Import progress"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        aria-valuetext={`${percent}%, ${rowsLine(progress)}`}
        className="mt-4 h-2.5 w-full overflow-hidden rounded-full bg-line"
      >
        <div
          className="h-full rounded-full bg-amber transition-[width] duration-500 ease-out motion-reduce:transition-none"
          style={{ width: `${percent}%` }}
        />
      </div>

      <div className="mt-2 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 text-sm tabular-nums text-ink-soft">
        <span>{rowsLine(progress)}</span>
        <span>
          {cancelling
            ? null
            : secondsLeft !== null
              ? `Elapsed ${formatDuration(elapsed)} · about ${formatDuration(secondsLeft)} left`
              : `Elapsed ${formatDuration(elapsed)}`}
        </span>
      </div>

      <div className="mt-4">
        <ImportCounterTiles progress={progress} />
      </div>

      <p aria-live="polite" className="mt-4 min-h-5 text-sm text-fg">
        {cancelling ? "Stopping after the current batch..." : message}
      </p>

      {reconnectAttempt > 0 && !cancelling && (
        <p role="status" className="mt-2 flex items-center gap-1.5 text-xs text-ink-soft">
          <Loader2 size={14} className="shrink-0 animate-spin" aria-hidden="true" />
          Reconnecting... your import is safe on the server (try {reconnectAttempt} of {MAX_RETRIES}).
        </p>
      )}

      {cancelError && (
        <p role="alert" className="mt-2 rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">
          {cancelError.message}
          {cancelError.howToFix ? ` ${cancelError.howToFix}` : ""}
        </p>
      )}

      <p className="mt-4 border-t border-line pt-3 text-xs text-ink-soft">
        You can leave this page. The import carries on in the background and you will get a notification when it finishes.
      </p>

      {!cancelling && (
        <div className="mt-3">
          <button type="button" className={secondaryButton} onClick={() => setConfirmOpen(true)}>
            Cancel import
          </button>
        </div>
      )}

      <ImportConfirmDialog
        isOpen={confirmOpen}
        title="Cancel this import?"
        message="Rows already added will be kept. You can undo them later from the history."
        confirmLabel="Cancel import"
        cancelLabel="Keep importing"
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => {
          setConfirmOpen(false);
          onCancel();
        }}
      />
    </section>
  );
}
