"use client";

import { useState, type FormEvent } from "react";
import Spinner from "@/shared/components/Spinner";
import Switch from "@/shared/components/Switch";
import { Field, inputClass } from "@/shared/components/FormLayout";
import DateInput from "@/shared/components/DateInput";
import Time12hPicker from "@/shared/components/Time12hPicker";
import type { CreateReminderPayload, Reminder } from "@/features/reminders/types/reminder.types";
import { extractApiError } from "@/shared/utils/apiError";
import { isoToLocalParts, localPartsToIso } from "@/shared/utils/dateTime";

interface ReminderFormProps {
  mode?: "create" | "edit";
  /** Required in edit mode: the reminder whose values are preloaded. */
  initialReminder?: Reminder;
  /** Optional hint shown above the fields (e.g. why the user is editing). */
  notice?: string;
  onSubmit: (payload: CreateReminderPayload) => Promise<void>;
  onCancel: () => void;
}

interface FormState {
  subject: string;
  date: string;
  time: string;
  enabled: boolean;
}

function initialState(reminder?: Reminder): FormState {
  if (!reminder) return { subject: "", date: "", time: "", enabled: true };
  const parts = isoToLocalParts(reminder.remind_at);
  return {
    subject: reminder.subject,
    date: parts?.date ?? "",
    time: parts?.time ?? "",
    enabled: reminder.is_enabled,
  };
}

export default function ReminderForm({
  mode = "create",
  initialReminder,
  notice,
  onSubmit,
  onCancel,
}: ReminderFormProps) {
  const isEdit = mode === "edit";
  const [form, setForm] = useState<FormState>(() => initialState(initialReminder));
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
    // An enabled reminder in the past would fire immediately and show up as an
    // old notification. A disabled one never fires, so it may keep its old time.
    if (form.enabled && new Date(remindAt).getTime() <= Date.now()) {
      setError("Reminder time must be in the future.");
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      await onSubmit({
        subject: form.subject.trim(),
        remind_at: remindAt,
        ...(isEdit ? { is_enabled: form.enabled } : {}),
      });
    } catch (err) {
      setError(extractApiError(err, "Couldn't save this reminder. Check the fields and try again."));
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="flex items-center justify-between border-b border-line px-6 py-4 pr-14">
        <h2 id="reminder-form-title" className="font-serif text-xl text-fg">
          {isEdit ? "Edit Reminder" : "Create Reminder"}
        </h2>
      </div>

      <div className="px-6 py-5">
        {notice && (
          <p className="mb-4 rounded-md border border-line bg-paper px-3 py-2 text-sm text-ink-soft">{notice}</p>
        )}
        {error && (
          <p
            role="alert"
            className="mb-4 animate-shake rounded-md border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger"
          >
            {error}
          </p>
        )}

        <div className="flex flex-col gap-4">
          <Field label="Subject" required fullWidth>
            <input
              autoFocus={!isEdit}
              value={form.subject}
              maxLength={255}
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

          {isEdit && (
            <div className="flex items-center justify-between gap-3 rounded-md border border-line px-3 py-1.5">
              <span className="text-sm font-medium text-fg">Reminder enabled</span>
              <Switch
                checked={form.enabled}
                onChange={(next) => update("enabled", next)}
                ariaLabel="Reminder enabled"
                showState
              />
            </div>
          )}
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
          {isSubmitting ? "Saving…" : isEdit ? "Save Changes" : "Save Reminder"}
        </button>
      </div>
    </form>
  );
}
