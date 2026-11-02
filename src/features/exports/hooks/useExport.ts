import { useCallback, useEffect, useRef, useState } from "react";
import { ExportService } from "@/features/exports/services/ExportService";
import type { ExportEntity, ExportFormat, ExportQuery } from "@/features/exports/types/export.types";
import { extractApiError } from "@/shared/utils/apiError";
import { saveBlob } from "@/shared/utils/download";

export interface ExportNotice {
  tone: "success" | "error";
  text: string;
}

const SUCCESS_VISIBLE_MS = 4000;
const ERROR_VISIBLE_MS = 7000;

/**
 * Runs one export at a time: asks the server for the file, saves it, and keeps
 * a short notice (success or a plain-English failure) for the screen to show.
 * Failures stay on the page; they never open a browser dialog.
 */
export function useExport(entity: ExportEntity, noun: string) {
  const [busyFormat, setBusyFormat] = useState<ExportFormat | null>(null);
  const [notice, setNotice] = useState<ExportNotice | null>(null);
  const timerRef = useRef<number | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const showNotice = useCallback(
    (next: ExportNotice) => {
      clearTimer();
      setNotice(next);
      timerRef.current = window.setTimeout(
        () => setNotice(null),
        next.tone === "error" ? ERROR_VISIBLE_MS : SUCCESS_VISIBLE_MS,
      );
    },
    [clearTimer],
  );

  useEffect(() => clearTimer, [clearTimer]);

  const run = useCallback(
    async (query: ExportQuery, format: ExportFormat) => {
      if (busyFormat) return;
      setBusyFormat(format);
      setNotice(null);
      clearTimer();
      try {
        const file = await ExportService.exportRecords(entity, query, format);
        saveBlob(file.blob, file.fileName);
        showNotice({ tone: "success", text: `Your ${noun} export is ready: ${file.fileName}` });
      } catch (error) {
        showNotice({
          tone: "error",
          text: extractApiError(error, `Couldn't export ${noun}. Check your connection and try again.`),
        });
      } finally {
        setBusyFormat(null);
      }
    },
    [busyFormat, clearTimer, entity, noun, showNotice],
  );

  const dismissNotice = useCallback(() => {
    clearTimer();
    setNotice(null);
  }, [clearTimer]);

  return { busyFormat, notice, run, dismissNotice };
}
