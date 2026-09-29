import { apiClient } from "@/infrastructure/api/client";
import type {
  CreateReminderPayload,
  Reminder,
  UpdateReminderPayload,
} from "@/features/reminders/types/reminder.types";
import { isCustomReminder, sortReminders } from "@/features/reminders/utils/reminder.utils";

/**
 * Confirmed backend endpoints:
 *   GET    /api/reminders/        the current user's reminders (custom + task/meeting-linked)
 *   POST   /api/reminders/        create
 *   GET    /api/reminders/{id}/   detail
 *   PATCH  /api/reminders/{id}/   update (subject, remind_at, is_enabled)
 *   DELETE /api/reminders/{id}/   delete
 */
export const ReminderService = {
  /**
   * Only reminders the user created themselves. Task- and meeting-driven
   * reminders come back from the same endpoint and are filtered out here.
   */
  async getCustomReminders(): Promise<Reminder[]> {
    const { data } = await apiClient.get<Reminder[]>("/reminders/");
    return sortReminders(data.filter(isCustomReminder));
  },

  async createReminder(payload: CreateReminderPayload): Promise<Reminder> {
    const { data } = await apiClient.post<Reminder>("/reminders/", payload);
    return data;
  },

  async updateReminder(id: string, payload: UpdateReminderPayload): Promise<Reminder> {
    const { data } = await apiClient.patch<Reminder>(`/reminders/${id}/`, payload);
    return data;
  },

  async setEnabled(id: string, isEnabled: boolean): Promise<Reminder> {
    return this.updateReminder(id, { is_enabled: isEnabled });
  },

  async deleteReminder(id: string): Promise<string> {
    const { data } = await apiClient.delete<{ message?: string; detail?: string } | undefined>(
      `/reminders/${id}/`
    );
    return data?.message ?? data?.detail ?? "Reminder deleted successfully";
  },
};
