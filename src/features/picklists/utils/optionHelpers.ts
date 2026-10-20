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

export function toStatusOptions(
  values: readonly string[],
  current?: string | null,
): ModernStatusOption[] {
  return withCurrentValue(values, current).map((value) => ({
    value,
    label: value,
    tone: leadStatusPillTone(value),
  }));
}
