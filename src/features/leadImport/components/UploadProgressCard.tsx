"use client";

import { FileSpreadsheet, X } from "lucide-react";
import { formatBytes } from "@/features/leadImport/utils/format";
import type { UploadPhase } from "@/features/leadImport/hooks/useLeadFileUpload";

interface UploadProgressCardProps {
  phase: Exclude<UploadPhase, { kind: "idle" }>;
  fileName: string;
  fileSize: number | null;
  onCancel: () => void;
}

/** Determinate while bytes are sent, then indeterminate while the server reads the file. */
export default function UploadProgressCard({ phase, fileName, fileSize, onCancel }: UploadProgressCardProps) {
  const parsing = phase.kind === "parsing";
  const percent = phase.kind === "uploading" ? phase.percent : 100;

  return (
    <div className="rounded-lg border border-line bg-surface p-4" aria-busy="true">
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-slate-light text-slate">
          <FileSpreadsheet size={18} aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-fg" title={fileName}>
            {fileName}
          </p>
          {fileSize !== null && <p className="text-xs text-ink-soft">{formatBytes(fileSize)}</p>}
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex items-center gap-1.5 rounded-md border border-line bg-surface px-3 py-1.5 text-sm font-medium text-fg transition hover:bg-paper active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber"
        >
          <X size={14} aria-hidden="true" />
          Cancel
        </button>
      </div>

      <div className="mt-4">
        <div className="mb-1.5 flex items-center justify-between text-xs text-ink-soft">
          <span>{parsing ? "Reading your file..." : "Uploading..."}</span>
          {!parsing && <span className="tabular-nums">{percent}%</span>}
        </div>
        {parsing ? (
          // No percentage is known while the server parses, so the bar is a calm pulse.
          <div
            role="progressbar"
            aria-label="Reading your file"
            className="h-2 w-full overflow-hidden rounded-full bg-line"
          >
            <div className="h-full w-full rounded-full bg-amber motion-safe:animate-pulse" />
          </div>
        ) : (
          <div
            role="progressbar"
            aria-label="Upload progress"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={percent}
            className="h-2 w-full overflow-hidden rounded-full bg-line"
          >
            <div className="h-full rounded-full bg-amber transition-[width] duration-200" style={{ width: `${percent}%` }} />
          </div>
        )}
        {parsing && (
          <p className="mt-2 text-xs text-ink-soft">This can take several seconds for a large file.</p>
        )}
      </div>
    </div>
  );
}
