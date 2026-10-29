import type { HistoryItem } from "@/features/leadImport/types/leadImport.types";
import { formatCount } from "@/features/leadImport/utils/format";
import type { StatusChipInfo, StatusTone } from "@/features/leadImport/utils/reportView";
import { formatDateTime } from "@/shared/utils/formatDate";

/** The server is still working on this import (status queued/processing with stage running). */
export function isRunningItem(item: Pick<HistoryItem, "status" | "stage">): boolean {
  return (item.status === "queued" || item.status === "processing") && (item.stage === "running" || item.stage === null);
}

export function historyStatusChip(item: Pick<HistoryItem, "status" | "stage">): StatusChipInfo {
  if (isRunningItem(item)) return { label: "Running", tone: "info" };
  if (item.status === "completed" && item.stage === "cancelled") return { label: "Cancelled", tone: "neutral" };
  switch (item.status) {
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

export interface ResultChipInfo {
  key: string;
  label: string;
  value: number;
  tone: StatusTone;
}

/** The compact result chips of one import. Zeros are hidden. */
export function resultChips(item: HistoryItem): ResultChipInfo[] {
  const all: ResultChipInfo[] = [
    { key: "created", label: "Added", value: item.created, tone: "success" },
    { key: "updated", label: "Updated", value: item.updated, tone: "info" },
    { key: "skipped", label: "Skipped", value: item.skipped, tone: "neutral" },
    { key: "failed", label: "Need attention", value: item.failed, tone: "danger" },
    { key: "converted", label: "Converted", value: item.converted, tone: "neutral" },
  ];
  return all.filter((chip) => Number.isFinite(chip.value) && chip.value > 0);
}

/** "Undone on Sep 29, 2026, 10:30 AM by Sam Lee", or null when nothing was undone. */
export function undoneLine(item: HistoryItem): string | null {
  if (item.status !== "undone" && item.status !== "partly_undone") return null;
  const label = item.status === "undone" ? "Undone" : "Partly undone";
  const when = formatDateTime(item.undone_at);
  const parts = [label];
  if (when) parts.push(`on ${when}`);
  if (item.undone_by_name) parts.push(`by ${item.undone_by_name}`);
  return parts.join(" ");
}

export function importsSubtitle(total: number | null): string {
  if (total === null) return "Loading imports";
  return `${formatCount(total)} ${total === 1 ? "import" : "imports"}`;
}

/** The label of the row action that opens the undo dialog. */
export function undoActionLabel(item: Pick<HistoryItem, "status">): string {
  return item.status === "partly_undone" ? "Try undo again" : "Undo import";
}
