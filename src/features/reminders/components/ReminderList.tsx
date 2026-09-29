"use client";

import { AlarmClock, Trash2 } from "lucide-react";
import Switch from "@/shared/components/Switch";
import type { Reminder } from "@/features/reminders/types/reminder.types";
import { formatLocalDateAndTime } from "@/shared/utils/dateTime";

interface ReminderListProps {
  reminders: Reminder[];
  isLoading: boolean;
  error: string | null;
  /** Ids with a toggle or delete request in flight (their controls are locked). */
  busyIds: ReadonlySet<string>;
  onCreateClick: () => void;
  onEditClick: (reminder: Reminder) => void;
  onToggle: (reminder: Reminder, enabled: boolean) => void;
  onDelete: (reminder: Reminder) => void;
}

const createButtonClass =
  "whitespace-nowrap rounded-md bg-amber px-4 py-2 text-sm font-semibold text-fg transition hover:bg-amber-dark active:scale-[0.98]";

export default function ReminderList({
  reminders,
  isLoading,
  error,
  busyIds,
  onCreateClick,
  onEditClick,
  onToggle,
  onDelete,
}: ReminderListProps) {
  return (
    <div className="lp-card mx-auto max-w-3xl overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-line bg-surface/80 p-5 backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="font-serif text-xl text-fg">Reminders</h1>
          <p className="text-sm text-ink-soft">
            {isLoading ? "Loading…" : `${reminders.length} ${reminders.length === 1 ? "reminder" : "reminders"}`}
          </p>
        </div>
        <button type="button" onClick={onCreateClick} className={createButtonClass}>
          + Create Reminder
        </button>
      </div>

      {error && <p className="border-b border-line bg-danger-soft px-4 py-3 text-sm text-danger">{error}</p>}

      {isLoading ? (
        <div className="space-y-3 p-4" aria-busy="true">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 animate-shimmer rounded-md" />
          ))}
        </div>
      ) : reminders.length === 0 ? (
        !error && (
          <div className="flex flex-col items-center gap-3 px-4 py-16 text-center animate-scale-in">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-paper text-ink-soft">
              <AlarmClock size={20} />
            </span>
            <p className="font-serif text-lg text-fg">No reminders yet</p>
            <p className="max-w-sm text-sm text-ink-soft">
              Create a reminder to stay on top of important follow-ups.
            </p>
            <button
              type="button"
              onClick={onCreateClick}
              className="mt-1 rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white transition hover:bg-ink-2 active:scale-[0.98]"
            >
              + Create Reminder
            </button>
          </div>
        )
      ) : (
        <ul>
          {reminders.map((reminder) => {
            const isBusy = busyIds.has(reminder.id);
            return (
              <li
                key={reminder.id}
                className="flex items-center gap-2 border-b border-line px-3 py-2 last:border-b-0 sm:gap-3 sm:px-4"
              >
                <button
                  type="button"
                  onClick={() => onEditClick(reminder)}
                  disabled={isBusy}
                  aria-label={`Edit reminder: ${reminder.subject}`}
                  className={`min-w-0 flex-1 rounded-md px-2 py-2 text-left outline-none transition hover:bg-paper focus-visible:ring-2 focus-visible:ring-slate disabled:cursor-wait ${
                    reminder.is_enabled ? "" : "opacity-70"
                  }`}
                >
                  <span className="line-clamp-2 break-words text-sm font-medium text-fg">{reminder.subject}</span>
                  <span className="mt-0.5 block text-xs text-ink-soft">{formatLocalDateAndTime(reminder.remind_at)}</span>
                </button>

                <div className="flex shrink-0 items-center gap-0.5 sm:gap-2">
                  <Switch
                    checked={reminder.is_enabled}
                    onChange={(next) => onToggle(reminder, next)}
                    loading={isBusy}
                    ariaLabel={`Reminder enabled: ${reminder.subject}`}
                    showState
                  />
                  <button
                    type="button"
                    onClick={() => onDelete(reminder)}
                    disabled={isBusy}
                    aria-label={`Delete reminder: ${reminder.subject}`}
                    title="Delete"
                    className="flex h-9 w-9 items-center justify-center rounded-md text-ink-soft outline-none transition hover:bg-danger-soft hover:text-danger focus-visible:ring-2 focus-visible:ring-slate disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
