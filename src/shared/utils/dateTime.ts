/**
 * Timezone-safe helpers for datetime fields.
 *
 * The API stores and returns instants (ISO strings, usually UTC or with an
 * offset). Forms edit them as a *local* date + local time. Slicing the ISO
 * string (`iso.slice(0, 10)` / `iso.slice(11, 16)`) reads the UTC/offset wall
 * clock as if it were local time, which shifts the value (5h30m for IST) every
 * time a record is opened and saved. Always convert through `Date`.
 */

const pad = (n: number) => String(n).padStart(2, "0");

function parse(iso?: string | null): Date | null {
  if (!iso) return null;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** ISO instant -> local `{ date: "YYYY-MM-DD", time: "HH:mm" }`, or null. */
export function isoToLocalParts(iso?: string | null): { date: string; time: string } | null {
  const d = parse(iso);
  if (!d) return null;
  return {
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  };
}

/** ISO instant -> local value for an `<input type="datetime-local">` ("" if empty/invalid). */
export function isoToLocalInputValue(iso?: string | null): string {
  const parts = isoToLocalParts(iso);
  return parts ? `${parts.date}T${parts.time}` : "";
}

/** Local `YYYY-MM-DD` + `HH:mm` (or a datetime-local value) -> ISO instant (UTC), or null if invalid. */
export function localPartsToIso(date: string, time?: string): string | null {
  if (!date) return null;
  const d = new Date(time ? `${date}T${time}` : date);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/** Human-readable local date and time for display. */
export function formatLocalDateTime(iso?: string | null): string {
  const d = parse(iso);
  if (!d) return "";
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** True when both instants fall in the same minute (forms only edit to the minute). */
export function isSameMinute(a?: string | null, b?: string | null): boolean {
  const da = parse(a);
  const db = parse(b);
  if (!da || !db) return false;
  return Math.floor(da.getTime() / 60000) === Math.floor(db.getTime() / 60000);
}
