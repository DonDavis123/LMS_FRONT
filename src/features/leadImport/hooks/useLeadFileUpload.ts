import { useCallback, useEffect, useRef, useState } from "react";
import { LeadImportService } from "@/features/leadImport/services/LeadImportService";
import { DEFAULT_IMPORT_LIMITS, type UploadResponse } from "@/features/leadImport/types/leadImport.types";
import { FOLDER_ERROR, checkFileBeforeUpload, type DroppedFiles } from "@/features/leadImport/utils/fileChecks";
import { formatCount } from "@/features/leadImport/utils/format";
import { getImportError, type ImportErrorInfo } from "@/features/leadImport/utils/importErrors";

export type UploadPhase =
  | { kind: "idle" }
  | { kind: "uploading"; percent: number; reupload: boolean }
  | { kind: "parsing"; reupload: boolean };

interface AttemptSettings {
  headerRow: number | null;
  sheetName: string | null;
}

/** What the user has typed in File settings but not applied yet. */
interface SettingsDraft {
  headerRowText?: string;
  sheetName?: string | null;
}

export type RevealedSetting = "header" | "sheet" | null;

interface Options {
  /** The current successful upload (from the wizard), if any. */
  upload: UploadResponse | null;
  /** The File kept by the wizard for the current upload. */
  file: File | null;
  /** Called with a successful upload. The wizard stores it and resets later steps. */
  onUploaded: (upload: UploadResponse, file: File) => void;
}

/** "3" -> 3. Anything that is not a whole number of 1 or more -> null. */
export function parseHeaderRow(text: string): number | null {
  const trimmed = text.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  const value = Number(trimmed);
  return value >= 1 ? value : null;
}

/**
 * Everything the upload screen does besides drawing: pre-checks, the upload
 * request with progress and cancel, errors, and re-uploading the same File
 * with a new header row or sheet. The File is never asked for twice.
 */
