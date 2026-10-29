import { useCallback, useEffect, useState } from "react";
import { LeadImportService } from "@/features/leadImport/services/LeadImportService";
import type { ImportReport } from "@/features/leadImport/types/leadImport.types";
import { getImportError, type ImportErrorInfo } from "@/features/leadImport/utils/importErrors";

export type ReportStatus = "loading" | "ready" | "not-found" | "error";

/** Loads one import report. Retry with reload(); refresh() reloads quietly. */
export function useImportReport(jobId: string) {
  const [status, setStatus] = useState<ReportStatus>("loading");
  const [report, setReport] = useState<ImportReport | null>(null);
  const [error, setError] = useState<ImportErrorInfo | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    LeadImportService.getReport(jobId)
      .then((data) => {
        if (cancelled) return;
        setReport(data);
        setError(null);
        setStatus("ready");
      })
      .catch((caught: unknown) => {
        if (cancelled) return;
        const info = getImportError(caught, "We could not load this report.");
        setError(info);
        setStatus(info.status === 404 || info.code === "import_not_found" ? "not-found" : "error");
      });
    return () => {
      cancelled = true;
    };
  }, [jobId, attempt]);

  const reload = useCallback(() => {
    setStatus("loading");
    setAttempt((value) => value + 1);
  }, []);

  /** Loads the report again without the loading screen, so an open dialog stays on screen. */
  const refresh = useCallback(() => {
    setAttempt((value) => value + 1);
  }, []);

  return { status, report, error, reload, refresh };
}
