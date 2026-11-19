"use client";

import { useState, type FormEvent } from "react";
import Modal from "@/shared/components/Modal";
import Spinner from "@/shared/components/Spinner";
import { inputClass } from "@/shared/components/FormLayout";
import { extractApiError } from "@/shared/utils/apiError";

interface LostReasonModalProps {
  isOpen: boolean;
  dealName: string;
  /** May be async; a rejection is shown inside the modal and keeps it open. */
  onConfirm: (reason: string) => Promise<void> | void;
  onCancel: () => void;
}

const TITLE_ID = "deal-lost-reason-title";

function LostReasonForm({ dealName, onConfirm, onCancel }: Omit<LostReasonModalProps, "isOpen">) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = reason.trim();
    if (!trimmed) {
      setError("Enter the reason this deal was lost.");
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      await onConfirm(trimmed);
    } catch (err) {
      setError(extractApiError(err, "Couldn't mark this deal as lost. Try again."));
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
      <div className="shrink-0 border-b border-line px-5 py-3 pr-12">
        <h2 id={TITLE_ID} className="font-serif text-xl text-fg">Mark deal as lost</h2>
      </div>
      <div className="px-5 py-4">
        <p className="mb-3 text-sm text-ink-soft">
          Why was <span className="font-medium text-fg">{dealName}</span> lost? This is kept on the deal and its timeline.
        </p>
        {error && (
          <p role="alert" className="mb-3 animate-shake rounded-lg border border-danger/30 bg-danger-soft px-3.5 py-3 text-sm text-danger">
            {error}
          </p>
        )}
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-fg">
            Lost reason<span className="text-danger"> *</span>
          </span>
          <textarea
            autoFocus
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            aria-invalid={error ? true : undefined}
            className={`${inputClass} min-h-[96px] resize-y`}
            placeholder="e.g. Went with a competitor on price"
          />
        </label>
      </div>
      <div className="flex shrink-0 justify-end gap-3 border-t border-line px-5 py-3">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-line shadow-sm px-4 py-2 text-sm font-medium text-fg hover:bg-paper"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex items-center gap-2 rounded-md bg-danger px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 active:scale-[0.98] disabled:opacity-60"
        >
          {isSubmitting && <Spinner size="sm" className="border-white/30 border-t-white" />}
          {isSubmitting ? "Saving…" : "Mark as lost"}
        </button>
      </div>
    </form>
  );
}

/** Asks for the required lost reason before a deal is moved to the Lost stage. */
export default function LostReasonModal({ isOpen, dealName, onConfirm, onCancel }: LostReasonModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onCancel} maxWidthClass="max-w-md" ariaLabelledBy={TITLE_ID}>
      <LostReasonForm dealName={dealName} onConfirm={onConfirm} onCancel={onCancel} />
    </Modal>
  );
}
