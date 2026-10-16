"use client";

import { useState, type FormEvent } from "react";
import { platformService } from "@/features/platform/services/platformService";
import type { Company } from "@/features/platform/types/platform.types";
import { mapUserFormError } from "@/features/users/utils/userFormErrors";
import { Field, inputClass } from "@/shared/components/FormLayout";
import Modal from "@/shared/components/Modal";
import Spinner from "@/shared/components/Spinner";

interface SuspendCompanyDialogProps {
  isOpen: boolean;
  companyId: string;
  companyName: string;
  onClose: () => void;
  onSuspended: (company: Company) => void;
}

const REASON_MAX_LENGTH = 1000;

/**
 * POST /platform/companies/{id}/suspend/ — a reason is required. The
 * dialog unmounts its form on close so a half-typed reason never lingers.
 */
export default function SuspendCompanyDialog(props: SuspendCompanyDialogProps) {
  const { isOpen, onClose } = props;
  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidthClass="max-w-md" ariaLabelledBy="suspend-company-title">
      <SuspendForm {...props} />
    </Modal>
  );
}

function SuspendForm({ companyId, companyName, onClose, onSuspended }: SuspendCompanyDialogProps) {
  const [reason, setReason] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSaving) return;

    const trimmed = reason.trim();
    setFormError(null);
    if (!trimmed) {
      setFieldError("A reason is required.");
      return;
    }
    setFieldError(null);

    setIsSaving(true);
    try {
      const company = await platformService.suspendCompany(companyId, trimmed);
      onSuspended(company);
    } catch (error) {
      const mapped = mapUserFormError(error, ["reason"] as const, {}, "Couldn't suspend this company. Try again.");
      setFieldError(mapped.fields.reason ?? null);
      setFormError(mapped.form);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex min-h-0 flex-col">
      <div className="min-h-0 space-y-4 overflow-y-auto p-5">
        <div>
          <h2 id="suspend-company-title" className="pr-6 text-base font-semibold text-fg">
            Suspend {companyName}?
          </h2>
          <p className="mt-1 text-sm text-ink-soft">
            Every user of this company is signed out immediately and cannot sign in until you activate the company
            again. Their data is kept.
          </p>
        </div>

        <Field label="Reason" required>
          <textarea
            value={reason}
            onChange={(event) => {
              setReason(event.target.value);
              setFieldError(null);
            }}
            maxLength={REASON_MAX_LENGTH}
            rows={3}
            aria-invalid={Boolean(fieldError)}
            autoFocus
            placeholder="e.g. Unpaid invoice"
            className={`${inputClass} resize-none`}
          />
          {fieldError ? (
            <span className="mt-1 block text-xs text-danger">{fieldError}</span>
          ) : (
            <span className="mt-1 block text-xs text-ink-soft">
              Saved with the company and shown in the audit log. {reason.length}/{REASON_MAX_LENGTH}
            </span>
          )}
        </Field>

        {formError && (
          <p className="animate-shake rounded-md border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger">
            {formError}
          </p>
        )}
      </div>

      <div className="flex justify-end gap-2 border-t border-line p-4">
        <button
          type="button"
          onClick={onClose}
          disabled={isSaving}
          className="rounded-md border border-line px-4 py-2 text-sm font-medium text-fg hover:bg-paper disabled:opacity-60"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSaving}
          className="flex items-center gap-2 rounded-md bg-danger px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 active:scale-[0.98] disabled:opacity-60"
        >
          {isSaving && <Spinner size="sm" className="border-white/30 border-t-white" />}
          {isSaving ? "Suspending…" : "Suspend company"}
        </button>
      </div>
    </form>
  );
}