export function useLeadFileUpload({ upload, file, onUploaded }: Options) {
  const [phase, setPhase] = useState<UploadPhase>({ kind: "idle" });
  const [failure, setFailure] = useState<ImportErrorInfo | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const [draft, setDraft] = useState<SettingsDraft>({});
  const [reveal, setReveal] = useState<RevealedSetting>(null);
  /** The File of a first upload that failed, kept so "Try again" needs no new choice. */
  const [failedFile, setFailedFile] = useState<File | null>(null);
  const [lastAttempt, setLastAttempt] = useState<AttemptSettings>({ headerRow: null, sheetName: null });

  const runId = useRef(0);
  const controller = useRef<AbortController | null>(null);
  const lastBucket = useRef(-1);

  // Keep the latest values for the async run without re-creating callbacks.
  const latest = useRef({ upload, onUploaded });
  useEffect(() => {
    latest.current = { upload, onUploaded };
  });

  useEffect(
    () => () => {
      runId.current += 1;
      controller.current?.abort();
    },
    [],
  );

  const limits = upload?.limits ?? DEFAULT_IMPORT_LIMITS;
  const activeFile = file ?? failedFile;
  const busy = phase.kind !== "idle";

  const appliedHeaderRow = upload?.header_row ?? lastAttempt.headerRow ?? 1;
  const appliedSheet = upload ? upload.sheet_name : lastAttempt.sheetName;
  const headerRowText = draft.headerRowText ?? String(appliedHeaderRow);
  const sheetName = draft.sheetName !== undefined ? draft.sheetName : appliedSheet;
  const parsedHeaderRow = parseHeaderRow(headerRowText);
  const headerRowError =
    parsedHeaderRow === null
      ? "Enter a whole number, 1 or higher."
      : parsedHeaderRow > limits.max_rows
        ? `Enter a row number up to ${formatCount(limits.max_rows)}.`
        : null;
  const settingsChanged = parsedHeaderRow !== appliedHeaderRow || (sheetName ?? null) !== (appliedSheet ?? null);
  const canApply = Boolean(activeFile) && !busy && !headerRowError && settingsChanged;

  const run = useCallback(async (toSend: File, settings: AttemptSettings, reupload: boolean) => {
    const id = ++runId.current;
    controller.current?.abort();
    const abort = new AbortController();
    controller.current = abort;
    lastBucket.current = -1;

    setFailure(null);
    setReveal(null);
    setLastAttempt(settings);
    setPhase({ kind: "uploading", percent: 0, reupload });
    setAnnouncement(reupload ? "Re-reading your file with the new settings." : "Uploading your file.");

    try {
      const response = await LeadImportService.upload(
        toSend,
        {
          headerRow: settings.headerRow ?? undefined,
          sheetName: settings.sheetName,
        },
        (event) => {
          if (runId.current !== id || !event.total) return;
          const percent = Math.min(100, Math.round((event.loaded / event.total) * 100));
          if (percent >= 100) {
            setPhase((prev) => (prev.kind === "parsing" ? prev : { kind: "parsing", reupload }));
            setAnnouncement("Reading your file.");
            return;
          }
          setPhase((prev) => (prev.kind === "parsing" ? prev : { kind: "uploading", percent, reupload }));
          // Announce every 25% only, so a screen reader is not flooded.
          const bucket = Math.floor(percent / 25);
          if (bucket !== lastBucket.current && bucket > 0) {
            lastBucket.current = bucket;
            setAnnouncement(`Uploading, ${bucket * 25} percent.`);
          }
        },
        abort.signal,
      );
      if (runId.current !== id) return;

      const previous = latest.current.upload;
      // The new draft exists now, so the old one can go (best effort).
      if (reupload && previous && previous.job_id !== response.job_id) {
        void LeadImportService.discard(previous.job_id).catch(() => undefined);
      }

      setPhase({ kind: "idle" });
      setDraft({});
      setFailedFile(null);
      setAnnouncement(
        `File read. ${formatCount(response.total_rows)} ${response.total_rows === 1 ? "row" : "rows"} and ${formatCount(response.headers.length)} ${response.headers.length === 1 ? "column" : "columns"} found.`,
      );
      latest.current.onUploaded(response, toSend);
    } catch (error) {
      if (runId.current !== id) return;
      const info = getImportError(error, "We couldn't read this file. Please try again.");
      setPhase({ kind: "idle" });
      if (info.isCancelled) {
        setAnnouncement("Upload cancelled.");
        if (!reupload) setFailedFile(null);
        return;
      }
      setAnnouncement("The file could not be read.");
      setFailure(info);
      if (!reupload) setFailedFile(toSend);
    }
  }, []);

  /** Picks the first file, applies the client checks, then uploads. */
  const selectFiles = useCallback(
    ({ files, folderCount }: DroppedFiles) => {
      if (busy) return;
      setDraft({});
      setReveal(null);

      if (files.length === 0) {
        setNote(null);
        setFailedFile(null);
        if (folderCount > 0) setFailure(FOLDER_ERROR);
        return;
      }

      const first = files[0];
      const parts: string[] = [];
      if (files.length > 1) parts.push(`You chose ${files.length} files, so only the first one (${first.name}) is used.`);
      if (folderCount > 0) parts.push("Folders can't be imported and were ignored.");
      setNote(parts.length ? parts.join(" ") : null);

      const problem = checkFileBeforeUpload(first, limits);
      if (problem) {
        // Same panel as a server error, and no request is sent.
        setFailedFile(null);
        setFailure(problem);
        setAnnouncement("This file can't be imported.");
        return;
      }
      void run(first, { headerRow: null, sheetName: null }, false);
    },
    [busy, limits, run],
  );

  /** Re-uploads the SAME File with the header row / sheet shown in File settings. */
  const applySettings = useCallback(() => {
    if (!activeFile || busy || parsedHeaderRow === null || headerRowError) return;
    void run(activeFile, { headerRow: parsedHeaderRow, sheetName: sheetName ?? null }, Boolean(upload));
  }, [activeFile, busy, parsedHeaderRow, headerRowError, sheetName, upload, run]);

  /** Repeats the last attempt unchanged (used after a connection failure). */
  const retry = useCallback(() => {
    if (!activeFile || busy) return;
    void run(activeFile, lastAttempt, Boolean(upload));
  }, [activeFile, busy, lastAttempt, upload, run]);

  const cancel = useCallback(() => controller.current?.abort(), []);

  const dismissFailure = useCallback(() => {
    setFailure(null);
    setReveal(null);
    setFailedFile(null);
  }, []);

  const clearAll = useCallback(() => {
    setFailure(null);
    setReveal(null);
    setNote(null);
    setDraft({});
    setFailedFile(null);
    setAnnouncement("");
    setLastAttempt({ headerRow: null, sheetName: null });
  }, []);

  return {
    phase,
    busy,
    failure,
    note,
    announcement,
    limits,
    activeFile,
    reveal,
    revealSetting: setReveal,
    settings: {
      headerRowText,
      headerRowError,
      sheetName,
      canApply,
      changed: settingsChanged,
      setHeaderRowText: (text: string) => setDraft((prev) => ({ ...prev, headerRowText: text })),
      setSheetName: (name: string | null) => setDraft((prev) => ({ ...prev, sheetName: name })),
    },
    selectFiles,
    applySettings,
    retry,
    cancel,
    dismissFailure,
    clearAll,
  };
}
