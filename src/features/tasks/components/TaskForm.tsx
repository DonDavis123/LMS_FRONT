"use client";

import { useEffect, useState, type FormEvent } from "react";
import { userService } from "@/features/users/services/userService";
import type { LeadOwnerOption } from "@/features/auth/types/auth.types";
import { authService } from "@/features/auth/services/authService";
import OwnerPicker from "@/shared/components/OwnerPicker";
import { emptyRelatedTo, type RelatedToValue } from "@/shared/components/RelatedToPicker";
import ActivityRelatedPicker from "@/shared/components/ActivityRelatedPicker";
import Spinner from "@/shared/components/Spinner";
import { inputClass, Field } from "@/shared/components/FormLayout";
import DateInput from "@/shared/components/DateInput";
import Time12hPicker from "@/shared/components/Time12hPicker";
import ModernStatusSelect from "@/shared/components/ModernStatusSelect";
import {
  TASK_PRIORITIES,
  TASK_STATUSES,
  DEFAULT_TASK_PRIORITY,
  DEFAULT_TASK_STATUS,
  type Task,
  type TaskPriority,
  type TaskStatus,
  type CreateTaskPayload,
} from "@/features/tasks/types/task.types";

interface TaskFormProps {
  mode: "create" | "edit";
  initialTask?: Task;
  onSubmit: (payload: CreateTaskPayload) => Promise<void>;
  onCancel: () => void;
  initialRelated?: RelatedToValue;
}

interface FormState {
  subject: string;
  owner_id: string;
  ownerLabel: string;
  due_date: string;
  priority: TaskPriority;
  status: TaskStatus;
  reminder_date: string;
  reminder_time: string;
  description: string;
  related: RelatedToValue;
}

function emptyForm(): FormState {
  return {
    subject: "",
    owner_id: "",
    ownerLabel: "",
    due_date: "",
    priority: DEFAULT_TASK_PRIORITY,
    status: DEFAULT_TASK_STATUS,
    reminder_date: "",
    reminder_time: "",
    description: "",
    related: emptyRelatedTo(),
  };
}

function formFromTask(task: Task): FormState {
  const related: RelatedToValue = {
    personType: task.lead_id ? "lead" : task.contact_id ? "contact" : "",
    personId: task.lead_id ?? task.contact_id ?? "",
    personLabel: task.lead_name ?? task.contact_name ?? "",
    accountId: task.account_id ?? "",
    accountLabel: task.account_name ?? "",
  };

  return {
    subject: task.subject ?? "",
    owner_id: task.owner_id ?? "",
    ownerLabel: task.owner_name ?? "",
    due_date: task.due_date ?? "",
    priority: task.priority ?? DEFAULT_TASK_PRIORITY,
    status: task.status ?? DEFAULT_TASK_STATUS,
    // datetime-local inputs want "YYYY-MM-DDTHH:mm", ISO strings carry more.
    reminder_date: task.reminder_at ? task.reminder_at.slice(0, 10) : "",
    reminder_time: task.reminder_at ? task.reminder_at.slice(11, 16) : "",
    description: task.description ?? "",
    related,
  };
}

export default function TaskForm({ mode, initialTask, onSubmit, onCancel, initialRelated }: TaskFormProps) {
  const [form, setForm] = useState<FormState>(() =>
    initialTask ? formFromTask(initialTask) : { ...emptyForm(), related: initialRelated ?? emptyRelatedTo() }
  );
  const [owners, setOwners] = useState<LeadOwnerOption[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    userService
      .getLeadOwners()
      .then(setOwners)
      .catch(() => setOwners([]));

    if (mode === "create") {
      const current = authService.getSessionUser();
      if (current) {
        update("owner_id", current.id);
        update("ownerLabel", current.name);
      }
    }
  }, [mode]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!form.subject.trim()) {
      setError("Subject is required.");
      return;
    }
    if (!form.owner_id) {
      setError("An owner is required.");
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      await onSubmit({
        subject: form.subject.trim(),
        owner_id: form.owner_id,
        due_date: form.due_date || null,
        priority: form.priority,
        status: form.status,
        reminder_at: form.reminder_date && form.reminder_time
          ? new Date(`${form.reminder_date}T${form.reminder_time}`).toISOString()
          : null,
        description: form.description.trim() || null,
        lead_id: form.related.personType === "lead" ? form.related.personId || null : null,
        contact_id: form.related.personType === "contact" ? form.related.personId || null : null,
        account_id: null,
      });
    } catch {
      setError("Couldn't save this task. Check the fields and try again.");
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="flex items-center justify-between border-b border-line px-6 py-4">
        <h2 className="font-serif text-xl text-fg">{mode === "create" ? "Create Task" : "Edit Task"}</h2>
      </div>

      <div className="max-h-[70vh] overflow-y-auto px-6 py-5">
        {error && (
          <p className="mb-4 animate-shake rounded-md border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger">
            {error}
          </p>
        )}

        <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
          <Field label="Subject" required fullWidth>
            <input
              autoFocus
              value={form.subject}
              onChange={(e) => update("subject", e.target.value)}
              className={inputClass}
              placeholder="Call to discuss proposal"
            />
          </Field>

          <Field label="Owner" required>
            <OwnerPicker
              owners={owners}
              value={form.owner_id}
              label={form.ownerLabel}
              onChange={(id, label) => {
                update("owner_id", id);
                update("ownerLabel", label);
              }}
            />
          </Field>

          <Field label="Due Date">
            <DateInput value={form.due_date} onChange={(value) => update("due_date", value)} ariaLabel="Task due date" />
          </Field>

          <Field label="Priority">
            <select
              value={form.priority}
              onChange={(e) => update("priority", e.target.value as TaskPriority)}
              className={inputClass}
            >
              {TASK_PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Status">
            <ModernStatusSelect
              value={form.status}
              onChange={(value) => update("status", value as TaskStatus)}
              fullWidth
              options={TASK_STATUSES.map((status) => ({
                value: status,
                label: status,
                tone: status === "Completed" ? "success" : status === "In Progress" ? "info" : status === "Deferred" ? "warning" : status === "Waiting for Input" ? "danger" : "neutral",
                description: status === "Completed" ? "Task finished" : status === "In Progress" ? "Currently being worked on" : status === "Waiting for Input" ? "Blocked by a response" : status === "Deferred" ? "Moved to a later time" : "Not started yet",
              }))}
            />
          </Field>

          <Field label="Reminder At">
            <div className="flex min-w-0 flex-wrap items-center gap-3">
              <DateInput
                value={form.reminder_date}
                onChange={(value) => update("reminder_date", value)}
                ariaLabel="Reminder date"
              />
              {form.reminder_date ? (
                <Time12hPicker
                  value={form.reminder_time}
                  onChange={(value) => update("reminder_time", value)}
                />
              ) : (
                <span className="text-xs text-ink-soft">Select a reminder date first</span>
              )}
            </div>
          </Field>

          <div className="sm:col-span-2">
            <ActivityRelatedPicker
              value={form.related}
              includeAccount={false}
              pickerMenuClassName="w-[440px] max-w-[calc(100vw-2rem)]"
              onChange={(related) => update("related", { ...related, accountId: "", accountLabel: "" })}
            />
          </div>

          <Field label="Description" fullWidth>
            <textarea
              value={form.description}
              onChange={(e) => update("description", e.target.value)}
              className={`${inputClass} min-h-[88px] resize-y`}
            />
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
          {isSubmitting ? "Saving…" : "Save"}
        </button>
      </div>
    </form>
  );
}
