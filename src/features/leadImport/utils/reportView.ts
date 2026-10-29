import type { DuplicateAction, ImportReport, ReportJob, ReportTotals } from "@/features/leadImport/types/leadImport.types";
import { formatDuration } from "@/features/leadImport/utils/format";
import { formatDateTime } from "@/shared/utils/formatDate";

/* ---------------------------- job status ---------------------------- */

export type StatusTone = "success" | "neutral" | "danger" | "warning" | "info";

export interface StatusChipInfo {
  label: string;
  tone: StatusTone;
}

/** True while the server is still working on the import (the report is not ready yet). */
export function isStillRunning(job: ReportJob): boolean {
  return (job.status === "queued" || job.status === "processing") && (job.stage === "running" || job.stage === null);
}

export function statusChip(job: ReportJob): StatusChipInfo {
  if (isStillRunning(job)) return { label: "Running", tone: "info" };
  if (job.status === "completed" && job.stage === "cancelled") return { label: "Cancelled", tone: "neutral" };
  switch (job.status) {
    case "completed":
      return { label: "Completed", tone: "success" };
    case "failed":
      return { label: "Failed", tone: "danger" };
    case "undone":
      return { label: "Undone", tone: "neutral" };
    case "partly_undone":
      return { label: "Partly undone", tone: "warning" };
    default:
      return { label: "Not finished", tone: "neutral" };
  }
}

/** "Imported by Sam Lee on Sep 29, 2026, 10:30 AM, took 2 min 10 sec" */
export function importedByLine(job: ReportJob): string {
  const when = formatDateTime(job.finished_at ?? job.started_at);
  const who = job.created_by_name ? `Imported by ${job.created_by_name}` : "Imported";
  const parts = [when ? `${who} on ${when}` : who];
  if (job.duration_seconds !== null && job.duration_seconds >= 0) parts.push(`took ${formatDuration(job.duration_seconds)}`);
  return parts.join(", ");
}

/* ---------------------------- outcome bar --------------------------- */

export type OutcomeKey = "created" | "updated" | "skipped" | "failed" | "excluded" | "not_processed" | "other";

export interface OutcomeSegment {
  key: OutcomeKey;
  label: string;
  value: number;
  /** Tailwind background class (design tokens only). */
  swatch: string;
}

function safe(value: number | undefined): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : 0;
}

/**
 * The parts of the whole, in the order they are shown. "Not processed" only
 * appears when it is above zero. Anything that does not add up to `total`
 * becomes a muted "Unaccounted" segment so the bar never misleads.
 */
export function outcomeSegments(totals: ReportTotals): OutcomeSegment[] {
  const segments: OutcomeSegment[] = [
    { key: "created", label: "Added", value: safe(totals.created), swatch: "bg-success" },
    { key: "updated", label: "Updated", value: safe(totals.updated), swatch: "bg-slate" },
    { key: "skipped", label: "Skipped (duplicates)", value: safe(totals.skipped), swatch: "bg-ink-soft" },
    { key: "failed", label: "Need attention", value: safe(totals.failed), swatch: "bg-danger" },
    { key: "excluded", label: "Left out", value: safe(totals.excluded), swatch: "bg-amber" },
  ];
  const notProcessed = safe(totals.not_processed);
  if (notProcessed > 0) {
    segments.push({ key: "not_processed", label: "Not processed", value: notProcessed, swatch: "bg-line" });
  }
  const sum = segments.reduce((total, segment) => total + segment.value, 0);
  const gap = safe(totals.total) - sum;
  if (gap > 0) segments.push({ key: "other", label: "Unaccounted", value: gap, swatch: "bg-line" });
  return segments;
}

/** Share of the bar for one segment, 0 to 100. The whole is whichever is larger: total or the parts. */
export function segmentPercent(segment: OutcomeSegment, segments: OutcomeSegment[]): number {
  const whole = segments.reduce((total, item) => total + item.value, 0);
  return whole > 0 ? (segment.value / whole) * 100 : 0;
}

/* ----------------------------- sections ----------------------------- */

export function notAddedCount(totals: ReportTotals): number {
  return safe(totals.failed) + safe(totals.skipped) + safe(totals.excluded);
}

export function duplicateActionSentence(action: DuplicateAction): string {
  switch (action) {
    case "update":
      return "Rows that matched an existing lead updated that lead from your file.";
    case "create_anyway":
      return "Rows that matched an existing lead were added as new leads anyway.";
    default:
      return "Rows that matched an existing lead were skipped. The existing lead stayed as it was.";
  }
}

export function hasDuplicateData(report: ImportReport): boolean {
  const { matched_on_email, matched_on_phone, in_file } = report.duplicates;
  return matched_on_email + matched_on_phone + in_file > 0;
}

export function hasConvertedData(report: ImportReport): boolean {
  const c = report.converted;
  return c.accounts_created + c.contacts_created + c.accounts_reused + c.contacts_reused > 0;
}

/** "lead_source" -> "Lead source" */
export function fieldLabel(field: string): string {
  const text = field.replace(/_/g, " ").trim();
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : field;
}

export function mappedToLabel(value: string): string {
  return value === "__blank__" ? "Left blank" : value;
}
