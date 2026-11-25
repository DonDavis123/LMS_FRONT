import type { ReactNode } from "react";
import { FileText, Pencil, Plus } from "lucide-react";

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
  "mx-auto max-w-4xl rounded-xl border border-line bg-surface p-4 shadow-[var(--lp-shadow)] sm:p-6";

export const secondaryButtonClass =
  "inline-flex items-center justify-center gap-2 rounded-lg border border-line bg-surface px-3.5 py-2 text-sm font-semibold text-fg shadow-sm transition hover:border-slate/50 hover:bg-paper active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 sm:px-4";

export const primaryButtonClass =
  "inline-flex items-center justify-center gap-2 rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-ink-2 hover:shadow-md active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 sm:px-5";

/**
 * Primary "+ Create ..." call-to-action used in every list header and empty
 * state. Brand amber gradient with navy text (AA contrast), a soft amber
 * glow, a lift on hover and a press effect. Pair with `CreateButtonLabel`.
 */
export const createButtonClass =
  "group/create inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-lg bg-linear-to-b from-amber to-amber-dark px-3.5 py-1.5 text-sm font-bold text-ink shadow-[0_1px_2px_rgba(18,33,58,0.18),0_6px_14px_-6px_rgba(201,136,38,0.65),inset_0_1px_0_rgba(255,255,255,0.4)] ring-1 ring-inset ring-amber-dark/50 transition-all duration-200 hover:-translate-y-px hover:brightness-105 hover:shadow-[0_2px_4px_rgba(18,33,58,0.2),0_10px_20px_-8px_rgba(201,136,38,0.8),inset_0_1px_0_rgba(255,255,255,0.45)] active:translate-y-0 active:scale-[0.97] active:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/50 disabled:cursor-not-allowed disabled:opacity-60";

/** Icon + label for `createButtonClass` (the plus turns on hover). */
export function CreateButtonLabel({ children }: { children: ReactNode }) {
  return (
    <>
      <Plus
        size={16}
        strokeWidth={2.75}
        aria-hidden="true"
        className="transition-transform duration-200 group-hover/create:rotate-90"
      />
      {children}
    </>
  );
}

type HeaderTone = "amber" | "slate" | "danger";

const TILE_TONE: Record<HeaderTone, string> = {
  amber: "bg-linear-to-br from-amber/25 to-amber/10 text-amber-dark ring-amber/30 dark:text-amber",
  slate: "bg-slate-light text-slate ring-slate/20",
  danger: "bg-danger-soft text-danger ring-danger/25",
};

/** Header chrome shared by `FormHeader` (full page) and `ModalFormHeader` (dialogs). */
const HEADER_ACCENT =
  "before:absolute before:inset-x-0 before:top-0 before:h-[3px] before:bg-linear-to-r before:from-amber before:via-amber before:to-amber-dark/20";

function HeaderTile({ tone, children }: { tone: HeaderTone; children: ReactNode }) {
  return (
    <span
      aria-hidden="true"
      className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ring-1 animate-pop-in sm:h-11 sm:w-11 ${TILE_TONE[tone]}`}
    >
      {children}
    </span>
  );
}

/** Picks the default tile icon + colour from the wording of the title. */
function defaultTile(title: string, icon?: ReactNode, tone?: HeaderTone) {
  const isCreate = /^(create|new|add)\b/i.test(title);
  const isEdit = /^(edit|update)\b/i.test(title);
  return {
    tone: tone ?? (isEdit ? "slate" : "amber"),
    icon: icon ?? (isCreate ? <Plus size={20} strokeWidth={2.5} /> : isEdit ? <Pencil size={18} /> : <FileText size={18} />),
  } as { tone: HeaderTone; icon: ReactNode };
}

interface FormHeaderProps {
  title: string;
  /** One short line under the title. */
  subtitle?: string;
  /**
   * Icon shown in the tile beside the title. Optional: by default it follows
   * the title ("Create…/New…/Add…" → plus, "Edit…/Update…" → pencil).
   */
  icon?: ReactNode;
  /** Tile colour. Defaults to amber (slate for "Edit…/Update…"). */
  tone?: HeaderTone;
  /** The Cancel / Save buttons. */
  children: ReactNode;
}

/**
 * Sticky title bar of a full-page form. Pulls itself out to the edges of the
 * `formCardClass` card it sits in: a brand amber accent runs along the top,
 * an icon tile and serif title sit on the left, the action buttons on the
 * right, and a hairline closes it off. Fades in opacity-only so it never
 * leaves a transform behind (that would trap fixed pickers/menus).
 */
export function FormHeader({ title, subtitle, icon, tone, children }: FormHeaderProps) {
  const tile = defaultTile(title, icon, tone);

  return (
    <div className={`animate-fade-in sticky top-0 z-10 -mx-4 -mt-4 mb-1 flex flex-wrap items-center justify-between gap-x-4 gap-y-3 overflow-hidden rounded-t-[11px] border-b border-line bg-surface/90 px-4 py-3.5 shadow-[0_8px_16px_-14px_rgba(18,33,58,0.25)] backdrop-blur ${HEADER_ACCENT} supports-[backdrop-filter]:bg-surface/80 sm:-mx-6 sm:-mt-6 sm:px-6 sm:py-4`}>
      <div className="flex min-w-0 items-center gap-3 sm:gap-4">
        <HeaderTile tone={tile.tone}>{tile.icon}</HeaderTile>
        <div className="min-w-0">
          <h1 className="font-serif text-xl leading-tight tracking-tight text-fg sm:text-2xl">{title}</h1>
          {subtitle && <p className="mt-0.5 text-xs text-ink-soft sm:text-sm">{subtitle}</p>}
        </div>
      </div>
      <div className="flex shrink-0 flex-wrap gap-2 sm:gap-3">{children}</div>
    </div>
  );
}

interface ModalFormHeaderProps {
  title: ReactNode;
  /** One short line under the title. */
  subtitle?: ReactNode;
  /** Tile icon. Defaults follow the title wording (see `FormHeader`). */
  icon?: ReactNode;
  tone?: HeaderTone;
  /** id of the title heading, for the dialog's `aria-labelledby`. */
  id?: string;
}

/**
 * Title bar of a form that lives in a `Modal` (Task, Call, Meeting, Deal,
 * Reminder, …) — the same look as `FormHeader`, sized for a dialog. Leaves
 * room on the right for the Modal's absolutely-positioned close button.
 */
export function ModalFormHeader({ title, subtitle, icon, tone, id }: ModalFormHeaderProps) {
  const tile = defaultTile(typeof title === "string" ? title : "", icon, tone);

  return (
    <div className={`relative shrink-0 overflow-hidden rounded-t-[7px] border-b border-line bg-surface px-5 py-3.5 pr-14 ${HEADER_ACCENT}`}>
      <div className="flex min-w-0 items-center gap-3">
        <HeaderTile tone={tile.tone}>{tile.icon}</HeaderTile>
        <div className="min-w-0">
          <h2 id={id} className="break-words font-serif text-xl leading-tight tracking-tight text-fg">
            {title}
          </h2>
          {subtitle && <p className="mt-0.5 text-xs text-ink-soft sm:text-sm">{subtitle}</p>}
        </div>
      </div>
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
