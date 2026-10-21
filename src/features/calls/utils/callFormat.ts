import type { Call, CallLatestUpdate, CallRecordType } from "@/features/calls/types/call.types";

const pad = (n: number) => String(n).padStart(2, "0");

/** "4 min 10 sec" — mirrors the backend's `duration_label`. */
export function formatDuration(totalSeconds: number): string {
  const total = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  if (hours) return `${hours} hr ${minutes} min ${seconds} sec`;
  if (minutes) return `${minutes} min ${seconds} sec`;
  return `${seconds} sec`;
}

/** "04:10" / "1:04:10" — for the live call timer. */
export function formatClock(totalSeconds: number): string {
  const total = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  return hours ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${pad(minutes)}:${pad(seconds)}`;
}

/** ISO instant -> the local "YYYY-MM-DDTHH:mm" value the date-time input uses. */
export function toLocalInputValue(iso: string | Date | null | undefined): string {
  if (!iso) return "";
  const date = iso instanceof Date ? iso : new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** Compact date-time for table rows ("Oct 21, 3:45 PM"). */
export function formatCallDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

/** Which record a call belongs to, with a display name. */
export function callRecord(call: Pick<Call, "lead_id" | "lead_name" | "contact_id" | "contact_name">): {
  type: CallRecordType;
  id: string;
  name: string;
} | null {
  if (call.lead_id) return { type: "LEAD", id: call.lead_id, name: call.lead_name || "Unnamed lead" };
  if (call.contact_id) return { type: "CONTACT", id: call.contact_id, name: call.contact_name || "Unnamed contact" };
  return null;
}

/** Detail-page href for a record, so a call can link back to it. */
export function recordHref(type: CallRecordType, id: string): string {
  return type === "LEAD" ? `/dashboard/leads/${id}` : `/dashboard/contacts/${id}`;
}

export function recordLabel(type: CallRecordType): string {
  return type === "LEAD" ? "Lead" : "Contact";
}

/** Labels for the fields a call edit can change (keys match the backend's change history). */
export const CALL_FIELD_LABELS: Record<string, string> = {
  call_start_time: "Start Time",
  duration_seconds: "Duration",
  call_type: "Call Type",
  outcome: "Outcome",
  description: "Notes",
};

/** One old/new value of a call change, formatted for display. */
export function formatChangeValue(field: string, value: unknown): string {
  if (value === null || value === undefined || value === "") return "Empty";
  if (field === "call_start_time" && typeof value === "string") return formatCallDateTime(value);
  if (field === "duration_seconds" && typeof value === "number") return formatDuration(value);
  return String(value);
}

/**
 * One-line summary of a record's latest call event for the table row:
 * "Call logged", "Outcome: Busy → Connected (+1 more)", "Call deleted".
 * Notes edits are summarised as "Notes updated" so long text never fills a cell.
 */
export function summarizeLatestUpdate(update: CallLatestUpdate): string {
  if (update.event_type === "CALL_LOGGED") return "Call logged";
  if (update.event_type === "CALL_DELETED") return "Call deleted";
  if (update.event_type !== "CALL_UPDATED") return update.message;

  const entries = Object.entries(update.changes ?? {});
  if (entries.length === 0) return "Call updated";

  const describe = ([field, change]: [string, CallLatestUpdate["changes"][string]]) =>
    field === "description"
      ? "Notes updated"
      : `${CALL_FIELD_LABELS[field] ?? field.replace(/_/g, " ")}: ${formatChangeValue(field, change.old_value)} → ${formatChangeValue(field, change.new_value)}`;

  const [first, ...rest] = entries;
  return rest.length > 0 ? `${describe(first)} (+${rest.length} more)` : describe(first);
}
