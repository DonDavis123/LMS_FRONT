/**
 * Colours an admin can give a dropdown option (Settings → Dropdown Options).
 *
 * The backend stores only the palette KEY (e.g. "green"); this file is the one
 * place that turns a key into styles, so pills, dropdowns and the colour picker
 * always agree and light / dark mode are both handled. Class names are written
 * out in full on purpose so Tailwind can see them.
 *
 * Keep the keys in sync with PICKLIST_COLORS in the backend picklist catalog.
 */

export interface OptionColorStyle {
  label: string;
  /** Solid dot / swatch. */
  dot: string;
  /** Soft background + text, used for pills. */
  pill: string;
  /** Highlight for the selected row inside a menu. */
  active: string;
}

const PALETTE = {
  slate: { label: "Grey", dot: "bg-slate", pill: "bg-slate-light text-slate", active: "bg-slate-light" },
  blue: { label: "Blue", dot: "bg-blue-500", pill: "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300", active: "bg-blue-50 dark:bg-blue-950/40" },
  sky: { label: "Sky", dot: "bg-sky-500", pill: "bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300", active: "bg-sky-50 dark:bg-sky-950/40" },
  teal: { label: "Teal", dot: "bg-teal-500", pill: "bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300", active: "bg-teal-50 dark:bg-teal-950/40" },
  green: { label: "Green", dot: "bg-green-500", pill: "bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-300", active: "bg-green-50 dark:bg-green-950/40" },
  lime: { label: "Lime", dot: "bg-lime-500", pill: "bg-lime-50 text-lime-700 dark:bg-lime-950/40 dark:text-lime-300", active: "bg-lime-50 dark:bg-lime-950/40" },
  amber: { label: "Amber", dot: "bg-amber-500", pill: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300", active: "bg-amber-50 dark:bg-amber-950/40" },
  orange: { label: "Orange", dot: "bg-orange-500", pill: "bg-orange-50 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300", active: "bg-orange-50 dark:bg-orange-950/40" },
  red: { label: "Red", dot: "bg-red-500", pill: "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300", active: "bg-red-50 dark:bg-red-950/40" },
  pink: { label: "Pink", dot: "bg-pink-500", pill: "bg-pink-50 text-pink-700 dark:bg-pink-950/40 dark:text-pink-300", active: "bg-pink-50 dark:bg-pink-950/40" },
  purple: { label: "Purple", dot: "bg-purple-500", pill: "bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300", active: "bg-purple-50 dark:bg-purple-950/40" },
  indigo: { label: "Indigo", dot: "bg-indigo-500", pill: "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300", active: "bg-indigo-50 dark:bg-indigo-950/40" },
} as const satisfies Record<string, OptionColorStyle>;

export type OptionColorKey = keyof typeof PALETTE;

/** Palette keys in the order the picker shows them. */
export const OPTION_COLOR_KEYS = Object.keys(PALETTE) as OptionColorKey[];

export function isOptionColorKey(value: unknown): value is OptionColorKey {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(PALETTE, value);
}

/** Styles for a palette key, or `null` when no (or an unknown) colour is set. */
export function getOptionColorStyle(color: string | null | undefined): OptionColorStyle | null {
  return isOptionColorKey(color) ? PALETTE[color] : null;
}
