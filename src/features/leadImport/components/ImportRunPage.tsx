"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import ImportRunPanel from "@/features/leadImport/components/ImportRunPanel";
import { useImportAdminAccess } from "@/features/leadImport/hooks/useImportAdminAccess";
import { LEADS_PATH } from "@/features/leadImport/utils/importRoutes";
import { secondaryButton } from "@/features/leadImport/utils/reviewStyles";

/** Follows an import that was already started: from the history, a notification or the "Open it" button. */
export default function ImportRunPage({ jobId }: { jobId: string }) {
  const access = useImportAdminAccess();

  if (access !== "allowed") {
    return access === "checking" ? (
      <div className="mx-auto w-full max-w-5xl space-y-4" aria-busy="true" aria-label="Loading">
        <div className="h-6 w-40 animate-shimmer rounded" />
        <div className="h-64 animate-shimmer rounded-lg" />
      </div>
    ) : null;
  }

  return (
    <div className="mx-auto w-full max-w-3xl">
      <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-2">
        <div className="min-w-0 flex-1">
          <h1 className="font-serif text-lg leading-tight text-fg">Import progress</h1>
          <p className="text-xs text-ink-soft">Follow an import that has already started.</p>
        </div>
        <Link href={LEADS_PATH} className={`${secondaryButton} whitespace-nowrap`}>
          <ArrowLeft size={14} aria-hidden="true" />
          Back to leads
        </Link>
      </div>
      <ImportRunPanel mode="resume" jobId={jobId} />
    </div>
  );
}
