import { apiClient } from "@/infrastructure/api/client";
import type { DailyBriefing } from "@/features/dashboard/types/dailyBriefing.types";

/** The browser's IANA zone, so "today" on the server is the user's own calendar day. */
function browserTimeZone(): string | undefined {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || undefined;
  } catch {
    return undefined;
  }
}

export const DailyBriefingService = {
  /**
   * POST /dashboard/briefing/ — asks the backend to plan the user's day from
   * their open tasks and today's meetings. Every call costs one model request
   * and nothing is saved, so it only runs on a user click.
   */
  async generate(): Promise<DailyBriefing> {
    const { data } = await apiClient.post<DailyBriefing>("/dashboard/briefing/", { tz: browserTimeZone() });
    return { ...data, priorities: data.priorities ?? [], heads_up: data.heads_up ?? [] };
  },
};
