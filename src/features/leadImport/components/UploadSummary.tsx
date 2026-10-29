"use client";

import { FileSpreadsheet, RefreshCw } from "lucide-react";
import { formatBytes, formatCount } from "@/features/leadImport/utils/format";
import type { UploadResponse } from "@/features/leadImport/types/leadImport.types";

interface UploadSummaryProps {
  upload: UploadResponse;
  fileSize: number | null;
  onReplace: () => void;
  replaceDisabled?: boolean;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-semibold uppercase tracking-wide text-ink-soft">{label}</dt>
      <dd className="mt-0.5 truncate text-sm font-medium text-fg" title={value}>
        {value}
      </dd>
    </div>
  );
}

function Chip({ children, tone = "slate" }: { children: React.ReactNode; tone?: "slate" | "amber" | "success" }) {
  const tones = {
    slate: "bg-slate-light text-slate",
    amber: "bg-amber/15 text-fg",
    success: "bg-success-soft text-success",
  } as const;
  return <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${tones[tone]}`}>{children}</span>;
}

export default function UploadSummary({ upload, fileSize, onReplace, replaceDisabled }: UploadSummaryProps) {
  const matched = upload.headers.filter((header) => upload.suggested_mapping[header]?.field).length;
  const toReview = upload.headers.length - matched;
  const warningCount = upload.warnings.length;

  return (
    <section className="rounded-lg border border-line bg-surface p-4" aria-label="Uploaded file summary">
      <div className="flex flex-wrap items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-success-soft text-success">
          <FileSpreadsheet size={18} aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold text-fg" title={upload.file_name}>
            {upload.file_name}
          </h3>
          <p className="text-xs text-ink-soft">File read successfully</p>
        </div>
        <button
          type="button"
          onClick={onReplace}
          disabled={replaceDisabled}
          className="inline-flex items-center gap-1.5 rounded-md border border-line bg-surface px-3 py-1.5 text-sm font-medium text-fg transition hover:bg-paper active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw size={14} aria-hidden="true" />
          Replace file
        </button>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
        <Stat label="Size" value={fileSize !== null ? formatBytes(fileSize) : "—"} />
        <Stat label="Sheet" value={upload.sheet_name ?? "—"} />
        <Stat label="Data rows" value={formatCount(upload.total_rows)} />
        <Stat label="Columns" value={formatCount(upload.headers.length)} />
      </dl>

      <ul className="mt-4 flex flex-wrap gap-2" aria-label="File highlights">
        <li>
          <Chip tone="success">{formatCount(matched)} matched automatically</Chip>
        </li>
        {toReview > 0 && (
          <li>
            <Chip tone="amber">{formatCount(toReview)} to review in the next step</Chip>
          </li>
        )}
        <li>
          <Chip>Column names on row {formatCount(upload.header_row)}</Chip>
        </li>
        {warningCount > 0 && (
          <li>
            <Chip tone="amber">
              {formatCount(warningCount)} {warningCount === 1 ? "thing" : "things"} to know
            </Chip>
          </li>
        )}
      </ul>
    </section>
  );
}
