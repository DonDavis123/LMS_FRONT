"use client";

import { useEffect, useRef, useState } from "react";
import ShowMoreFields from "@/shared/components/ShowMoreFields";
import type { LeadImportWizard } from "@/features/leadImport/hooks/useLeadImportWizard";
import { useLeadFileUpload } from "@/features/leadImport/hooks/useLeadFileUpload";
import { LeadImportService } from "@/features/leadImport/services/LeadImportService";
import { formatBytes, formatCount } from "@/features/leadImport/utils/format";
import BeforeYouStart from "@/features/leadImport/components/BeforeYouStart";
import FileSettingsFields from "@/features/leadImport/components/FileSettingsFields";
import ImportConfirmDialog from "@/features/leadImport/components/ImportConfirmDialog";
import ImportToast, { useImportToast } from "@/features/leadImport/components/ImportToast";
import SampleRowsTable from "@/features/leadImport/components/SampleRowsTable";
import TemplateMenu from "@/features/leadImport/components/TemplateMenu";
import UploadDropZone from "@/features/leadImport/components/UploadDropZone";
import UploadErrorPanel from "@/features/leadImport/components/UploadErrorPanel";
import UploadProgressCard from "@/features/leadImport/components/UploadProgressCard";
import UploadSummary from "@/features/leadImport/components/UploadSummary";
import UploadWarnings from "@/features/leadImport/components/UploadWarnings";

interface UploadStepProps {
  wizard: LeadImportWizard;
  /** Tells the shell to disable Continue while a file is being uploaded. */
  onBusyChange: (busy: boolean) => void;
}

const secondaryButton =
  "inline-flex items-center gap-1.5 rounded-md border border-line bg-surface px-3 py-1.5 text-sm font-medium text-fg transition hover:bg-paper active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber";

type PendingConfirm = "replace" | "apply" | null;

