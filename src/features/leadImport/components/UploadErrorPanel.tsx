"use client";

import { AlertCircle } from "lucide-react";
import type { ReactNode } from "react";
import type { ImportErrorInfo } from "@/features/leadImport/utils/importErrors";

interface UploadErrorPanelProps {
  error: ImportErrorInfo;
  /** One-line tip shown under the how-to-fix text (e.g. splitting a big file). */
  tip?: string | null;
  /** Buttons for this error, rendered in a wrapping row. */
  children?: ReactNode;
}

/** Shows BOTH the backend's detail (headline) and how_to_fix (beneath it). */
export default function UploadErrorPanel({ error, tip, children }: UploadErrorPanelProps) {
  return (
    <div role="alert" className="rounded-lg border border-danger/30 bg-danger-soft p-4 text-danger">
      <div className="flex items-start gap-2.5">
        <AlertCircle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="break-words text-sm font-semibold">{error.message}</p>
          {error.howToFix && <p className="mt-1 break-words text-sm">{error.howToFix}</p>}
          {tip && <p className="mt-2 break-words text-xs">{tip}</p>}
          {children && <div className="mt-3 flex flex-wrap gap-2">{children}</div>}
        </div>
      </div>
    </div>
  );
}
