"use client";

import { RefreshCw } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useId, useRef } from "react";
import UndoPreviewBody, { UndoErrorAlert } from "@/features/leadImport/components/UndoPreviewBody";
import UndoResultView from "@/features/leadImport/components/UndoResultView";
import { useFocusTrap } from "@/features/leadImport/hooks/useFocusTrap";
import { useUndoImport } from "@/features/leadImport/hooks/useUndoImport";
import type { UndoResult } from "@/features/leadImport/types/leadImport.types";
import { importReportPath } from "@/features/leadImport/utils/importRoutes";
import { primaryButton, secondaryButton } from "@/features/leadImport/utils/reviewStyles";
import Modal from "@/shared/components/Modal";

const dangerButton =
  "inline-flex items-center justify-center gap-1.5 rounded-md bg-danger px-3 py-1.5 text-sm font-semibold text-white transition hover:opacity-90 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fg disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100";

export interface UndoImportDialogProps {
  jobId: string;
  fileName: string;
  isOpen: boolean;
  onClose: () => void;
  /** Called once when the undo has finished (fully or partly), so the caller can refresh. */
  onDone: (result: UndoResult) => void;
}

function UndoSkeleton() {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Checking what the undo would do">
      <div className="h-4 w-32 animate-shimmer rounded" />
      <div className="h-16 animate-shimmer rounded-md" />
      <div className="h-4 w-48 animate-shimmer rounded" />
      <div className="h-10 animate-shimmer rounded-md" />
    </div>
  );
}

function UndoingCard() {
  return (
    <div role="status" aria-live="polite" className="rounded-md border border-line bg-paper p-3">
      <div className="flex items-center gap-2 text-sm font-medium text-fg">
        <span aria-hidden="true" className="inline-block h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-line border-t-amber" />
        Undoing the import...
      </div>
      <p className="mt-1 text-xs text-ink-soft">Large imports can take a minute. Please keep this window open.</p>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-line" aria-hidden="true">
        <div className="h-full w-full animate-shimmer rounded-full" />
      </div>
    </div>
  );
}

interface UndoDialogContentProps extends Omit<UndoImportDialogProps, "isOpen"> {
  titleId: string;
  onBusyChange: (busy: boolean) => void;
}

function UndoDialogContent({ jobId, fileName, titleId, onClose, onDone, onBusyChange }: UndoDialogContentProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  useFocusTrap(rootRef);
  const undo = useUndoImport(jobId, onDone);
  const { phase, preview, result } = undo;
  const busy = phase === "undoing";
  useEffect(() => {
    onBusyChange(busy);
    return () => onBusyChange(false);
  }, [busy, onBusyChange]);

  const canConfirm = phase === "ready" && !!preview?.can_undo && undo.confirmed;
  const name = fileName || preview?.file_name || "this file";

  return (
    <div ref={rootRef} tabIndex={-1} aria-busy={busy} className="flex min-h-0 flex-1 flex-col outline-none">
      <div className="border-b border-line px-4 py-3 pr-12 sm:px-5">
        <h2 id={titleId} className="break-words font-serif text-lg leading-tight text-fg">
          Undo import of {name}
        </h2>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5">
        {phase === "loading" && <UndoSkeleton />}
        {phase === "load-error" && undo.loadError && <UndoErrorAlert error={undo.loadError} />}
        {(phase === "ready" || phase === "undoing") && preview && (
          <UndoPreviewBody
            preview={preview}
            actionError={undo.actionError}
            confirmed={undo.confirmed}
            onConfirmedChange={undo.setConfirmed}
            busy={busy}
          />
        )}
        {phase === "done" && result && <UndoResultView result={result} />}
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line px-4 py-3 sm:px-5">
        {busy ? (
          <div className="mr-auto w-full sm:w-auto sm:flex-1">
            <UndoingCard />
          </div>
        ) : null}
        {phase === "done" ? (
          <>
            <button type="button" onClick={onClose} className={secondaryButton}>
              Close
            </button>
            <Link href={importReportPath(jobId)} onClick={onClose} className={primaryButton}>
              View report
            </Link>
          </>
        ) : phase === "load-error" ? (
          <>
            <button type="button" onClick={onClose} className={secondaryButton}>
              Close
            </button>
            <button type="button" onClick={undo.retry} className={primaryButton}>
              <RefreshCw size={14} aria-hidden="true" />
              Try again
            </button>
          </>
        ) : phase === "ready" && preview && !preview.can_undo ? (
          <button type="button" onClick={onClose} className={secondaryButton}>
            Close
          </button>
        ) : (
          <>
            <button type="button" onClick={onClose} disabled={busy} className={secondaryButton}>
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void undo.confirm()}
              disabled={!canConfirm || busy}
              aria-label={`Undo import of ${name}`}
              className={dangerButton}
            >
              {busy ? "Undoing..." : "Undo import"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

/**
 * Confirms and runs the undo of one import. Both entry points (history row, report header) open this dialog.
 * Escape, the backdrop and the X do nothing while the undo is running.
 */
export default function UndoImportDialog({ jobId, fileName, isOpen, onClose, onDone }: UndoImportDialogProps) {
  const titleId = useId();
  const busyRef = useRef(false);
  const setBusy = useCallback((busy: boolean) => {
    busyRef.current = busy;
  }, []);
  const handleClose = useCallback(() => {
    if (!busyRef.current) onClose();
  }, [onClose]);

  return (
    <Modal isOpen={isOpen} onClose={handleClose} maxWidthClass="max-w-xl" ariaLabelledBy={titleId}>
      <UndoDialogContent titleId={titleId} jobId={jobId} fileName={fileName} onClose={handleClose} onDone={onDone} onBusyChange={setBusy} />
    </Modal>
  );
}
