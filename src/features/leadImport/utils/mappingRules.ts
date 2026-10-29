import type { SelectOption } from "@/shared/components/Select";
import {
  IGNORE_COLUMN,
  type ImportCellValue,
  type ImportExtraColumn,
  type ImportFieldDef,
  type ImportMapping,
  type ImportSampleRow,
  type MappingConfidence,
  type SuggestedMapping,
} from "@/features/leadImport/types/leadImport.types";
import { VIRTUAL_FIELD_LABELS } from "@/features/leadImport/utils/labels";

/** Field keys the import rules refer to by name. */
export const NAME_FIELD = "name";
export const COMPANY_FIELD = "company_name";
export const OWNER_FIELD = "owner";
export const CONVERTED_FIELD = "converted";
/** The one field that any number of columns may feed. */
export const DESCRIPTION_FIELD = "description";

const SPECIAL_FIELD_HELP: Record<string, string> = {
  [OWNER_FIELD]: "Matched to your team members",
  [CONVERTED_FIELD]: "Yes rows become an Account and Contact",
};

export const MAX_EXAMPLES = 3;

export type MatchKind = "auto" | "check" | "none" | "chosen" | "ignored";

export function isIgnored(value: string | undefined): boolean {
  return !value || value === IGNORE_COLUMN;
}

export function isFieldMapped(mapping: ImportMapping, fieldKey: string): boolean {
  return Object.values(mapping).some((value) => value === fieldKey);
}

export function hasAnyMapped(mapping: ImportMapping): boolean {
  return Object.values(mapping).some((value) => !isIgnored(value));
}

export function columnLabel(header: string): string {
  return header.trim() ? header : "(no name)";
}

/** Up to three different, non-empty example cells for one column. */
export function exampleValues(header: string, rows: ImportSampleRow[]): string[] {
  const seen = new Set<string>();
  for (const row of rows) {
    const value = (row.values[header] ?? "").trim();
    if (value) seen.add(value);
    if (seen.size >= MAX_EXAMPLES) break;
  }
  return [...seen];
}

/** {field key: first column that feeds it}. The description field is left out: it may take many columns. */
export function fieldUsage(mapping: ImportMapping): Map<string, string> {
  const usage = new Map<string, string>();
  for (const [header, field] of Object.entries(mapping)) {
    if (isIgnored(field) || field === DESCRIPTION_FIELD) continue;
    if (!usage.has(field)) usage.set(field, header);
  }
  return usage;
}

/**
 * The options of one column's "Maps to" select. "Don't import this column"
 * comes first, the special fields sit in their own group at the end, and a
 * field already used by another column is disabled and says which one.
 */
export function buildFieldOptions(
  fields: ImportFieldDef[],
  usage: Map<string, string>,
  header: string,
): SelectOption[] {
  const options: SelectOption[] = [{ value: IGNORE_COLUMN, label: "Don't import this column", muted: true }];
  const regular = fields.filter((field) => !(field.key in SPECIAL_FIELD_HELP));
  const special = fields.filter((field) => field.key in SPECIAL_FIELD_HELP);

  function toOption(field: ImportFieldDef, group?: string): SelectOption {
    const usedBy = field.key === DESCRIPTION_FIELD ? undefined : usage.get(field.key);
    const taken = usedBy !== undefined && usedBy !== header;
    const label =
      field.label ||
      (field.key in VIRTUAL_FIELD_LABELS ? VIRTUAL_FIELD_LABELS[field.key as keyof typeof VIRTUAL_FIELD_LABELS] : field.key);
    return {
      value: field.key,
      label,
      description: taken ? `Used by ${columnLabel(usedBy)}` : SPECIAL_FIELD_HELP[field.key],
      disabled: taken,
      tag: field.required ? "Required" : undefined,
      group,
    };
  }

  for (const field of regular) options.push(toOption(field));
  for (const field of special) options.push(toOption(field, "Special columns"));
  return options;
}

export function matchKindFor(
  header: string,
  mapping: ImportMapping,
  start: ImportMapping,
  suggested: Record<string, SuggestedMapping>,
): MatchKind {
  const current = mapping[header];
  const confidence: MappingConfidence = suggested[header]?.confidence ?? "none";
  const changed = current !== start[header];
  if (isIgnored(current)) return !changed && confidence === "none" ? "none" : "ignored";
  if (changed) return "chosen";
  if (confidence === "exact" || confidence === "alias") return "auto";
  if (confidence === "guess") return "check";
  return "none";
}

/** Columns the "Ignore all unmatched" button would switch off: still mapped, never matched with confidence, never chosen by the user. */
export function unmatchedColumns(
  headers: string[],
  mapping: ImportMapping,
  start: ImportMapping,
  suggested: Record<string, SuggestedMapping>,
): string[] {
  return headers.filter((header) => {
    if (isIgnored(mapping[header]) || mapping[header] !== start[header]) return false;
    const confidence = suggested[header]?.confidence ?? "none";
    return confidence === "guess" || confidence === "none";
  });
}

export function mappingEqualsStart(headers: string[], mapping: ImportMapping, start: ImportMapping): boolean {
  return headers.every((header) => mapping[header] === start[header]);
}

export function isExtraColumn(extras: ImportExtraColumn[], header: string): boolean {
  return extras.some((extra) => extra.column === header);
}

export interface MappingSummary {
  imported: number;
  ignored: number;
  total: number;
  kept: number;
}

export function summarizeMapping(headers: string[], mapping: ImportMapping, extras: ImportExtraColumn[]): MappingSummary {
  const imported = headers.filter((header) => !isIgnored(mapping[header])).length;
  const kept = headers.filter((header) => isIgnored(mapping[header]) && isExtraColumn(extras, header)).length;
  return { imported, ignored: headers.length - imported, total: headers.length, kept };
}

export interface NameStatus {
  nameMapped: boolean;
  companyMapped: boolean;
  /** The name requirement is met, by a name column or by the company-name option. */
  satisfied: boolean;
}

export function nameStatus(mapping: ImportMapping, useCompanyAsName: boolean): NameStatus {
  const nameMapped = isFieldMapped(mapping, NAME_FIELD);
  const companyMapped = isFieldMapped(mapping, COMPANY_FIELD);
  return { nameMapped, companyMapped, satisfied: nameMapped || (useCompanyAsName && companyMapped) };
}

export interface RequiredFieldStatus {
  field: ImportFieldDef;
  mapped: boolean;
  /** Met through the company-name option instead of a column. */
  viaCompany: boolean;
}

export function requiredFieldStatuses(
  fields: ImportFieldDef[],
  mapping: ImportMapping,
  useCompanyAsName: boolean,
): RequiredFieldStatus[] {
  const name = nameStatus(mapping, useCompanyAsName);
  return fields
    .filter((field) => field.required)
    .map((field) => {
      const direct = isFieldMapped(mapping, field.key);
      const viaCompany = field.key === NAME_FIELD && !direct && useCompanyAsName && name.companyMapped;
      return { field, mapped: direct || viaCompany, viaCompany };
    });
}

/** The reason the client check blocks Continue, or null when it passes. */
export function clientMappingBlock(mapping: ImportMapping, useCompanyAsName: boolean): string | null {
  if (!hasAnyMapped(mapping)) return "Map at least one column to continue.";
  if (!nameStatus(mapping, useCompanyAsName).satisfied) {
    return "Choose a name column, or use the company name as the lead name, to continue.";
  }
  return null;
}

/** A preview cell as text. */
export function formatCell(value: ImportCellValue | undefined): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}
