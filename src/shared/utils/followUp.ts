/**
 * Helpers for turning a line of an AI summary (a call action item, a lead
 * "next step") into the starting values of a task, reminder or meeting form.
 * The forms stay fully editable; these only pre-fill them.
 */

/** Longest subject / title the backend accepts for a task, reminder or meeting. */
export const FOLLOW_UP_MAX_LENGTH = 255;

function oneLine(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

/** One line, at most `FOLLOW_UP_MAX_LENGTH` characters, with an ellipsis when cut. */
export function followUpSubject(text: string, prefix?: string): string {
  const line = oneLine(prefix ? `${prefix}: ${text}` : text);
  if (line.length <= FOLLOW_UP_MAX_LENGTH) return line;
  return `${line.slice(0, FOLLOW_UP_MAX_LENGTH - 1).trimEnd()}…`;
}

/** Full text of the suggestion plus where it came from (nothing is lost when the subject is cut). */
export function followUpDescription(text: string, source: string): string {
  return `${text.trim()}\n\n— From the ${source}.`;
}

/** Tomorrow at 9:00 AM, as the local `YYYY-MM-DD` / `HH:mm` a reminder form edits. */
export function tomorrowMorning(): { date: string; time: string } {
  const day = new Date();
  day.setDate(day.getDate() + 1);
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    date: `${day.getFullYear()}-${pad(day.getMonth() + 1)}-${pad(day.getDate())}`,
    time: "09:00",
  };
}