/** Step 1: choose a file, upload it, and see what was read. */
export default function UploadStep({ wizard, onBusyChange }: UploadStepProps) {
  const { state, hasLaterStepWork } = wizard;
  const { upload, file } = state;

  const inputRef = useRef<HTMLInputElement>(null);
  const headerInputRef = useRef<HTMLInputElement>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [confirm, setConfirm] = useState<PendingConfirm>(null);
  const { toast, showToast } = useImportToast();

  const uploader = useLeadFileUpload({ upload, file, onUploaded: wizard.setUpload });
  const { phase, busy, failure, limits, settings } = uploader;

  useEffect(() => {
    onBusyChange(busy);
    return () => onBusyChange(false);
  }, [busy, onBusyChange]);

  const fileForDisplay = uploader.activeFile;
  const reuploading = busy && phase.kind !== "idle" && phase.reupload;

  /* ---------------- actions ---------------- */

  function discardCurrentDraft() {
    if (upload) void LeadImportService.discard(upload.job_id).catch(() => undefined);
  }

  function doReplace() {
    discardCurrentDraft();
    wizard.reset();
    uploader.clearAll();
    setSettingsOpen(false);
  }

  function requestReplace() {
    if (hasLaterStepWork) setConfirm("replace");
    else doReplace();
  }

  function requestApply() {
    if (hasLaterStepWork) setConfirm("apply");
    else uploader.applySettings();
  }

  function chooseAnother() {
    if (upload) {
      // The old file is still the current draft, so this is a replace.
      uploader.dismissFailure();
      requestReplace();
      return;
    }
    uploader.dismissFailure();
    inputRef.current?.click();
  }

  function revealHeaderRow() {
    if (upload) {
      setSettingsOpen(true);
      window.requestAnimationFrame(() => headerInputRef.current?.focus());
    } else {
      uploader.revealSetting("header");
      window.requestAnimationFrame(() => headerInputRef.current?.focus());
    }
  }

  function revealSheet() {
    setSettingsOpen(true);
  }

  /* ---------------- error panel extras ---------------- */

  const code = failure?.code ?? null;
  const isHeaderRowError = code === "invalid_header_row" || code === "no_header_row";
  const isSheetError = code === "sheet_not_found" && (upload?.sheet_names.length ?? 0) > 1;
  const isSizeError = code === "too_many_rows" || code === "file_too_large";
  const tip = isSizeError
    ? `Tip: split the file into smaller files (up to ${formatCount(limits.max_rows)} rows and ${formatBytes(limits.max_bytes)} each) and import them one after another.`
    : null;

  /* ---------------- render ---------------- */

  const settingsFields = (showApplyLabel: string, showHeaderRow = true) => (
    <FileSettingsFields
      headerRowText={settings.headerRowText}
      headerRowError={settings.headerRowError}
      onHeaderRowChange={settings.setHeaderRowText}
      sheetNames={upload?.sheet_names ?? []}
      sheetName={settings.sheetName}
      onSheetChange={settings.setSheetName}
      showApply={settings.changed}
      canApply={settings.canApply}
      applying={busy}
      applyLabel={showApplyLabel}
      onApply={requestApply}
      headerInputRef={headerInputRef}
      showHeaderRow={showHeaderRow}
    />
  );

  return (
    <div className="space-y-4" aria-busy={busy}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-fg">{upload ? "Your file" : "Choose a file"}</h2>
          <p className="text-xs text-ink-soft">
            {upload
              ? "Check that this looks right, then continue to match the columns."
              : "Start with a CSV or Excel file. You can match its columns in the next step."}
          </p>
        </div>
        <TemplateMenu onError={(message) => showToast(message, "error")} />
      </div>

      {uploader.note && (
        <p className="rounded-md border border-line bg-paper px-3 py-2 text-xs text-ink-soft">{uploader.note}</p>
      )}

      {failure && (
        <UploadErrorPanel error={failure} tip={tip}>
          {failure.isNetwork && uploader.activeFile && (
            <button type="button" onClick={uploader.retry} className={secondaryButton}>
              Try again
            </button>
          )}
          {isHeaderRowError && (
            <button type="button" onClick={revealHeaderRow} className={secondaryButton}>
              Change header row
            </button>
          )}
          {isSheetError && (
            <button type="button" onClick={revealSheet} className={secondaryButton}>
              Choose another sheet
            </button>
          )}
          <button type="button" onClick={chooseAnother} className={secondaryButton}>
            Choose another file
          </button>
        </UploadErrorPanel>
      )}

      {/* A first upload failed on the header row: let the user fix it without choosing the file again. */}
      {!upload && uploader.reveal === "header" && fileForDisplay && (
        <div className="rounded-lg border border-line bg-surface px-4 pb-4">
          {settingsFields("Try again with this row")}
        </div>
      )}

      {!upload ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="min-w-0">
            {phase.kind !== "idle" ? (
              <UploadProgressCard
                phase={phase}
                fileName={fileForDisplay?.name ?? "Your file"}
                fileSize={fileForDisplay?.size ?? null}
                onCancel={uploader.cancel}
              />
            ) : (
              <UploadDropZone limits={limits} onFiles={uploader.selectFiles} inputRef={inputRef} />
            )}
          </div>
          <BeforeYouStart />
        </div>
      ) : (
        <>
          {phase.kind !== "idle" && (
            <UploadProgressCard
              phase={phase}
              fileName={fileForDisplay?.name ?? upload.file_name}
              fileSize={fileForDisplay?.size ?? null}
              onCancel={uploader.cancel}
            />
          )}

          <div className={reuploading ? "pointer-events-none space-y-4 opacity-60" : "space-y-4"} inert={reuploading}>
            <UploadSummary
              upload={upload}
              fileSize={file?.size ?? null}
              onReplace={requestReplace}
              replaceDisabled={busy}
            />
            <UploadWarnings warnings={upload.warnings} />
            <SampleRowsTable headers={upload.headers} rows={upload.sample_rows} />
            <div>
              <ShowMoreFields
                id="import-file-settings"
                expanded={settingsOpen}
                onToggle={() => setSettingsOpen((value) => !value)}
                moreLabel="File settings"
                lessLabel="Hide file settings"
              >
                {settingsFields("Apply")}
              </ShowMoreFields>
            </div>
          </div>
        </>
      )}

      {/* Progress and results are announced here, politely. */}
      <p className="sr-only" role="status" aria-live="polite">
        {uploader.announcement}
      </p>

      <ImportToast toast={toast} />

      <ImportConfirmDialog
        isOpen={confirm !== null}
        title={confirm === "apply" ? "Apply these settings?" : "Replace this file?"}
        message={
          confirm === "apply"
            ? "Your file will be read again, and the column choices and options you set in the next steps will be cleared."
            : "The current file is discarded and the column choices and options you set in the next steps are cleared."
        }
        confirmLabel={confirm === "apply" ? "Apply" : "Replace file"}
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          const action = confirm;
          setConfirm(null);
          if (action === "apply") uploader.applySettings();
          else if (action === "replace") doReplace();
        }}
      />
    </div>
  );
}
