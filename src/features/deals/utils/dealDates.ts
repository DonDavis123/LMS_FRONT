import type { DealStage } from "@/features/deals/types/deal.types";
import { isClosedStage } from "@/features/deals/utils/dealStages";

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** Today as a local `YYYY-MM-DD` string. */
export function todayIso(): string {
  const now = new Date();
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** `"2026-11-30"` → `Nov 30, 2026` (parsed as a local date, so no timezone shift). */
export function formatCloseDate(value: string | null | undefined): string {
  if (!value) return "—";
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return value;
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** An open deal whose expected close date is before today. */
export function isOverdue(expectedCloseDate: string | null | undefined, stage: DealStage): boolean {
  if (!expectedCloseDate || isClosedStage(stage)) return false;
  // ISO dates compare correctly as strings.
  return expectedCloseDate.slice(0, 10) < todayIso();
}
