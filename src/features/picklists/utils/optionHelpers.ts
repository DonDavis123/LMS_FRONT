import type { ModernStatusOption } from "@/shared/components/ModernStatusSelect";
import type { SelectOption } from "@/shared/components/Select";

/**
 * Keeps a record's current value selectable even after an admin hid or removed
 * it, so opening an old lead never silently shows (or saves) a different
 * option. The backend accepts a record's unchanged current value.
 */
export function withCurrentValue(
  values: readonly string[],
  current: string | null | undefined,
): string[] {
  const text = current?.trim();
  if (!text || values.includes(text)) return [...values];
  return [...values, text];
}

export function toSelectOptions(
  values: readonly string[],
  current?: string | null,
): SelectOption[] {
  return withCurrentValue(values, current).map((value) => ({ value, label: value }));
}

/**
 * Colour of a lead-status pill. The built-in stages keep their colours;
 * stages a company adds (or renames) use the neutral tone.
 */
export function leadStatusPillTone(status: string): NonNullable<ModernStatusOption["tone"]> {
  switch (status) {
    case "Contacted":
    case "Pre-Qualified":
      return "success";
    case "Junk Lead":
    case "Lost Lead":
    case "Not Qualified":
      return "danger";
    case "Attempted to Contact":
    case "Contact in Future":
      return "warning";
    default:
      return "neutral";
  }
}

/** Built-in tone → palette key, so the colour picker shows what a built-in stage already looks like. */
const TONE_TO_COLOR: Partial<Record<NonNullable<ModernStatusOption["tone"]>, string>> = {
  success: "green",
  warning: "amber",
  danger: "red",
  info: "blue",
};

/**
 * The colour an option shows when the admin hasn't picked one: the built-in
 * lead stages keep their original colours, everything else has none.
 */
export function defaultOptionColor(field: string, value: string): string {
  if (field !== "lead_status") return "";
  return TONE_TO_COLOR[leadStatusPillTone(value)] ?? "";
}

/** The admin's colour for an option if they chose one, otherwise the default. */
export function effectiveOptionColor(field: string, value: string, saved?: string | null): string {
  return saved || defaultOptionColor(field, value);
}

/**
 * `colors` is the company's chosen colour per option text (see `usePicklists`).
 * An option without one keeps the built-in tone above.
 */
export function toStatusOptions(
  values: readonly string[],
  current?: string | null,
  colors?: Record<string, string>,
): ModernStatusOption[] {
  return withCurrentValue(values, current).map((value) => ({
    value,
    label: value,
    tone: leadStatusPillTone(value),
    color: colors?.[value] || undefined,
  }));
}
