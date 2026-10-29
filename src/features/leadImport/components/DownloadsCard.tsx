"use client";

import { AlertTriangle, Download } from "lucide-react";
import Link from "next/link";
import { useId, useState } from "react";
import ImportToast, { useImportToast } from "@/features/leadImport/components/ImportToast";
import { useReportDownload, type DownloadKind } from "@/features/leadImport/hooks/useReportDownload";
import type { ImportFileFormat, ImportReport } from "@/features/leadImport/types/leadImport.types";
import { IMPORT_PATH } from "@/features/leadImport/utils/importRoutes";
import { card, primaryButton, secondaryButton } from "@/features/leadImport/utils/reviewStyles";
import Select from "@/shared/components/Select";
import Spinner from "@/shared/components/Spinner";

const FORMAT_OPTIONS = [
  { value: "xlsx", label: "Excel (.xlsx)" },
  { value: "csv", label: "CSV (.csv)" },
];

const STEPS = [
  "Download the file.",
  "Correct the cells. The Problem and How to fix columns tell you what to change.",
  "Upload it again as a new import.",
];

function rejectedReason(report: ImportReport): string | null {
  const { files } = report;
  if (files.rejected_available) return null;
  if (files.rows_purged) return files.message || "These rows were removed 30 days after the import, so the file is no longer available.";
  return files.message || "There are no rows to fix. Every row was added, updated or left out on purpose.";
}

function resultsReason(report: ImportReport): string | null {
  const { files } = report;
  if (files.results_available) return null;
  if (files.rows_purged) return files.message || "These rows were removed 30 days after the import, so the file is no longer available.";
  return files.message || "The results file is not available for this import.";
}

function FormatSelect({ value, onChange, label, disabled }: { value: ImportFileFormat; onChange: (v: ImportFileFormat) => void; label: string; disabled: boolean }) {
  return (
    <div className="w-full sm:w-48">
      <Select
        value={value}
        options={FORMAT_OPTIONS}
        onChange={(next) => onChange(next === "csv" ? "csv" : "xlsx")}
        ariaLabel={label}
        disabled={disabled}
        size="sm"
      />
    </div>
  );
}

export default function DownloadsCard({ report }: { report: ImportReport }) {
  const jobId = report.job.id;
  const { toast, showToast } = useImportToast();
  const { busy, failure, download } = useReportDownload({ jobId, onSaved: showToast });
  const [rejectedFormat, setRejectedFormat] = useState<ImportFileFormat>("xlsx");
  const [resultsFormat, setResultsFormat] = useState<ImportFileFormat>("xlsx");
  const [includeExcluded, setIncludeExcluded] = useState(false);
  const checkboxId = useId();
  const rejectedNote = useId();
  const resultsNote = useId();

  const rejectedBlock = rejectedReason(report);
  const resultsBlock = resultsReason(report);
  const anyBusy = busy !== null;

  function banner(kind: DownloadKind) {
    if (!failure || failure.kind !== kind) return null;
    return (
      <div role="alert" className="mt-3 flex items-start gap-2 rounded-md border border-line bg-paper px-3 py-2 text-sm">
        <AlertTriangle size={14} className="mt-0.5 shrink-0 text-amber-dark" aria-hidden="true" />
        <div className="min-w-0">
          <p className="text-fg">{failure.error.message}</p>
          {failure.error.howToFix && <p className="mt-0.5 text-ink-soft">{failure.error.howToFix}</p>}
        </div>
      </div>
    );
  }

  return (
    <section className={`${card} p-4`} aria-labelledby="downloads-title">
      <h2 id="downloads-title" className="font-serif text-base text-fg">
        Downloads
      </h2>

      {/* Rows to fix: the main action */}
      <div className="mt-3">
        <h3 className="text-sm font-semibold text-fg">Rows to fix</h3>
        <p className="mt-0.5 text-xs text-ink-soft">The rows that were not added, with the reason for each.</p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <FormatSelect value={rejectedFormat} onChange={setRejectedFormat} label="File format for rows to fix" disabled={anyBusy || rejectedBlock !== null} />
        </div>
        <label htmlFor={checkboxId} className="mt-3 flex items-center gap-2 text-sm text-fg">
          <input
            id={checkboxId}
            type="checkbox"
            checked={includeExcluded}
            disabled={anyBusy || rejectedBlock !== null}
            onChange={(event) => setIncludeExcluded(event.target.checked)}
            className="h-4 w-4 rounded border-line accent-slate focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber"
          />
          Also include rows I left out
        </label>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            className={primaryButton}
            disabled={anyBusy || rejectedBlock !== null}
            aria-describedby={rejectedBlock ? rejectedNote : undefined}
            onClick={() => void download("rejected", rejectedFormat, includeExcluded)}
          >
            {busy === "rejected" ? <Spinner size="sm" /> : <Download size={14} aria-hidden="true" />}
            {busy === "rejected" ? "Preparing..." : "Download rows to fix"}
          </button>
          {rejectedBlock ? (
            <span className={`${secondaryButton} cursor-not-allowed opacity-50`} aria-disabled="true">
              Upload the fixed file
            </span>
          ) : (
            <Link href={IMPORT_PATH} className={secondaryButton}>
              Upload the fixed file
            </Link>
          )}
        </div>
        {rejectedBlock && (
          <p id={rejectedNote} className="mt-2 text-xs text-ink-soft">
            {rejectedBlock}
          </p>
        )}
        {banner("rejected")}

        {!rejectedBlock && (
          <ol className="mt-4 space-y-2 border-t border-line pt-3">
            {STEPS.map((text, index) => (
              <li key={text} className="flex items-start gap-2 text-xs text-ink-soft">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-line bg-paper text-[11px] font-semibold tabular-nums text-fg">
                  {index + 1}
                </span>
                <span className="pt-0.5">{text}</span>
              </li>
            ))}
          </ol>
        )}
      </div>

      {/* Full results: secondary */}
      <div className="mt-5 border-t border-line pt-4">
        <h3 className="text-sm font-semibold text-fg">Full results</h3>
        <p className="mt-0.5 text-xs text-ink-soft">Every uploaded row with its result, details and owner.</p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <FormatSelect value={resultsFormat} onChange={setResultsFormat} label="File format for full results" disabled={anyBusy || resultsBlock !== null} />
          <button
            type="button"
            className={secondaryButton}
            disabled={anyBusy || resultsBlock !== null}
            aria-describedby={resultsBlock ? resultsNote : undefined}
            onClick={() => void download("results", resultsFormat)}
          >
            {busy === "results" ? <Spinner size="sm" /> : <Download size={14} aria-hidden="true" />}
            {busy === "results" ? "Preparing..." : "Download all rows with results"}
          </button>
        </div>
        {resultsBlock && (
          <p id={resultsNote} className="mt-2 text-xs text-ink-soft">
            {resultsBlock}
          </p>
        )}
        {banner("results")}
      </div>

      <ImportToast toast={toast} />
    </section>
  );
}
