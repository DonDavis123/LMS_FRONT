import type { ReactNode } from "react";

/**
 * Shared "card with a labeled group of fields" used on record-detail pages
 * (Lead / Contact / Account overview + expandable detail sections). This
 * was previously a private `DetailSection` component copy-pasted
 * identically into three different detail pages.
 */
export function RecordSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-lg border border-line bg-surface p-6">
      <h3 className="mb-4 text-xs font-semibold uppercase tracking-wide text-ink-soft">{title}</h3>
      <div className="grid grid-cols-1 gap-y-3 sm:grid-cols-2">{children}</div>
    </div>
  );
}
