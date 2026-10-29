"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import type { ImportReport } from "@/features/leadImport/types/leadImport.types";
import { IMPORT_HISTORY_PATH, IMPORT_PATH } from "@/features/leadImport/utils/importRoutes";
import { primaryButton } from "@/features/leadImport/utils/reviewStyles";
import { importedByLine, statusChip, type StatusTone } from "@/features/leadImport/utils/reportView";

const TONE_CLASS: Record<StatusTone, string> = {
  success: "border-success/30 bg-success-soft text-success",
  danger: "border-danger/30 bg-danger-soft text-danger",
  warning: "border-amber/40 bg-paper text-fg",
  info: "border-slate/30 bg-slate-light text-slate",
  neutral: "border-line bg-paper text-ink-soft",
};

export function StatusChip({ report }: { report: ImportReport }) {
  const chip = statusChip(report.job);
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-medium ${TONE_CLASS[chip.tone]}`}
    >
      {chip.label}
    </span>
  );
}

interface ReportHeaderProps {
  report: ImportReport;
  /** Filled by the undo part: extra buttons next to "Import another file". */
  actions?: ReactNode;
  /** Hide the primary action while the import is still running. */
  showPrimary?: boolean;
}

export default function ReportHeader({ report, actions, showPrimary = true }: ReportHeaderProps) {
  const { job } = report;
  return (
    <header className="mb-4">
      <Link
        href={IMPORT_HISTORY_PATH}
        className="inline-flex items-center gap-1 rounded text-xs font-medium text-slate underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber"
      >
        <ArrowLeft size={14} aria-hidden="true" />
        Back to import history
      </Link>
      <div className="mt-2 flex flex-wrap items-start gap-x-4 gap-y-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <h1 className="min-w-0 break-words font-serif text-lg leading-tight text-fg">{job.file_name || "Import report"}</h1>
            <StatusChip report={report} />
          </div>
          <p className="mt-0.5 text-xs text-ink-soft">{importedByLine(job)}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2" data-slot="report-actions">
          {actions}
          {showPrimary && (
            <Link href={IMPORT_PATH} className={primaryButton}>
              Import another file
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
