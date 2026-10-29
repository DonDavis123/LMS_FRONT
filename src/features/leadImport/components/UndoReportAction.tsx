"use client";

import { Undo2 } from "lucide-react";
import { useState } from "react";
import UndoImportDialog from "@/features/leadImport/components/UndoImportDialog";
import type { ImportReport } from "@/features/leadImport/types/leadImport.types";
import { secondaryButton } from "@/features/leadImport/utils/reviewStyles";

interface UndoReportActionProps {
  report: ImportReport;
  /** Refreshes the report after the undo finished (without a loading screen, so the dialog stays). */
  onDone: () => void;
}

/** The "Undo this import" button of the report header and the dialog it opens. */
export default function UndoReportAction({ report, onDone }: UndoReportActionProps) {
  const [open, setOpen] = useState(false);
  // The dialog stays mounted even after can_undo turns false, so the result stays on screen.
  const label = report.job.status === "partly_undone" ? "Try undo again" : "Undo this import";
  return (
    <>
      {report.can_undo && (
        <button type="button" onClick={() => setOpen(true)} className={secondaryButton}>
          <Undo2 size={14} aria-hidden="true" />
          {label}
        </button>
      )}
      <UndoImportDialog
        jobId={report.job.id}
        fileName={report.job.file_name}
        isOpen={open}
        onClose={() => setOpen(false)}
        onDone={onDone}
      />
    </>
  );
}
