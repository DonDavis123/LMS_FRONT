"use client";

import Link from "next/link";
import type { ImportErrorInfo } from "@/features/leadImport/utils/importErrors";
import { IMPORT_HISTORY_PATH, importRunPath } from "@/features/leadImport/utils/importRoutes";
import { card, primaryButton, secondaryButton } from "@/features/leadImport/utils/reviewStyles";

export function ReportSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading report">
      <div className="space-y-2">
        <div className="h-3 w-32 animate-shimmer rounded" />
        <div className="h-6 w-64 max-w-full animate-shimmer rounded" />
      </div>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="h-72 animate-shimmer rounded-lg" />
        <div className="h-64 animate-shimmer rounded-lg" />
      </div>
    </div>
  );
}

export function ReportNotFound() {
  return (
    <section className={`${card} p-6 text-center`}>
      <h1 className="font-serif text-lg text-fg">Report not found</h1>
      <p className="mx-auto mt-1 max-w-md text-sm text-ink-soft">
        This import does not exist, or it was discarded. Your import history lists every import you can open.
      </p>
      <div className="mt-4">
        <Link href={IMPORT_HISTORY_PATH} className={primaryButton}>
          Go to import history
        </Link>
      </div>
    </section>
  );
}

export function ReportError({ error, onRetry }: { error: ImportErrorInfo | null; onRetry: () => void }) {
  return (
    <section role="alert" className={`${card} p-6`}>
      <h1 className="font-serif text-lg text-fg">We could not load this report</h1>
      <p className="mt-1 text-sm text-fg">{error?.message ?? "Something went wrong. Please try again."}</p>
      {error?.howToFix && <p className="mt-1 text-sm text-ink-soft">{error.howToFix}</p>}
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" className={primaryButton} onClick={onRetry}>
          Retry
        </button>
        <Link href={IMPORT_HISTORY_PATH} className={secondaryButton}>
          Go to import history
        </Link>
      </div>
    </section>
  );
}

export function ReportStillRunning({ jobId }: { jobId: string }) {
  return (
    <section className={`${card} p-6`} role="status">
      <h2 className="font-serif text-lg text-fg">This import is still running</h2>
      <p className="mt-1 text-sm text-ink-soft">
        The report is ready when the import finishes. You can watch its progress, or come back later. You will get a notification when it is done.
      </p>
      <div className="mt-4">
        <Link href={importRunPath(jobId)} className={primaryButton}>
          Open progress
        </Link>
      </div>
    </section>
  );
}
