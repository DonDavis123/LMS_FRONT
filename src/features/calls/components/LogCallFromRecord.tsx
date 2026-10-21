"use client";

import { useEffect, useState } from "react";
import { PhoneCall } from "lucide-react";
import Modal from "@/shared/components/Modal";
import type { RelatedToValue } from "@/shared/components/RelatedToPicker";
import CallForm from "@/features/calls/components/CallForm";
import { CallService } from "@/features/calls/services/CallService";
import type { CreateCallPayload } from "@/features/calls/types/call.types";

interface LogCallFromRecordProps {
  /** The lead / contact (and account) the call is logged for. */
  related: RelatedToValue;
  buttonLabel?: string;
  /** Called after the call is saved, so the host page can refresh its call list. */
  onLogged?: () => void;
  /** `primary` is the filled call-to-action; `default` matches the other record-header buttons. */
  variant?: "default" | "primary";
}

/** "Log Call" button + modal form, pre-filled for one record (the Calls counterpart of CreateTaskFromRecord). */
export default function LogCallFromRecord({
  related,
  buttonLabel = "Log Call",
  onLogged,
  variant = "default",
}: LogCallFromRecordProps) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(() => setMessage(null), 3000);
    return () => window.clearTimeout(timer);
  }, [message]);

  async function submit(payload: CreateCallPayload) {
    await CallService.createCall(payload);
    setOpen(false);
    setMessage("Call logged successfully");
    onLogged?.();
  }

  const buttonClass =
    variant === "primary"
      ? "inline-flex items-center gap-1.5 rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white transition hover:bg-ink-2 active:scale-[0.98]"
      : "inline-flex items-center gap-1.5 rounded-md border border-line px-4 py-2 text-sm font-medium text-fg hover:bg-paper";

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={buttonClass}>
        <PhoneCall size={15} /> {buttonLabel}
      </button>
      <Modal isOpen={open} onClose={() => setOpen(false)}>
        <CallForm mode="create" initialRelated={related} onSubmit={submit} onCancel={() => setOpen(false)} />
      </Modal>
      {message && (
        <div className="fixed bottom-6 right-6 z-[70] rounded-md border border-success/30 bg-success-soft px-4 py-3 text-sm font-medium text-success shadow-lg">
          {message}
        </div>
      )}
    </>
  );
}
