import type { ReactNode } from "react";

/**
 * Shared visual language for CRM forms (Lead, Contact, Account, Call,
 * Task, ...). `inputClass`, `Section`, `Field`, the page header and the
 * buttons live here so the form look (spacing, borders, focus ring, section
 * headers) only has to change in one place, and every form stays visually
 * consistent by construction.
 *
 * No form logic, validation, state, or submit behavior lives here — this
 * is presentation only.
 */

/** Text inputs, textareas and the trigger of every picker share this look. */
export const inputClass =
  "w-full rounded-lg border border-line bg-surface px-3.5 py-2.5 text-base text-fg shadow-sm outline-none transition placeholder:text-ink-soft/60 hover:border-slate/50 focus:border-slate focus:ring-4 focus:ring-slate/15 disabled:cursor-not-allowed disabled:bg-paper disabled:opacity-70 sm:text-sm";

/** Added to an input whose value is invalid. */
export const inputErrorClass =
  "border-danger hover:border-danger focus:border-danger focus:ring-danger/15";

/** The white card every full-page create / edit form sits in. */
export const formCardClass =
  "mx-auto max-w-4xl rounded-xl border border-line bg-surface p-4 shadow-sm sm:p-6";

export const secondaryButtonClass =
  "inline-flex items-center justify-center gap-2 rounded-lg border border-line bg-surface px-3.5 py-2 text-sm font-semibold text-fg shadow-sm transition hover:border-slate/50 hover:bg-paper active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 sm:px-4";

export const primaryButtonClass =
  "inline-flex items-center justify-center gap-2 rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-ink-2 hover:shadow-md active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 sm:px-5";

interface FormHeaderProps {
  title: string;
  /** One short line under the title. */
  subtitle?: string;
  /** The Cancel / Save buttons. */
  children: ReactNode;
}

/**
 * Sticky title bar of a full-page form. Pulls itself out to the edges of the
 * `formCardClass` card it sits in.
 */
export function FormHeader({ title, subtitle, children }: FormHeaderProps) {
  return (
    <div className="sticky top-0 z-10 -mx-4 -mt-4 mb-1 flex flex-wrap items-center justify-between gap-x-4 gap-y-3 rounded-t-[11px] border-b border-line bg-surface/90 px-4 py-3.5 backdrop-blur supports-[backdrop-filter]:bg-surface/80 sm:-mx-6 sm:-mt-6 sm:px-6 sm:py-4">
      <div className="min-w-0">
        <h1 className="font-serif text-xl leading-tight text-fg sm:text-2xl">{title}</h1>
        {subtitle && <p className="mt-0.5 text-xs text-ink-soft sm:text-sm">{subtitle}</p>}
      </div>
      <div className="flex shrink-0 flex-wrap gap-2 sm:gap-3">{children}</div>
    </div>
  );
}

interface SectionProps {
  title: string;
  children: ReactNode;
  /** Omits the bottom divider — use on the last section in a form. */
  last?: boolean;
  /** Optional one-line helper text under the title. */
  description?: string;
}

export function Section({ title, children, last = false, description }: SectionProps) {
  return (
    <div className={`mt-5 sm:mt-7 ${last ? "" : "border-b border-line pb-5 sm:pb-7"}`}>
      <div className="mb-4 sm:mb-5">
        <h3 className="flex items-center gap-2.5 text-xs font-bold uppercase tracking-[0.12em] text-ink-soft">
          <span aria-hidden="true" className="h-4 w-1 rounded-full bg-amber" />
          {title}
        </h3>
        {description && <p className="mt-1 pl-[1.15rem] text-xs text-ink-soft">{description}</p>}
      </div>
      <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 sm:gap-x-8 sm:gap-y-5">{children}</div>
    </div>
  );
}

interface FieldProps {
  label: string;
  children: ReactNode;
  required?: boolean;
  /** Spans both columns of the enclosing two-column grid. */
  fullWidth?: boolean;
  /** Helper text shown under the control. */
  hint?: string;
}

export function Field({ label, children, required = false, fullWidth = false, hint }: FieldProps) {
  return (
    <label className={`block ${fullWidth ? "sm:col-span-2" : ""}`}>
      <span className="mb-1.5 block text-[13px] font-semibold tracking-wide text-fg">
        {label}
        {required && <span className="text-danger"> *</span>}
      </span>
      {children}
      {hint && <span className="mt-1 block text-xs text-ink-soft">{hint}</span>}
    </label>
  );
}
