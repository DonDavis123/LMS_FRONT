import { useCallback, useState } from "react";
import { LeadImportService } from "@/features/leadImport/services/LeadImportService";
import type { ImportFileFormat } from "@/features/leadImport/types/leadImport.types";
import { saveBlob } from "@/features/leadImport/utils/download";
import { getImportError, type ImportErrorInfo } from "@/features/leadImport/utils/importErrors";

export type DownloadKind = "rejected" | "results";

interface UseReportDownloadArgs {
  jobId: string;
  onSaved: (message: string) => void;
}

/** Downloads one of the two files. Errors stay in the card (never a browser dialog). */
export function useReportDownload({ jobId, onSaved }: UseReportDownloadArgs) {
  const [busy, setBusy] = useState<DownloadKind | null>(null);
  const [failure, setFailure] = useState<{ kind: DownloadKind; error: ImportErrorInfo } | null>(null);

  const download = useCallback(
    async (kind: DownloadKind, format: ImportFileFormat, includeExcluded = false) => {
      if (busy) return;
      setBusy(kind);
      setFailure(null);
      try {
        const file =
          kind === "rejected"
            ? await LeadImportService.downloadRejected(jobId, format, includeExcluded)
            : await LeadImportService.downloadResults(jobId, format);
        saveBlob(file.blob, file.fileName);
        onSaved(kind === "rejected" ? "Rows to fix downloaded." : "Results downloaded.");
      } catch (caught) {
        setFailure({ kind, error: getImportError(caught, "We could not prepare this file.") });
      } finally {
        setBusy(null);
      }
    },
    [busy, jobId, onSaved],
  );

  const clearFailure = useCallback(() => setFailure(null), []);
  return { busy, failure, download, clearFailure };
}
