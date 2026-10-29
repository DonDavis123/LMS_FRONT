import { useCallback, useEffect, useRef, useState } from "react";
import { LeadImportService } from "@/features/leadImport/services/LeadImportService";
import type { UndoPreview, UndoResult } from "@/features/leadImport/types/leadImport.types";
import { getImportError, type ImportErrorInfo } from "@/features/leadImport/utils/importErrors";

export type UndoPhase = "loading" | "ready" | "undoing" | "done" | "load-error";

/** Error codes of the undo endpoints that the dialog explains on its own. */
export const UNDO_REFRESH_CODES: ReadonlySet<string> = new Set(["already_undone", "nothing_to_undo"]);

/**
 * The state of the undo dialog for one import.
 * It never sends record ids: the preview is read-only and the undo sends only the job id.
 */
export function useUndoImport(jobId: string, onDone: (result: UndoResult) => void) {
  const [phase, setPhase] = useState<UndoPhase>("loading");
  const [preview, setPreview] = useState<UndoPreview | null>(null);
  const [loadError, setLoadError] = useState<ImportErrorInfo | null>(null);
  const [actionError, setActionError] = useState<ImportErrorInfo | null>(null);
  const [result, setResult] = useState<UndoResult | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const counter = useRef(0);
  const doneSent = useRef(false);
  const onDoneRef = useRef(onDone);
  useEffect(() => {
    onDoneRef.current = onDone;
  });

  const loadPreview = useCallback(async () => {
    const id = ++counter.current;
    try {
      const data = await LeadImportService.getUndoPreview(jobId);
      if (id !== counter.current) return;
      setPreview(data);
      setLoadError(null);
      setConfirmed(false);
      setPhase("ready");
    } catch (caught) {
      if (id !== counter.current) return;
      setLoadError(getImportError(caught, "We could not check what the undo would do."));
      setPhase("load-error");
    }
  }, [jobId]);

  useEffect(() => {
    void loadPreview();
  }, [loadPreview]);

  const retry = useCallback(() => {
    setPhase("loading");
    setActionError(null);
    void loadPreview();
  }, [loadPreview]);

  const confirm = useCallback(async () => {
    if (!confirmed || phase !== "ready" || !preview?.can_undo) return;
    setPhase("undoing");
    setActionError(null);
    try {
      const data = await LeadImportService.undo(jobId);
      setResult(data);
      setPhase("done");
      if (!doneSent.current) {
        doneSent.current = true;
        onDoneRef.current(data);
      }
    } catch (caught) {
      const info = getImportError(caught, "We could not undo this import.");
      setActionError(info);
      setConfirmed(false);
      setPhase("ready");
      // The import was already undone (or has nothing left): show what the server says now.
      // After a lost connection the undo may have finished, so look again as well.
      if ((info.code && UNDO_REFRESH_CODES.has(info.code)) || info.isNetwork) void loadPreview();
    }
  }, [confirmed, phase, preview, jobId, loadPreview]);

  return { phase, preview, loadError, actionError, result, confirmed, setConfirmed, confirm, retry };
}
