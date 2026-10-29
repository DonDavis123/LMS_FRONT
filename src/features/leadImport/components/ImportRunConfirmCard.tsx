"use client";

import { useId } from "react";
import { card, primaryButton, secondaryButton } from "@/features/leadImport/utils/reviewStyles";
import { formatCount } from "@/features/leadImport/utils/format";
import { plural } from "@/features/leadImport/utils/reviewSummary";
import type { RunSummary } from "@/features/leadImport/utils/runSummary";

interface ImportRunConfirmCardProps {
  summary: RunSummary | null;
  onStart: () => void;
  onBack: () => void;
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-0.5 px-3 py-2 sm:grid-cols-[11rem_1fr] sm:gap-3">
      <dt className="text-sm text-ink-soft">{label}</dt>
      <dd className="min-w-0 break-words text-sm text-fg tabular-nums">{children}</dd>
    </div>
  );
}

/** Step 5 before the click: what is about to happen, in words. */
export default function ImportRunConfirmCard({ summary, onStart, onBack }: ImportRunConfirmCardProps) {
  const reasonId = useId();
  const blockedReason = summary ? summary.blockedReason : "Your file has not been checked yet. Go back to the review step and check it first.";
  const blocked = blockedReason !== null;

  return (
    <section className={`${card} animate-fade-in-up p-4 sm:p-5`} aria-labelledby="import-confirm-title">
      <h2 id="import-confirm-title" className="font-serif text-lg text-fg">
        Ready to import
      </h2>
      <p className="mt-0.5 text-xs text-ink-soft">Have a last look at what will happen, then start.</p>

      {summary && (
        <dl className="mt-4 divide-y divide-line rounded-md border border-line">
          <Row label="File">{summary.fileName}</Row>
          <Row label="Added">{formatCount(summary.added)} {plural(summary.added, "new lead", "new leads")}</Row>
          <Row label="Updated">{formatCount(summary.updated)} existing {plural(summary.updated, "lead", "leads")}</Row>
          <Row label="Skipped">{formatCount(summary.skipped)} {plural(summary.skipped, "row", "rows")}</Row>
          {summary.errors > 0 && (
            <Row label="Need attention">
              {formatCount(summary.errors)} {plural(summary.errors, "row", "rows")} will not be imported
            </Row>
          )}
          <Row label="Left out">{formatCount(summary.leftOut)} {plural(summary.leftOut, "row", "rows")}</Row>
          <Row label="Converted">
            {formatCount(summary.converted)} {plural(summary.converted, "row", "rows")} will become an account and a contact
          </Row>
          <Row label="Owner">{summary.ownerText}</Row>
          <Row label="Duplicates">{summary.duplicateText}</Row>
        </dl>
      )}

      <p className="mt-4 text-sm text-ink-soft">You can undo this import later from the history while the records are untouched.</p>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span title={blockedReason ?? undefined}>
          <button
            type="button"
            className={primaryButton}
            disabled={blocked}
            aria-describedby={blocked ? reasonId : undefined}
            onClick={onStart}
          >
            Start import
          </button>
        </span>
        <button type="button" className={secondaryButton} onClick={onBack}>
          Back to review
        </button>
      </div>
      {blocked && (
        <p id={reasonId} className="mt-2 text-xs text-ink-soft">
          {blockedReason}
        </p>
      )}
    </section>
  );
}
