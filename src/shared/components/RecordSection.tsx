import type { ReactNode } from "react";

/**
 * Shared "card with a labeled group of fields" used on record-detail pages
 * (Lead / Contact / Account / Deal / Task / Call / Meeting overview and
 * detail sections). It mirrors the create / edit form look from
 * `FormLayout` (`Section`) — same card, amber-bar heading and field grid —
 * so a record reads the same whether it is being viewed or edited.
 */

/** The card every detail section sits in (same as `formCardClass`, minus the max-width). */
export const recordCardClass =
  "rounded-xl border border-line bg-surface p-4 shadow-sm sm:p-6";

/** The field grid inside a detail card (same gaps as the form `Section`). */
export const recordGridClass =
  "lp-fields grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 sm:gap-x-8 sm:gap-y-5";

/** Section heading with the brand amber bar — identical to the form `Section` title. */
export function RecordSectionTitle({ children, className = "mb-4 sm:mb-5" }: { children: ReactNode; className?: string }) {
  return (
    <h3 className={`flex items-center gap-2.5 text-xs font-bold uppercase tracking-[0.12em] text-ink-soft ${className}`}>
      <span aria-hidden="true" className="lp-bar h-4 w-1 shrink-0 rounded-full bg-amber" />
      {children}
    </h3>
  );
}

export function RecordSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className={recordCardClass}>
      <RecordSectionTitle>{title}</RecordSectionTitle>
      <div className={recordGridClass}>{children}</div>
    </div>
  );
}
