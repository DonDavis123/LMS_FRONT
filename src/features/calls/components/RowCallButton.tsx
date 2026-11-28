"use client";

import { useState } from "react";
import { PhoneCall } from "lucide-react";
import type { RelatedToValue } from "@/shared/components/RelatedToPicker";
import RecordCallsDrawer from "@/features/calls/components/RecordCallsDrawer";
import type { CallRecordKind } from "@/features/calls/services/CallService";
import { CALLS_ENABLED } from "@/features/calls/config";

interface RowCallButtonProps {
  kind: CallRecordKind;
  recordId: string;
  recordName: string;
  related: RelatedToValue;
}

/** "Call log" button for a Leads / Contacts / Accounts table row; opens the record's call drawer. */
export default function RowCallButton({ kind, recordId, recordName, related }: RowCallButtonProps) {
  const [open, setOpen] = useState(false);
  if (!CALLS_ENABLED) return null;

  return (
    <>
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          setOpen(true);
        }}
        onDoubleClick={(event) => event.stopPropagation()}
        title="Log a call and view call history"
        aria-label={`Call log for ${recordName}`}
        className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-md border border-line px-2.5 py-1.5 text-xs font-medium text-fg transition hover:bg-paper"
      >
        <PhoneCall size={13} />
        Call Log
      </button>
      <RecordCallsDrawer
        isOpen={open}
        onClose={() => setOpen(false)}
        kind={kind}
        recordId={recordId}
        recordName={recordName}
        related={related}
      />
    </>
  );
}
