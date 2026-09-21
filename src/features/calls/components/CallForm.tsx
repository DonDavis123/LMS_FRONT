"use client";

import { useEffect, useState, type FormEvent } from "react";
import { userService } from "@/features/users/services/userService";
import type { LeadOwnerOption } from "@/features/auth/types/auth.types";
import { authService } from "@/features/auth/services/authService";
import OwnerPicker from "@/shared/components/OwnerPicker";
import RelatedToPicker, { emptyRelatedTo, type RelatedToValue } from "@/shared/components/RelatedToPicker";
import Spinner from "@/shared/components/Spinner";
import { inputClass, Field } from "@/shared/components/FormLayout";
import {
  CALL_TYPES,
  CALL_STATUSES,
  DEFAULT_CALL_TYPE,
  DEFAULT_CALL_STATUS,
  type Call,
  type CallType,
  type CallStatus,
  type CreateCallPayload,
} from "@/features/calls/types/call.types";

interface CallFormProps {
  mode: "create" | "edit";
  initialCall?: Call;
  onSubmit: (payload: CreateCallPayload) => Promise<void>;
  onCancel: () => void;
}

interface FormState {
  subject: string;
  owner_id: string;
  ownerLabel: string;
  call_type: CallType;
  call_status: CallStatus;
  call_start_time: string;
  call_duration_minutes: string;
  description: string;
  related: RelatedToValue;
}

function emptyForm(): FormState {
  return {
    subject: "",
    owner_id: "",
    ownerLabel: "",
    call_type: DEFAULT_CALL_TYPE,
    call_status: DEFAULT_CALL_STATUS,
    call_start_time: "",
    call_duration_minutes: "",
    description: "",
    related: emptyRelatedTo(),
  };
}

function formFromCall(call: Call): FormState {
  const related: RelatedToValue = {
    personType: call.lead_id ? "lead" : call.contact_id ? "contact" : "",
    personId: call.lead_id ?? call.contact_id ?? "",
    personLabel: call.lead_name ?? call.contact_name ?? "",
    accountId: call.account_id ?? "",
    accountLabel: call.account_name ?? "",
  };

  return {
    subject: call.subject ?? "",
    owner_id: call.owner_id ?? "",
    ownerLabel: call.owner_name ?? "",
    call_type: call.call_type ?? DEFAULT_CALL_TYPE,
    call_status: call.call_status ?? DEFAULT_CALL_STATUS,
    call_start_time: call.call_start_time ? call.call_start_time.slice(0, 16) : "",
    call_duration_minutes:
      call.call_duration_minutes !== null && call.call_duration_minutes !== undefined
        ? String(call.call_duration_minutes)
        : "",
    description: call.description ?? "",
    related,
  };
}

export default function CallForm({ mode, initialCall, onSubmit, onCancel }: CallFormProps) {
  const [form, setForm] = useState<FormState>(() =>
    initialCall ? formFromCall(initialCall) : emptyForm()
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
        owner_name: form.ownerLabel || null,
        call_type: form.call_type,
        call_status: form.call_status,
        call_start_time: form.call_start_time
          ? new Date(form.call_start_time).toISOString()
          : null,
        call_duration_minutes: form.call_duration_minutes
          ? Number(form.call_duration_minutes)
          : null,
        description: form.description.trim() || null,
        lead_id: form.related.personType === "lead" ? form.related.personId || null : null,
        lead_name: form.related.personType === "lead" ? form.related.personLabel || null : null,
        contact_id: form.related.personType === "contact" ? form.related.personId || null : null,
        contact_name: form.related.personType === "contact" ? form.related.personLabel || null : null,
        account_id: form.related.accountId || null,
        account_name: form.related.accountLabel || null,
      });
    } catch {
      setError("Couldn't save this call. Check the fields and try again.");
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="flex items-center justify-between border-b border-line px-6 py-4">
        <h2 className="font-serif text-xl text-fg">{mode === "create" ? "Log a Call" : "Edit Call"}</h2>
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
              placeholder="Follow-up call about pricing"
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

          <Field label="Call Type">
            <select
              value={form.call_type}
              onChange={(e) => update("call_type", e.target.value as CallType)}
              className={inputClass}
            >
              {CALL_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Call Status">
            <select
              value={form.call_status}
              onChange={(e) => update("call_status", e.target.value as CallStatus)}
              className={inputClass}
            >
              {CALL_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Call Start Time">
            <input
              type="datetime-local"
              value={form.call_start_time}
              onChange={(e) => update("call_start_time", e.target.value)}
              className={inputClass}
            />
          </Field>

          <Field label="Duration (minutes)">
            <input
              type="number"
              min={0}
              value={form.call_duration_minutes}
              onChange={(e) => update("call_duration_minutes", e.target.value)}
              className={inputClass}
              placeholder="15"
            />
          </Field>

          <Field label="Related To" fullWidth>
            <RelatedToPicker value={form.related} onChange={(related) => update("related", related)} />
          </Field>

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
