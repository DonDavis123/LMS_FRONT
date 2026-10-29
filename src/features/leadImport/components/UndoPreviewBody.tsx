"use client";

import { AlertCircle, ChevronDown, Info } from "lucide-react";
import { useId, useState } from "react";
import type { UndoPreview } from "@/features/leadImport/types/leadImport.types";
import type { ImportErrorInfo } from "@/features/leadImport/utils/importErrors";
import { formatCount } from "@/features/leadImport/utils/format";
import { card } from "@/features/leadImport/utils/reviewStyles";
import { kindLabel, num, plural } from "@/features/leadImport/utils/undoView";

const noteBox = "rounded-md border border-line bg-paper px-3 py-2 text-sm text-fg";
const warnBox = "rounded-md border border-amber/40 bg-paper px-3 py-2 text-sm text-fg";

/** Failure of the preview or of the undo: always the server's detail AND how_to_fix. */
export function UndoErrorAlert({ error }: { error: ImportErrorInfo }) {
  let extra: string | null = null;
  if (error.code === "undo_in_progress") {
    extra = "Another undo of this import is already running. Wait a minute, then check the import history.";
  } else if (error.isNetwork) {
    extra = "If the undo had already started it may still finish. Check the import history before you try again.";
  }
  return (
    <div role="alert" className="flex gap-2 rounded-md border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger">
      <AlertCircle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
      <div className="min-w-0 space-y-1">
        <p className="font-medium">{error.message}</p>
        {error.howToFix && <p>{error.howToFix}</p>}
        {extra && <p>{extra}</p>}
      </div>
    </div>
  );
}

/** The calm card shown when the import cannot be undone. Nothing to confirm. */
export function CannotUndoCard({ preview }: { preview: UndoPreview }) {
  return (
    <div className={`${card} flex gap-2 bg-paper p-3 text-sm text-fg`} role="status">
      <Info size={16} className="mt-0.5 shrink-0 text-slate" aria-hidden="true" />
      <p>{preview.reason_if_not || preview.message || "This import cannot be undone."}</p>
    </div>
  );
}

function Examples({ preview }: { preview: UndoPreview }) {
  const [open, setOpen] = useState(false);
  const listId = useId();
  const shown = preview.will_leave_alone.length;
  const more = Math.max(0, num(preview.will_leave_alone_count) - shown);
  if (shown === 0) return null;
  return (
    <div className="mt-2">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((value) => !value)}
        className="inline-flex items-center gap-1 rounded text-sm font-medium text-slate underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber"
      >
        <ChevronDown size={14} aria-hidden="true" className={`transition ${open ? "rotate-180" : ""}`} />
        {open ? "Hide examples" : `Show examples (${shown})`}
      </button>
      {open && (
        <div id={listId} className="mt-2">
          <ul className="divide-y divide-line rounded-md border border-line bg-surface text-sm">
            {preview.will_leave_alone.map((item, index) => (
              <li key={`${item.kind}-${item.id ?? item.id_or_name}-${index}`} className="px-3 py-2">
                <p className="break-words text-fg">
                  <span className="mr-1.5 rounded-full bg-slate-light px-2 py-0.5 text-xs font-medium text-slate">{kindLabel(item.kind)}</span>
                  {item.id_or_name}
                </p>
                <p className="mt-0.5 text-xs text-ink-soft">{item.reason}</p>
              </li>
            ))}
          </ul>
          {more > 0 && <p className="mt-1.5 text-xs text-ink-soft">and {formatCount(more)} more</p>}
        </div>
      )}
    </div>
  );
}

interface UndoPreviewBodyProps {
  preview: UndoPreview;
  actionError: ImportErrorInfo | null;
  confirmed: boolean;
  onConfirmedChange: (value: boolean) => void;
  /** True while the undo runs: the checkbox is locked. */
  busy: boolean;
}

