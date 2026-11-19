"use client";

import { useRef, useState } from "react";
import { Bell, Calendar, CheckSquare, ChevronDown, Plus } from "lucide-react";
import Modal from "@/shared/components/Modal";
import FloatingPopover from "@/shared/components/FloatingPopover";
import TaskForm from "@/features/tasks/components/TaskForm";
import ReminderForm from "@/features/reminders/components/ReminderForm";
import MeetingForm from "@/features/meetings/components/MeetingForm";
import { TaskService } from "@/features/tasks/services/TaskService";
import { ReminderService } from "@/features/reminders/services/ReminderService";
import { MeetingService } from "@/features/meetings/services/MeetingService";
import type { CreateTaskPayload } from "@/features/tasks/types/task.types";
import type { CreateReminderPayload } from "@/features/reminders/types/reminder.types";
import type { CreateMeetingPayload } from "@/features/meetings/types/meeting.types";
import type { SelectedRecord } from "@/features/meetings/components/SelectedRecordsField";
import { emptyRelatedTo, type RelatedToValue } from "@/shared/components/RelatedToPicker";
import { followUpDescription, followUpSubject, tomorrowMorning } from "@/shared/utils/followUp";

interface CreateFollowUpMenuProps {
  /** The summary line to act on: a call action item, a lead next step, … */
  text: string;
  /** Where the text came from, e.g. "call summary" / "lead summary". Written into the description. */
  source: string;
  /** The lead or contact the follow-up is about. Pre-selected on the task and meeting. */
  related?: RelatedToValue;
  /** Email of that record, so the meeting form can tell who will be invited. */
  relatedEmail?: string | null;
  /** `icon` is a small round "+" for list rows; `button` shows a "Follow up" label. */
  variant?: "icon" | "button";
  /** Extra classes for the trigger button. */
  className?: string;
}

type Kind = "task" | "reminder" | "meeting";

const OPTIONS: { kind: Kind; label: string; hint: string; icon: typeof Bell }[] = [
  { kind: "task", label: "Create task", hint: "Something to do", icon: CheckSquare },
  { kind: "reminder", label: "Set reminder", hint: "A nudge at a set time", icon: Bell },
  { kind: "meeting", label: "Schedule meeting", hint: "Put it in the calendar", icon: Calendar },
];

/**
 * "Follow up" menu for one line of an AI summary. Picking Task, Reminder or
 * Meeting opens the normal create form in a dialog, pre-filled from the line
 * (and the lead / contact it belongs to). Nothing is created until the user
 * saves, so the suggestion can be edited first.
 *
 * Reuses TaskForm / ReminderForm / MeetingForm and their services, so the
 * same validation, timeline entries and notifications apply as everywhere else.
 */
export default function CreateFollowUpMenu({
  text,
  source,
  related,
  relatedEmail = null,
  variant = "icon",
  className = "",
}: CreateFollowUpMenuProps) {
  const anchorRef = useRef<HTMLButtonElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [kind, setKind] = useState<Kind | null>(null);
  const [toast, setToast] = useState<{ message: string; warning: boolean } | null>(null);

  const record = related ?? emptyRelatedTo();
  const hasRecord = Boolean(record.personId) && (record.personType === "lead" || record.personType === "contact");
  const personLabel = record.personLabel || undefined;

  function close() {
    setKind(null);
  }

  function done(message: string, warning = false) {
    close();
    setToast({ message, warning });
    window.setTimeout(() => setToast(null), warning ? 6000 : 3000);
  }

  async function createTask(payload: CreateTaskPayload) {
    await TaskService.createTask(payload);
    done("Task created successfully");
  }

  async function createReminder(payload: CreateReminderPayload) {
    await ReminderService.createReminder(payload);
    done("Reminder saved successfully");
  }

  async function createMeeting(payload: CreateMeetingPayload) {
    const created = await MeetingService.createMeeting(payload);
    done(created.warning ?? "Meeting scheduled successfully", Boolean(created.warning));
  }

  const meetingRelated: SelectedRecord[] = hasRecord
    ? [
        {
          id: record.personId,
          name: personLabel ?? (record.personType === "lead" ? "Lead" : "Contact"),
          email: relatedEmail,
          type: record.personType === "lead" ? "lead" : "contact",
        },
      ]
    : [];

  const reminderStart = tomorrowMorning();
  const label = `Create a follow-up for: ${followUpSubject(text)}`;

  return (
    <>
      <button
        ref={anchorRef}
        type="button"
        onClick={() => setMenuOpen((open) => !open)}
        aria-haspopup="dialog"
        aria-expanded={menuOpen}
        aria-label={label}
        title="Create task, reminder or meeting"
        className={
          variant === "icon"
            ? `grid h-6 w-6 shrink-0 place-items-center rounded-full border border-line text-ink-soft transition hover:border-slate hover:bg-paper hover:text-fg ${className}`
            : `inline-flex items-center gap-1.5 rounded-md border border-line px-2.5 py-1.5 text-xs font-semibold text-fg transition hover:bg-paper ${className}`
        }
      >
        {variant === "icon" ? (
          <Plus size={13} aria-hidden="true" />
        ) : (
          <>
            <Plus size={13} aria-hidden="true" />
            Follow up
            <ChevronDown size={12} aria-hidden="true" />
          </>
        )}
      </button>

      {menuOpen && (
        <FloatingPopover anchorRef={anchorRef} onClose={() => setMenuOpen(false)} width={232} ariaLabel="Create a follow-up">
          <ul className="-m-2.5 space-y-0.5">
            {OPTIONS.map(({ kind: optionKind, label: optionLabel, hint, icon: Icon }) => (
              <li key={optionKind}>
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    setKind(optionKind);
                  }}
                  className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition hover:bg-paper"
                >
                  <Icon size={15} aria-hidden="true" className="shrink-0 text-slate" />
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-fg">{optionLabel}</span>
                    <span className="block text-[11px] text-ink-soft">{hint}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </FloatingPopover>
      )}

      <Modal isOpen={kind === "task"} onClose={close}>
        <TaskForm
          mode="create"
          initialSubject={followUpSubject(text)}
          initialDescription={followUpDescription(text, source)}
          initialRelated={hasRecord ? record : undefined}
          onSubmit={createTask}
          onCancel={close}
        />
      </Modal>

      <Modal isOpen={kind === "reminder"} onClose={close} maxWidthClass="max-w-md" ariaLabelledBy="reminder-form-title">
        <ReminderForm
          mode="create"
          // A reminder has no lead / contact link of its own, so the name goes in the subject.
          initialSubject={followUpSubject(text, personLabel)}
          initialDate={reminderStart.date}
          initialTime={reminderStart.time}
          onSubmit={createReminder}
          onCancel={close}
        />
      </Modal>

      <Modal isOpen={kind === "meeting"} onClose={close}>
        <MeetingForm
          mode="create"
          initialTitle={followUpSubject(text)}
          initialDescription={followUpDescription(text, source)}
          initialRelated={meetingRelated}
          onSubmit={createMeeting}
          onCancel={close}
        />
      </Modal>

      {toast && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed bottom-6 right-6 z-[70] max-w-sm rounded-md border px-4 py-3 text-sm font-medium shadow-lg ${
            toast.warning
              ? "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-500/40 dark:bg-amber-950 dark:text-amber-300"
              : "border-success/30 bg-success-soft text-success"
          }`}
        >
          {toast.message}
        </div>
      )}
    </>
  );
}
