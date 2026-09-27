"use client";

import { useState } from "react";
import Modal from "@/shared/components/Modal";
import ReminderForm from "@/features/reminders/components/ReminderForm";
import { ReminderService } from "@/features/reminders/services/ReminderService";
import type { CreateReminderPayload } from "@/features/reminders/types/reminder.types";

interface ReminderDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Controlled version of the "quick create" Modal pattern used by
 * CreateTaskFromRecord — the trigger here is the "Custom Reminder" item
 * inside the profile dropdown, so open state is owned by the caller
 * (DashboardHeader) instead of this component.
 */
export default function ReminderDialog({ isOpen, onClose }: ReminderDialogProps) {
  const [message, setMessage] = useState<string | null>(null);

  async function submit(payload: CreateReminderPayload) {
    await ReminderService.createReminder(payload);
    onClose();
    setMessage("Reminder saved successfully");
    window.setTimeout(() => setMessage(null), 3000);
  }

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} maxWidthClass="max-w-md">
        <ReminderForm onSubmit={submit} onCancel={onClose} />
      </Modal>
      {message && (
        <div className="fixed bottom-6 right-6 z-[70] rounded-md border border-success/30 bg-success-soft px-4 py-3 text-sm font-medium text-success shadow-lg animate-toast-in">
          {message}
        </div>
      )}
    </>
  );
}
