"use client";

import { useState } from "react";
import { Bell, CalendarClock, Phone, SquareCheckBig, type LucideIcon } from "lucide-react";
import Modal from "@/shared/components/Modal";
import TaskForm from "@/features/tasks/components/TaskForm";
import MeetingForm from "@/features/meetings/components/MeetingForm";
import CallForm from "@/features/calls/components/CallForm";
import ReminderForm from "@/features/reminders/components/ReminderForm";
import { TaskService } from "@/features/tasks/services/TaskService";
import { MeetingService } from "@/features/meetings/services/MeetingService";
import { CallService } from "@/features/calls/services/CallService";
import { callLoggedMessage } from "@/features/calls/utils/callFormat";
import { ReminderService } from "@/features/reminders/services/ReminderService";
import { parseDateKey } from "@/features/dashboard/utils/dashboardMetrics";
import { longDayTitle } from "@/features/calendar/utils/calendarDates";

type Kind = "task" | "meeting" | "call" | "reminder";

interface QuickAddDialogProps {
  /** Day to add to ("YYYY-MM-DD"); the dialog is closed while this is null. */
  day: string | null;
  onClose: () => void;
  /** Called after something was saved, with a message for the page's toast. */
  onCreated: (message: string) => void;
}

const CHOICES: { kind: Kind; label: string; hint: string; icon: LucideIcon }[] = [
  { kind: "task", label: "Task", hint: "Something to do by this day", icon: SquareCheckBig },
  { kind: "meeting", label: "Meeting", hint: "Schedule a meeting with a start and end time", icon: CalendarClock },
  { kind: "call", label: "Call", hint: "Schedule a call, or log one that already happened", icon: Phone },
  { kind: "reminder", label: "Reminder", hint: "Get notified about something at a set time", icon: Bell },
];

/** "Add to calendar": pick what to add, then fill in the same form used on the Tasks / Meetings / Calls pages. */
export default function QuickAddDialog({ day, onClose, onCreated }: QuickAddDialogProps) {
  const [kind, setKind] = useState<Kind | null>(null);

  function close() {
    setKind(null);
    onClose();
  }

  const date = day ? parseDateKey(day) : null;

  return (
    <Modal
      isOpen={day !== null}
      onClose={close}
      ariaLabel="Add to calendar"
      maxWidthClass={kind === "reminder" ? "max-w-md" : undefined}
    >
      {day && kind === null && (
        <div className="px-5 py-5">
          <h2 className="font-serif text-xl text-fg">Add to calendar</h2>
          {date && <p className="mt-1 text-sm text-ink-soft">{longDayTitle(date)}</p>}
          <ul className="mt-4 grid gap-2">
            {CHOICES.map(({ kind: choice, label, hint, icon: Icon }) => (
              <li key={choice}>
                <button
                  type="button"
                  onClick={() => setKind(choice)}
                  className="flex w-full items-center gap-3 rounded-md border border-line px-3 py-3 text-left transition hover:bg-paper focus-visible:outline focus-visible:outline-2 focus-visible:outline-slate"
                >
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-paper text-ink-soft">
                    <Icon size={18} aria-hidden="true" />
                  </span>
                  <span>
                    <span className="block text-sm font-semibold text-fg">{label}</span>
                    <span className="block text-xs text-ink-soft">{hint}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {day && kind === "task" && (
        <TaskForm
          mode="create"
          initialDueDate={day}
          onCancel={close}
          onSubmit={async (payload) => {
            await TaskService.createTask(payload);
            close();
            onCreated("Task created successfully");
          }}
        />
      )}

      {day && kind === "meeting" && (
        <MeetingForm
          mode="create"
          initialDate={day}
          onCancel={close}
          onSubmit={async (payload) => {
            const created = await MeetingService.createMeeting(payload);
            close();
            onCreated(created.warning ?? "Meeting scheduled successfully");
          }}
        />
      )}

      {day && kind === "call" && (
        <CallForm
          mode="create"
          initialDate={day}
          onCancel={close}
          onSubmit={async (payload, recording) => {
            const { recordingError } = await CallService.createCallWithRecording(payload, recording);
            close();
            onCreated(callLoggedMessage(recordingError, payload.status === "Planned" ? "Call scheduled successfully" : "Call logged successfully"));
          }}
        />
      )}

      {day && kind === "reminder" && (
        <ReminderForm
          mode="create"
          initialDate={day}
          onCancel={close}
          onSubmit={async (payload) => {
            await ReminderService.createReminder(payload);
            close();
            onCreated("Reminder saved successfully");
          }}
        />
      )}
    </Modal>
  );
}
