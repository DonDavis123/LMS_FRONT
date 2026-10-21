import type { Call, CallRecordType } from "@/features/calls/types/call.types";

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
