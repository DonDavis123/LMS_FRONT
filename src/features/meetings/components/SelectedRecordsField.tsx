"use client";

import Link from "next/link";
import { Plus, X } from "lucide-react";
import type { MeetingParticipant, MeetingParticipantType } from "@/features/meetings/types/meeting.types";

/**
 * A user, lead or contact picked for a meeting — used for both the
 * Participants and the Related To fields.
 */
export type SelectedRecord = MeetingParticipant;

export const RECORD_TYPE_LABEL: Record<MeetingParticipantType, string> = {
  user: "User",
  lead: "Lead",
  contact: "Contact",
};

const AVATAR_TONE: Record<MeetingParticipantType, string> = {
  lead: "bg-amber/20 text-amber-dark",
  contact: "bg-slate-light text-slate",
  user: "bg-ink/10 text-fg",
};

export function recordKey(record: Pick<SelectedRecord, "id" | "type">): string {
  return `${record.type ?? "user"}:${record.id}`;
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "?") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

export function RecordAvatar({ type, name, size = "sm" }: { type: MeetingParticipantType; name: string; size?: "sm" | "md" }) {
  return (
    <span
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center rounded-full font-bold ${
        size === "md" ? "h-8 w-8 text-[11px]" : "h-5 w-5 text-[9px]"
      } ${AVATAR_TONE[type]}`}
    >
      {initials(name)}
    </span>
  );
}

const CHIP_CLASS =
  "inline-flex max-w-full items-center gap-1.5 rounded-full border border-line bg-paper py-0.5 pl-1 text-xs text-fg";

interface RecordChipProps {
  record: SelectedRecord;
  /** Prefix the name with its type, e.g. "Lead". */
  showType?: boolean;
  onRemove?: (record: SelectedRecord) => void;
  /** Makes the chip a link to the lead / contact page (users are never linked). */
  linked?: boolean;
}

export function RecordChip({ record, showType = false, onRemove, linked = false }: RecordChipProps) {
  const type = record.type ?? "user";
  const href =
    linked && type === "lead"
      ? `/dashboard/leads/${record.id}`
      : linked && type === "contact"
        ? `/dashboard/contacts/${record.id}`
        : null;

  const body = (
    <>
      <RecordAvatar type={type} name={record.name} />
      <span className="min-w-0 truncate">{record.name}</span>
      {showType && (
        <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-ink-soft">
          {RECORD_TYPE_LABEL[type]}
        </span>
      )}
    </>
  );

  return (
    <span className={`${CHIP_CLASS} ${onRemove ? "pr-1" : "pr-2.5"}`}>
      {href ? (
        <Link href={href} className="inline-flex min-w-0 items-center gap-1.5 hover:underline">
          {body}
        </Link>
      ) : (
        <span className="inline-flex min-w-0 items-center gap-1.5">{body}</span>
      )}
      {onRemove && (
        <button
          type="button"
          onClick={() => onRemove(record)}
          aria-label={`Remove ${record.name}`}
          className="shrink-0 rounded-full p-0.5 text-ink-soft transition hover:bg-line hover:text-fg"
        >
          <X size={12} />
        </button>
      )}
    </span>
  );
}

interface SelectedRecordsFieldProps {
  records: SelectedRecord[];
  onRemove: (record: SelectedRecord) => void;
  onAdd: () => void;
  /** Show each chip's type (useful when leads and contacts are mixed). */
  showType?: boolean;
  emptyLabel?: string;
  addLabel?: string;
  ariaLabel: string;
}

/** Chips for everything picked so far, plus an "Add" button that opens the picker. */
export default function SelectedRecordsField({
  records,
  onRemove,
  onAdd,
  showType = false,
  emptyLabel = "None",
  addLabel = "Add",
  ariaLabel,
}: SelectedRecordsFieldProps) {
  return (
    <div className="flex min-h-9 items-start gap-3 py-1">
      <div className="min-w-0 flex-1">
        {records.length > 0 ? (
          <ul
            aria-label={ariaLabel}
            className="flex max-h-28 flex-wrap gap-1.5 overflow-y-auto py-0.5 pr-1"
          >
            {records.map((record) => (
              <li key={recordKey(record)} className="max-w-full">
                <RecordChip record={record} showType={showType} onRemove={onRemove} />
              </li>
            ))}
          </ul>
        ) : (
          <span className="inline-block py-1 text-sm text-ink-soft">{emptyLabel}</span>
        )}
      </div>
      <button
        type="button"
        onClick={onAdd}
        className="inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-sm font-medium text-indigo-500 transition hover:bg-indigo-500/10 dark:text-indigo-400"
      >
        <Plus size={14} />
        {records.length > 0 ? `${addLabel} more` : addLabel}
      </button>
    </div>
  );
}
