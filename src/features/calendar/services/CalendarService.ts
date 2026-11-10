import { apiClient } from "@/infrastructure/api/client";
import { parseDateKey } from "@/features/dashboard/utils/dashboardMetrics";
import type {
  CalendarEvent,
  CalendarEventDto,
  CalendarEventType,
  CalendarScope,
} from "@/features/calendar/types/calendar.types";

interface CalendarEventsResponse {
  results: CalendarEventDto[];
}

export interface CalendarQuery {
  /** Inclusive start of the range (local midnight). */
  start: Date;
  /** Exclusive end of the range (local midnight). */
  end: Date;
  types?: CalendarEventType[];
  scope?: CalendarScope;
  ownerId?: string | null;
}

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

/**
 * ISO 8601 with the *local* UTC offset ("2026-11-01T00:00:00+05:30").
 * The backend reads task due dates from the wall date of this value, so the
 * visible calendar days always match the user's own time zone.
 */
export function toOffsetIso(date: Date): string {
  const offsetMinutes = -date.getTimezoneOffset();
  const sign = offsetMinutes >= 0 ? "+" : "-";
  const abs = Math.abs(offsetMinutes);
  return (
    `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}` +
    `T${pad2(date.getHours())}:${pad2(date.getMinutes())}:${pad2(date.getSeconds())}` +
    `${sign}${pad2(Math.floor(abs / 60))}:${pad2(abs % 60)}`
  );
}

function toEvent(dto: CalendarEventDto): CalendarEvent {
  // A bare "YYYY-MM-DD" (all-day task) must be read as a LOCAL day:
  // new Date("YYYY-MM-DD") would be UTC midnight and slip a day west of UTC.
  const parse = (value: string): Date =>
    /^\d{4}-\d{2}-\d{2}$/.test(value) ? (parseDateKey(value) as Date) : new Date(value);

  return {
    ...dto,
    start: parse(dto.start),
    end: dto.end ? parse(dto.end) : null,
  };
}

export const CalendarService = {
  async getEvents({ start, end, types, scope = "mine", ownerId }: CalendarQuery): Promise<CalendarEvent[]> {
    const { data } = await apiClient.get<CalendarEventsResponse>("/calendar/events/", {
      params: {
        start: toOffsetIso(start),
        end: toOffsetIso(end),
        ...(types && types.length > 0 ? { types: types.join(",") } : {}),
        ...(scope === "team" ? { scope } : {}),
        ...(ownerId ? { owner_id: ownerId } : {}),
      },
    });

    return data.results.map(toEvent);
  },
};
