"use client";

import Modal from "@/shared/components/Modal";
import ReminderForm from "@/features/reminders/components/ReminderForm";
import { ReminderService } from "@/features/reminders/services/ReminderService";
import type { CreateReminderPayload, Reminder } from "@/features/reminders/types/reminder.types";

interface ReminderDialogProps {
  isOpen: boolean;
  onClose: () => void;
  /** When set the dialog edits this reminder; otherwise it creates a new one. */
  reminder?: Reminder | null;
  /** Optional hint shown above the fields. */
  notice?: string;
  onSaved: (reminder: Reminder, mode: "create" | "edit") => void;
}

/**
 * The single Create / Edit reminder dialog — the same ReminderForm in both
 * modes, wrapped in the shared Modal like the Task/Meeting quick-create
 * dialogs. Open state is owned by the caller (the Reminder page).
 */
export default function ReminderDialog({ isOpen, onClose, reminder, notice, onSaved }: ReminderDialogProps) {
  const mode = reminder ? "edit" : "create";

  async function submit(payload: CreateReminderPayload) {
    const saved = reminder
      ? await ReminderService.updateReminder(reminder.id, payload)
      : await ReminderService.createReminder(payload);
    onSaved(saved, mode);
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidthClass="max-w-md" ariaLabelledBy="reminder-form-title">
      <ReminderForm
        key={reminder?.id ?? "new"}
        mode={mode}
        initialReminder={reminder ?? undefined}
        notice={notice}
        onSubmit={submit}
        onCancel={onClose}
      />
    </Modal>
  );
}
