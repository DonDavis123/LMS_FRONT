import type { ProgressResult } from "@/features/leadImport/types/leadImport.types";
import { formatCount } from "@/features/leadImport/utils/format";
import { plural } from "@/features/leadImport/utils/reviewSummary";

const ETA_MIN_PERCENT = 5;
const ETA_MIN_SECONDS = 5;
/** Anything longer than this is not a useful estimate, so none is shown. */
const ETA_MAX_SECONDS = 6 * 3600;
const MAX_PLAUSIBLE_ELAPSED_SECONDS = 7 * 24 * 3600;

export function clampPercent(value: number | null | undefined): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, Math.round(value)));
}

export interface ProgressSample {
  rows: number;
  at: number;
}

/**
 * Seconds since the import started. Uses the server's started_at when it looks
 * sane (a wrong clock must never show a negative or silly time), else the time
 * since this screen began following the import.
 */
export function elapsedSeconds(progress: ProgressResult | null, sessionStart: number, now: number): number {
  if (progress?.started_at) {
    const started = Date.parse(progress.started_at);
    if (Number.isFinite(started)) {
      const seconds = (now - started) / 1000;
      if (seconds >= 0 && seconds <= MAX_PLAUSIBLE_ELAPSED_SECONDS) return seconds;
    }
  }
  return Math.max(0, (now - sessionStart) / 1000);
}

function roundEta(seconds: number): number {
  const step = seconds < 120 ? 5 : 30;
  return Math.max(step, Math.round(seconds / step) * step);
}

/** Seconds left, or null until there is enough to say (5% and 5 seconds) or when the number would be absurd. */
export function estimateSecondsLeft(
  progress: ProgressResult | null,
  sample: ProgressSample | null,
  elapsed: number,
  now: number,
): number | null {
  if (!progress || progress.total_rows <= 0) return null;
  if (clampPercent(progress.percent) < ETA_MIN_PERCENT || elapsed < ETA_MIN_SECONDS) return null;

  let rowsPerSecond = 0;
  if (sample) {
    const seconds = (now - sample.at) / 1000;
    const rows = progress.processed_rows - sample.rows;
    if (seconds >= 3 && rows > 0) rowsPerSecond = rows / seconds;
  }
  if (rowsPerSecond <= 0 && progress.processed_rows > 0) rowsPerSecond = progress.processed_rows / elapsed;
  if (!Number.isFinite(rowsPerSecond) || rowsPerSecond <= 0) return null;

  const left = Math.max(0, progress.total_rows - progress.processed_rows) / rowsPerSecond;
  if (!Number.isFinite(left) || left > ETA_MAX_SECONDS) return null;
  return roundEta(left);
}

export function rowsLine(progress: ProgressResult | null): string {
  const processed = progress?.processed_rows ?? 0;
  const total = progress?.total_rows ?? 0;
  return `${formatCount(processed)} of ${formatCount(total)} rows`;
}

/** "12 rows were not added. Download them from the report, fix them and upload again." Null when everything was added. */
export function notAddedHint(progress: ProgressResult): string | null {
  const count = Math.max(0, progress.failed) + Math.max(0, progress.skipped);
  if (count === 0) return null;
  return `${formatCount(count)} ${plural(count, "row was", "rows were")} not added. Download them from the report, fix them and upload again.`;
}

export function isCancelled(progress: ProgressResult | null): boolean {
  return progress?.stage === "cancelled";
}
