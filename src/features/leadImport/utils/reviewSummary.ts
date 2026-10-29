import type { RowsStatusFilter, ValidateChecked } from "@/features/leadImport/types/leadImport.types";
import { formatCount } from "@/features/leadImport/utils/format";

/**
 * The numbers the review screen shows, built from a finished check.
 *
 * Grouping (from the backend contract):
 *   ready + convert  -> will be added            (the "Ready to import" tile)
 *   duplicate_create -> added anyway             (inside "Duplicates")
 *   duplicate_update -> updated                  (inside "Duplicates")
 *   duplicate_skip   -> skipped                  (inside "Duplicates")
 *   error            -> needs attention
 *   excluded         -> left out
 */
export interface ReviewNumbers {
  total: number;
  ready: number;
  duplicates: number;
  errors: number;
  leftOut: number;
  /** Rows the file marks as converted. */
  converted: number;
  /** Everything that will become a new lead: ready + convert + duplicate_create. */
  added: number;
  addedAnyway: number;
  updated: number;
  skipped: number;
}

function safe(value: number | undefined): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

export function getReviewNumbers(check: ValidateChecked): ReviewNumbers {
  const counts = check.counts ?? {};
  const ready = safe(counts.ready) + safe(counts.convert);
  const addedAnyway = safe(counts.duplicate_create);
  const updated = safe(counts.duplicate_update);
  const skipped = safe(counts.duplicate_skip);
  return {
    total: safe(check.total),
    ready,
    duplicates: addedAnyway + updated + skipped,
    errors: safe(counts.error),
    leftOut: safe(counts.excluded),
    converted: safe(check.converted),
    added: ready + addedAnyway,
    addedAnyway,
    updated,
    skipped,
  };
}

export function plural(count: number, one: string, many: string): string {
  return count === 1 ? one : many;
}

/** "1,150 leads will be added, 30 updated, 18 skipped and 6 need attention." Zero parts are left out. */
export function summarySentence(numbers: ReviewNumbers): string {
  const { added, updated, skipped, errors } = numbers;
  const parts: string[] = [];

  const lead = (n: number) => plural(n, "lead", "leads");
  const firstIs = (name: "added" | "updated" | "skipped" | "errors") =>
    ({ added, updated, skipped, errors })[name] > 0 &&
    (name === "added" ||
      (name === "updated" && added === 0) ||
      (name === "skipped" && added === 0 && updated === 0) ||
      (name === "errors" && added === 0 && updated === 0 && skipped === 0));

  if (added > 0) parts.push(`${formatCount(added)} ${lead(added)} will be added`);
  if (updated > 0) {
    parts.push(firstIs("updated") ? `${formatCount(updated)} ${lead(updated)} will be updated` : `${formatCount(updated)} updated`);
  }
  if (skipped > 0) {
    parts.push(firstIs("skipped") ? `${formatCount(skipped)} ${lead(skipped)} will be skipped` : `${formatCount(skipped)} skipped`);
  }
  if (errors > 0) {
    const verb = plural(errors, "needs", "need");
    parts.push(
      firstIs("errors")
        ? `${formatCount(errors)} ${plural(errors, "row", "rows")} ${verb} attention`
        : `${formatCount(errors)} ${verb} attention`,
    );
  }

  if (parts.length === 0) return "Nothing in this file will be imported.";
  const text = parts.length === 1 ? parts[0] : `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`;
  return `${text}.`;
}

/** Converted rows and left-out rows, mentioned apart from the main sentence. Null when there is nothing to say. */
export function extraSentence(numbers: ReviewNumbers): string | null {
  const parts: string[] = [];
  if (numbers.converted > 0) {
    parts.push(
      `${formatCount(numbers.converted)} ${plural(numbers.converted, "row is", "rows are")} marked as converted and will be added with an account and a contact.`,
    );
  }
  if (numbers.leftOut > 0) {
    parts.push(`${formatCount(numbers.leftOut)} ${plural(numbers.leftOut, "row is", "rows are")} left out.`);
  }
  return parts.length ? parts.join(" ") : null;
}

export type NextStepTarget = "options" | "mapping" | null;

export interface CannotImportHelp {
  title: string;
  next: string;
  target: NextStepTarget;
}

/** Why nothing can be imported, and the most useful next step. Only used when can_import is false. */
export function cannotImportHelp(numbers: ReviewNumbers): CannotImportHelp {
  const title = "Nothing in this file can be imported yet";
  const active = numbers.total - numbers.leftOut;

  if (numbers.total > 0 && numbers.leftOut >= numbers.total) {
    return { title, next: "Every row is left out. Include some rows again below, or change your rules.", target: null };
  }
  if (numbers.errors > 0 && numbers.errors >= active) {
    return {
      title,
      next: "Every remaining row has a problem. Fix the file, change your column mapping, or leave those rows out and choose different ones.",
      target: "mapping",
    };
  }
  if (numbers.skipped > 0 && numbers.skipped + numbers.errors >= active) {
    return {
      title,
      next: "Every remaining row is a duplicate that will be skipped. Choose to update the existing leads or add them anyway.",
      target: "options",
    };
  }
  return { title, next: "Check your column mapping and options, then check again.", target: "mapping" };
}

export interface TileInfo {
  id: "total" | "ready" | "duplicates" | "errors" | "leftOut" | "converted";
  label: string;
  value: number;
  detail: string;
  /** The rows-table filter the tile applies. Null for the Total tile. */
  filter: RowsStatusFilter | null;
}

export function buildTiles(numbers: ReviewNumbers): TileInfo[] {
  const dupParts: string[] = [];
  if (numbers.skipped > 0) dupParts.push(`${formatCount(numbers.skipped)} skipped`);
  if (numbers.updated > 0) dupParts.push(`${formatCount(numbers.updated)} updated`);
  if (numbers.addedAnyway > 0) dupParts.push(`${formatCount(numbers.addedAnyway)} added anyway`);

  return [
    { id: "total", label: "Total rows", value: numbers.total, detail: "In your file", filter: null },
    { id: "ready", label: "Ready to import", value: numbers.ready, detail: "Will be added", filter: "ready" },
    {
      id: "duplicates",
      label: "Duplicates",
      value: numbers.duplicates,
      detail: dupParts.length ? dupParts.join(", ") : "None found",
      filter: "duplicate",
    },
    {
      id: "errors",
      label: "Need attention",
      value: numbers.errors,
      detail: numbers.errors > 0 ? "Will not be imported" : "No problems",
      filter: "error",
    },
    { id: "leftOut", label: "Left out", value: numbers.leftOut, detail: "Not imported", filter: "excluded" },
    { id: "converted", label: "Converted", value: numbers.converted, detail: "With account and contact", filter: "converted" },
  ];
}
