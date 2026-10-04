"use client";

import Modal from "@/shared/components/Modal";
import Spinner from "@/shared/components/Spinner";

interface ConfirmActionDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  /** "danger" for destructive actions (red button), "primary" otherwise. */
  tone?: "danger" | "primary";
  /** While true the buttons are disabled and the dialog can't be dismissed. */
  isBusy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Confirm step for non-delete actions (block, unblock, reset password).
 * `confirmDelete()` is delete-specific ("Confirm to delete", Yes/No), so this
 * reuses the shared `Modal` with the same card styling instead.
 */
export default function ConfirmActionDialog({
  isOpen,
  title,
  message,
  confirmLabel,
  tone = "primary",
  isBusy = false,
  onConfirm,
  onCancel,
}: ConfirmActionDialogProps) {
  const titleId = "confirm-action-title";

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        if (!isBusy) onCancel();
      }}
      maxWidthClass="max-w-sm"
      ariaLabelledBy={titleId}
    >
      <div className="p-5">
        <h2 id={titleId} className="pr-6 text-base font-semibold text-fg">
          {title}
        </h2>
        <p className="mt-2 text-sm text-ink-soft">{message}</p>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={isBusy}
            className="rounded-md border border-line px-4 py-2 text-sm font-medium text-fg hover:bg-paper disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isBusy}
            autoFocus
            className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold text-white transition active:scale-[0.98] disabled:opacity-60 ${
              tone === "danger" ? "bg-danger hover:opacity-90" : "bg-ink hover:bg-ink-2"
            }`}
          >
            {isBusy && <Spinner size="sm" className="border-white/30 border-t-white" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
}
