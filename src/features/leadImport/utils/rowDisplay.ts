import type {
  ImportCellValue,
  ImportFieldDef,
  ImportMapping,
  ImportOptions,
  ImportRowResult,
  RowStatus,
} from "@/features/leadImport/types/leadImport.types";
import { OWNER_FIELD, isFieldMapped } from "@/features/leadImport/utils/mappingRules";

export function cellText(value: ImportCellValue | undefined): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value).trim();
}

/* ---------------- status badge ---------------- */

export type ResultTone = "success" | "info" | "warn" | "danger" | "muted";
export type ResultIcon = "check" | "refresh" | "copy" | "alert" | "minus" | "plus";

export interface RowResultInfo {
  label: string;
  tone: ResultTone;
  icon: ResultIcon;
}

/** Short badge text per backend status. Icon and words carry the meaning, never colour alone. */
export function rowResult(status: RowStatus): RowResultInfo {
  switch (status) {
    case "ready":
      return { label: "Will be added", tone: "success", icon: "check" };
    case "convert":
      return { label: "Added as converted", tone: "success", icon: "check" };
    case "duplicate_create":
      return { label: "Added anyway", tone: "warn", icon: "plus" };
    case "duplicate_update":
      return { label: "Will be updated", tone: "info", icon: "refresh" };
    case "duplicate_skip":
      return { label: "Skipped", tone: "muted", icon: "copy" };
    case "error":
      return { label: "Needs attention", tone: "danger", icon: "alert" };
    case "excluded":
      return { label: "Left out", tone: "muted", icon: "minus" };
    default:
      return { label: String(status), tone: "muted", icon: "minus" };
  }
}

/* ---------------- details text ---------------- */

function matchedOnLabel(matchedOn: string | null | undefined): string {
  const raw = (matchedOn ?? "").toLowerCase();
  if (raw.includes("email") && raw.includes("phone")) return "email and phone";
  if (raw.includes("email")) return "email";
  if (raw.includes("phone") || raw.includes("mobile")) return "phone";
  return raw.replace(/_/g, " ").trim();
}

/** "Same email as Priya Shah" / "Repeat of row 12". Null when the row is not a duplicate. */
export function duplicateText(row: ImportRowResult): string | null {
  const dup = row.duplicate;
  if (!dup) return null;

  if (dup.kind === "DUPLICATE_IN_FILE") {
    return typeof dup.first_row === "number" ? `Repeat of row ${dup.first_row}` : "Repeat of an earlier row";
  }

  const who = (typeof dup.name === "string" && dup.name) || (typeof dup.lead_name === "string" && dup.lead_name) || "";
  const matched = matchedOnLabel(dup.matched_on);
  let text: string;
  if (matched && who) text = `Same ${matched} as ${who}`;
  else if (who) text = `Matches ${who}`;
  else if (matched) text = `Same ${matched} as an existing lead`;
  else text = "Matches an existing lead";
  if (dup.is_converted) text += " (converted, never changed)";
  return text;
}

/** One short line for the Details column: the first problem, else the duplicate, else the reason. */
export function rowDetailText(row: ImportRowResult): string {
  const problem = row.problems[0];
  if (problem) {
    const extra = row.problems.length > 1 ? ` (+${row.problems.length - 1} more)` : "";
    return `${problem.message}${extra}`;
  }
  const duplicate = duplicateText(row);
  if (duplicate) return duplicate;
  if (row.reason) return row.reason;
  const warning = row.warnings[0];
  if (warning) return warning.message;
  return "";
}

/* ---------------- key columns ---------------- */

export interface KeyColumn {
  id: string;
  label: string;
  read: (row: ImportRowResult) => string;
}

interface KeyColumnDef {
  id: string;
  label: string;
  /** Field keys that feed the column, tried in order. */
  fields: string[];
  read: (row: ImportRowResult) => string;
}

function firstValue(row: ImportRowResult, fields: string[]): string {
  for (const key of fields) {
    const text = cellText(row.values_by_field[key]);
    if (text) return text;
  }
  return "";
}

const KEY_COLUMN_DEFS: KeyColumnDef[] = [
  { id: "name", label: "Name", fields: ["name"], read: (row) => firstValue(row, ["name"]) },
  { id: "email", label: "Email", fields: ["email"], read: (row) => firstValue(row, ["email"]) },
  { id: "phone", label: "Phone", fields: ["phone", "mobile"], read: (row) => firstValue(row, ["phone", "mobile"]) },
  { id: "company", label: "Company", fields: ["company_name"], read: (row) => firstValue(row, ["company_name"]) },
  {
    id: "owner",
    label: "Owner",
    fields: [OWNER_FIELD],
    read: (row) => row.owner?.name || firstValue(row, [OWNER_FIELD]),
  },
];

/**
 * Up to five key columns, in the order of upload.fields. A column shows when
 * its field is mapped (the owner column also when owners are chosen in the options).
 */
export function buildKeyColumns(
  fields: ImportFieldDef[],
  mapping: ImportMapping,
  options: ImportOptions,
): KeyColumn[] {
  const order = new Map(fields.map((field, index) => [field.key, index] as const));
  const position = (def: KeyColumnDef): number => {
    const indexes = def.fields.map((key) => order.get(key)).filter((value): value is number => value !== undefined);
    return indexes.length ? Math.min(...indexes) : Number.MAX_SAFE_INTEGER;
  };

  const visible = KEY_COLUMN_DEFS.filter((def) => {
    if (def.id === "owner") {
      return isFieldMapped(mapping, OWNER_FIELD) || options.owner_plan.mode !== "me";
    }
    return def.fields.some((key) => isFieldMapped(mapping, key));
  });

  return visible
    .map((def, index) => ({ def, index }))
    .sort((a, b) => position(a.def) - position(b.def) || a.index - b.index)
    .slice(0, 5)
    .map(({ def }) => ({ id: def.id, label: def.label, read: def.read }));
}

/** A short name for a row, for screen-reader labels. */
export function rowLabel(row: ImportRowResult): string {
  const name = cellText(row.values_by_field.name) || cellText(row.values_by_field.company_name);
  return name ? `row ${row.row_number}, ${name}` : `row ${row.row_number}`;
}
