"use client";

import { useState, type FormEvent } from "react";
import Spinner from "@/shared/components/Spinner";
import { Field, inputClass } from "@/shared/components/FormLayout";
import DateInput from "@/shared/components/DateInput";
import Time12hPicker from "@/shared/components/Time12hPicker";
import type { CreateReminderPayload } from "@/features/reminders/types/reminder.types";
import { extractApiError } from "@/shared/utils/apiError";
import { localPartsToIso } from "@/shared/utils/dateTime";

interface ReminderFormProps {
  onSubmit: (payload: CreateReminderPayload) => Promise<void>;
  onCancel: () => void;
}

interface FormState {
  subject: string;
  date: string;
  time: string;
}

function emptyForm(): FormState {
  return { subject: "", date: "", time: "" };
}

export default function ReminderForm({ onSubmit, onCancel }: ReminderFormProps) {
  const [form, setForm] = useState<FormState>(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    if (!form.subject.trim()) {
      setError("Subject is required.");
      return;
    }
    if (!form.date) {
      setError("Date is required.");
      return;
    }
    if (!form.time) {
      setError("Time is required.");
      return;
    }

    const remindAt = localPartsToIso(form.date, form.time);
    if (!remindAt) {
      setError("The reminder date or time is invalid.");
      return;
    }
    // A reminder in the past would fire immediately and show up as an old notification.
    if (new Date(remindAt).getTime() <= Date.now()) {
      setError("Reminder time must be in the future.");
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      await onSubmit({
        subject: form.subject.trim(),
        remind_at: remindAt,
      });
    } catch (err) {
      setError(extractApiError(err, "Couldn't save this reminder. Check the fields and try again."));
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="flex items-center justify-between border-b border-line px-6 py-4">
        <h2 className="font-serif text-xl text-fg">Custom Reminder</h2>
      </div>

      <div className="px-6 py-5">
        {error && (
          <p className="mb-4 animate-shake rounded-md border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger">
            {error}
          </p>
        )}

        <div className="flex flex-col gap-4">
          <Field label="Subject" required fullWidth>
            <input
              autoFocus
              value={form.subject}
              onChange={(e) => update("subject", e.target.value)}
              className={inputClass}
              placeholder="Call John about quotation"
            />
          </Field>

          <Field label="Date" required>
            <DateInput value={form.date} onChange={(value) => update("date", value)} ariaLabel="Reminder date" />
          </Field>

          <Field label="Time" required>
            {form.date ? (
              <Time12hPicker value={form.time} onChange={(value) => update("time", value)} />
            ) : (
              <span className="text-xs text-ink-soft">Select a date first</span>
            )}
          </Field>
        </div>
      </div>

      <div className="flex justify-end gap-3 border-t border-line px-6 py-4">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md border border-line px-4 py-2 text-sm font-medium text-fg hover:bg-paper"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex items-center gap-2 rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white transition hover:bg-ink-2 active:scale-[0.98] disabled:opacity-60"
        >
          {isSubmitting && <Spinner size="sm" className="border-white/30 border-t-white" />}
          {isSubmitting ? "Saving…" : "Save Reminder"}
        </button>
      </div>
    </form>
  );
}
