"use client";

import { Download, FileText, Play, Undo2 } from "lucide-react";
import Link from "next/link";
import type { HistoryItem } from "@/features/leadImport/types/leadImport.types";
import { undoActionLabel, isRunningItem } from "@/features/leadImport/utils/historyView";
import { importReportPath, importRunPath } from "@/features/leadImport/utils/importRoutes";
import { smallButton } from "@/features/leadImport/utils/reviewStyles";

interface HistoryRowActionsProps {
  item: HistoryItem;
  downloading: boolean;
  onDownload: (item: HistoryItem) => void;
  onUndo: (item: HistoryItem) => void;
}

/** The actions of one import: a compact row of small buttons (each one named after its file). */
export default function HistoryRowActions({ item, downloading, onDownload, onUndo }: HistoryRowActionsProps) {
  const file = item.file_name || "import";
  const undoLabel = undoActionLabel(item);
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Link href={importReportPath(item.job_id)} aria-label={`View report for ${file}`} className={smallButton}>
        <FileText size={14} aria-hidden="true" />
        View report
      </Link>
      {isRunningItem(item) && (
        <Link href={importRunPath(item.job_id)} aria-label={`Continue import of ${file}`} className={smallButton}>
          <Play size={14} aria-hidden="true" />
          Continue
        </Link>
      )}
      {item.rejected_file_available && (
        <button
          type="button"
          onClick={() => onDownload(item)}
          disabled={downloading}
          aria-busy={downloading}
          aria-label={`Download rows to fix for ${file}`}
          className={smallButton}
        >
          {downloading ? (
            <span aria-hidden="true" className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-line border-t-amber" />
          ) : (
            <Download size={14} aria-hidden="true" />
          )}
          Download rows to fix
        </button>
      )}
      {item.can_undo && (
        <button type="button" onClick={() => onUndo(item)} aria-label={`${undoLabel} of ${file}`} className={smallButton}>
          <Undo2 size={14} aria-hidden="true" />
          {undoLabel}
        </button>
      )}
    </div>
  );
}
