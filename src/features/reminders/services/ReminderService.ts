import { apiClient } from "@/infrastructure/api/client";
import type { CreateReminderPayload, Reminder } from "@/features/reminders/types/reminder.types";

/**
 * Confirmed backend endpoint used here:
 *   POST /api/reminders/   create
 * (GET/PATCH/DELETE also exist on the backend for task/meeting-linked
 * reminders, but the Custom Reminder dialog only ever creates a
 * standalone one.)
 */
export const ReminderService = {
  async createReminder(payload: CreateReminderPayload): Promise<Reminder> {
    const { data } = await apiClient.post<Reminder>("/reminders/", payload);
    return data;
  },
};
