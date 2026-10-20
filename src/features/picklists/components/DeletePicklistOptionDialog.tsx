"use client";

import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import Modal from "@/shared/components/Modal";
import Select from "@/shared/components/Select";
import Spinner from "@/shared/components/Spinner";
import type { PicklistOption } from "@/features/picklists/types/picklist.types";

interface DeletePicklistOptionDialogProps {
  option: PicklistOption | null;
  fieldLabel: string;
  /** How many leads use the option right now (the server's latest answer wins). */
  usageCount: number;
  /** Active options of the same field the leads can be moved to. */
  replacements: PicklistOption[];
  isBusy: boolean;
  error: string | null;
  onConfirm: (replaceWith?: string) => void;
  onCancel: () => void;
}

const TITLE_ID = "delete-picklist-option-title";

/**
 * Confirm step for deleting a dropdown option. An option that leads still use
 * is never dropped silently: the admin picks the option those leads move to
 * (or cancels and hides the option instead).
 */
export default function DeletePicklistOptionDialog({
  option,
  fieldLabel,
  usageCount,
  replacements,
  isBusy,
  error,
  onConfirm,
  onCancel,
}: DeletePicklistOptionDialogProps) {
  const [replacementId, setReplacementId] = useState("");

  useEffect(() => {
    setReplacementId("");
  }, [option?.id]);

  if (!option) return null;

  const inUse = usageCount > 0;
  const replacement = replacements.find((item) => item.id === replacementId);
  const canConfirm = !isBusy && (!inUse || Boolean(replacement));

  return (
    <Modal
      isOpen
      onClose={() => {
        if (!isBusy) onCancel();
      }}
      maxWidthClass="max-w-md"
      ariaLabelledBy={TITLE_ID}
    >
      <div className="p-5">
        <div className="flex items-start gap-3 pr-6">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-danger-soft text-danger">
            <AlertTriangle size={18} />
          </span>
          <div className="min-w-0">
            <h2 id={TITLE_ID} className="text-base font-semibold text-fg">
              Delete “{option.value}”?
            </h2>
            <p className="mt-1 text-sm text-ink-soft">
              {inUse ? (
                <>
                  <span className="font-semibold text-fg">
                    {usageCount} {usageCount === 1 ? "lead uses" : "leads use"}
                  </span>{" "}
                  this {fieldLabel} option. Choose what they should change to — or cancel and hide the option
                  instead, which leaves those leads as they are.
                </>
              ) : (
                <>No lead uses this {fieldLabel} option. It will be removed permanently.</>
              )}
            </p>
          </div>
        </div>

        {inUse && (
          <div className="mt-4">
            <span className="mb-1.5 block text-sm font-medium text-fg">Move those leads to</span>
            <Select
              value={replacementId}
              onChange={setReplacementId}
              placeholder="Choose a replacement…"
              ariaLabel="Replacement option"
              disabled={isBusy}
              options={replacements.map((item) => ({ value: item.id, label: item.value }))}
            />
          </div>
        )}

        {error && (
          <p role="alert" className="mt-4 rounded-md border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger">
            {error}
          </p>
        )}

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
            onClick={() => onConfirm(inUse ? replacementId : undefined)}
            disabled={!canConfirm}
            className="flex items-center gap-2 rounded-md bg-danger px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 active:scale-[0.98] disabled:opacity-60"
          >
            {isBusy && <Spinner size="sm" className="border-white/30 border-t-white" />}
            {inUse ? "Move leads & delete" : "Delete"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
