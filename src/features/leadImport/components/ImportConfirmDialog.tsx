"use client";

import { useId } from "react";
import Modal from "@/shared/components/Modal";

interface ImportConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Small yes/no dialog built on the shared Modal. Esc and the backdrop cancel. */
export default function ImportConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel,
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
}: ImportConfirmDialogProps) {
  const titleId = useId();
  return (
    <Modal isOpen={isOpen} onClose={onCancel} maxWidthClass="max-w-sm" ariaLabelledBy={titleId}>
      <div className="p-5">
        <h2 id={titleId} className="pr-8 text-base font-semibold text-fg">
          {title}
        </h2>
        <p className="mt-2 text-sm text-ink-soft">{message}</p>
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-line bg-surface px-3 py-1.5 text-sm font-medium text-fg transition hover:bg-paper active:scale-[0.98]"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            autoFocus
            onClick={onConfirm}
            className="rounded-md bg-amber px-3 py-1.5 text-sm font-semibold text-fg transition hover:bg-amber-dark active:scale-[0.98]"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
}
