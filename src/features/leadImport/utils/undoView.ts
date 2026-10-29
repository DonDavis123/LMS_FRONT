import { fieldLabel } from "@/features/leadImport/utils/reportView";
import { formatCount } from "@/features/leadImport/utils/format";

/** plural(1, "lead") -> "1 lead", plural(2, "lead") -> "2 leads", plural(1, "account") with "accounts" for custom forms. */
export function plural(count: number, one: string, many = `${one}s`): string {
  return `${formatCount(count)} ${count === 1 ? one : many}`;
}

/** Reads a count that the backend may leave out. */
export function num(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

/** "lead" -> "Lead", "custom_thing" -> "Custom thing" */
export function kindLabel(kind: string): string {
  return fieldLabel(kind || "record");
}