/** What the undo will do, what it leaves alone, the notes and the confirmation checkbox. */
export default function UndoPreviewBody({ preview, actionError, confirmed, onConfirmedChange, busy }: UndoPreviewBodyProps) {
  const checkId = useId();
  const leaveAloneCount = num(preview.will_leave_alone_count);
  const restore = num(preview.will_restore_updated_leads);
  const alreadyDeleted = num(preview.already_deleted);
  const reusedAccounts = num(preview.reused_accounts_kept);
  const reusedContacts = num(preview.reused_contacts_kept);

  return (
    <div className="space-y-4">
      {actionError && <UndoErrorAlert error={actionError} />}

      {!preview.can_undo ? (
        <CannotUndoCard preview={preview} />
      ) : (
        <>
          {preview.is_retry && (
            <div className={noteBox} role="note">
              An earlier undo left some records alone. They are checked again now.
            </div>
          )}

          <section aria-labelledby={`${checkId}-will`}>
            <h3 id={`${checkId}-will`} className="text-sm font-semibold text-fg">
              What will happen
            </h3>
            <ul className="mt-1.5 list-disc space-y-1 pl-5 text-sm text-fg">
              <li>{plural(num(preview.will_remove_leads), "lead")} will be removed.</li>
              <li>{plural(num(preview.will_remove_accounts), "account")} will be removed.</li>
              <li>{plural(num(preview.will_remove_contacts), "contact")} will be removed.</li>
              {restore > 0 && <li>{plural(restore, "lead")} will be restored to their earlier values.</li>}
            </ul>
            <p className="mt-1.5 text-xs text-ink-soft">
              Removed records are only marked as deleted. Nothing is erased for good.
            </p>
          </section>

          {leaveAloneCount > 0 && (
            <section aria-labelledby={`${checkId}-alone`}>
              <h3 id={`${checkId}-alone`} className="text-sm font-semibold text-fg">
                What will be left alone
              </h3>
              <p className="mt-1 text-xs text-ink-soft">
                {plural(leaveAloneCount, "record")} changed after the import, so they stay as they are.
              </p>
              {preview.will_leave_alone_groups.length > 0 && (
                <ul className="mt-1.5 space-y-1 text-sm text-fg">
                  {preview.will_leave_alone_groups.map((group) => (
                    <li key={`${group.kind}-${group.code}`} className="flex items-start justify-between gap-3">
                      <span className="min-w-0 break-words">
                        <span className="text-ink-soft">{kindLabel(group.kind)}: </span>
                        {group.reason}
                      </span>
                      <span className="shrink-0 font-semibold tabular-nums">{formatCount(group.count)}</span>
                    </li>
                  ))}
                </ul>
              )}
              <Examples preview={preview} />
            </section>
          )}

          {(alreadyDeleted > 0 || reusedAccounts > 0 || reusedContacts > 0) && (
            <ul className="space-y-1 text-xs text-ink-soft">
              {alreadyDeleted > 0 && <li>{plural(alreadyDeleted, "record was", "records were")} already deleted.</li>}
              {reusedAccounts > 0 && (
                <li>
                  {plural(reusedAccounts, "existing account was", "existing accounts were")} reused by the import and will be kept.
                </li>
              )}
              {reusedContacts > 0 && (
                <li>
                  {plural(reusedContacts, "existing contact was", "existing contacts were")} reused by the import and will be kept.
                </li>
              )}
            </ul>
          )}

          {!preview.restore_available && preview.restore_note && (
            <div className={warnBox} role="note">
              <p className="font-medium">Updated leads cannot be restored</p>
              <p className="mt-0.5">{preview.restore_note}</p>
            </div>
          )}

          <div className="flex items-start gap-2 border-t border-line pt-3">
            <input
              id={checkId}
              type="checkbox"
              checked={confirmed}
              disabled={busy}
              onChange={(event) => onConfirmedChange(event.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-line accent-slate"
            />
            <label htmlFor={checkId} className="text-sm text-fg">
              I have checked the list above
            </label>
          </div>
        </>
      )}
    </div>
  );
}
