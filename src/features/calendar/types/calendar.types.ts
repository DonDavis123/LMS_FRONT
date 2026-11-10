/**
 * Types for the Calendar. They mirror the backend `/calendar/events/` API,
 * which returns tasks, meetings, calls and standalone reminders as one
 * normalised list.
 */
export const CALENDAR_EVENT_TYPES = ["TASK", "MEETING", "CALL", "REMINDER"] as const;
export type CalendarEventType = (typeof CALENDAR_EVENT_TYPES)[number];

export type CalendarView = "month" | "week" | "day";

/** "mine" = items I own / host / am assigned to; "team" = the whole company (managers only). */
export type CalendarScope = "mine" | "team";

export interface CalendarEventDto {
  id: string;
  type: CalendarEventType;
  title: string;
  /** ISO date-time, or a plain "YYYY-MM-DD" for all-day tasks. */
  start: string;
  end: string | null;
  all_day: boolean;
  status: string | null;
  owner_id: string | null;
  owner_name: string | null;
  related_record_type: "LEAD" | "CONTACT" | "ACCOUNT" | null;
  related_record_id: string | null;
  related_record_name: string | null;
  reminder_at: string | null;
}

/** A calendar event with its dates already parsed for rendering. */
export interface CalendarEvent extends Omit<CalendarEventDto, "start" | "end"> {
  start: Date;
  end: Date | null;
}
