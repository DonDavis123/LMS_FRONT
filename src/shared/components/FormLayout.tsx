import type { ReactNode } from "react";

/**
 * Shared visual language for CRM forms (Lead, Contact, Account, Call,
 * Task, ...). This used to be copy-pasted verbatim into every form file —
 * `inputClass`, `Section` and `Field` were byte-for-byte identical in five
 * different components. Extracting them here means the form look (spacing,
 * borders, focus ring, section headers) only has to change in one place,
 * and every form stays visually consistent by construction.
 *
 * No form logic, validation, state, or submit behavior lives here — this
 * is presentation only.
 */

export const inputClass =
  "w-full rounded-md border border-line bg-surface px-3 py-2.5 text-sm text-fg outline-none transition focus:border-slate focus:ring-2 focus:ring-slate-light";

interface SectionProps {
  title: string;
  children: ReactNode;
  /** Omits the bottom divider — use on the last section in a form. */
  last?: boolean;
}

export function Section({ title, children, last = false }: SectionProps) {
  return (
    <div className={`mt-6 ${last ? "" : "border-b border-line pb-6"}`}>
      <h3 className="mb-4 text-xs font-semibold uppercase tracking-wide text-ink-soft">
        {title}
      </h3>
      <div className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">{children}</div>
    </div>
  );
}

interface FieldProps {
  label: string;
  children: ReactNode;
  required?: boolean;
  /** Spans both columns of the enclosing two-column grid. */
  fullWidth?: boolean;
}

export function Field({ label, children, required = false, fullWidth = false }: FieldProps) {
  return (
    <label className={`block ${fullWidth ? "sm:col-span-2" : ""}`}>
      <span className="mb-1.5 block text-sm font-medium text-fg">
        {label}
        {required && <span className="text-danger"> *</span>}
      </span>
      {children}
    </label>
  );
}
