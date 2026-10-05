"use client";

import { useEffect, useState } from "react";
import { userService } from "@/features/users/services/userService";
import type {
  ManagedUserDetail,
  ReplacementCandidate,
  UserDeletionPreview,
} from "@/features/users/types/user.types";
import { roleLabel } from "@/features/users/utils/userLabels";
import Modal from "@/shared/components/Modal";
import Spinner from "@/shared/components/Spinner";
import { extractApiError } from "@/shared/utils/apiError";
import Select from "@/shared/components/Select";

interface UserDeleteDialogProps {
  isOpen: boolean;
  userId: string;
  userLabel: string;
  onClose: () => void;
  /** Called with the blocked user when "Block instead" succeeds. */
  onUserChange: (user: ManagedUserDetail) => void;
  /** Called once the user is gone (deleted now, or found to be deleted already). */
  onDeleted: (message: string) => void;
  onNotify: (message: string) => void;
}

type PreviewState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; preview: UserDeletionPreview };

type CandidatesState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; items: ReplacementCandidate[] };

type PendingAction = "block" | "delete" | null;

const ALREADY_DELETED = /already been deleted/i;
const REPLACEMENT_REQUIRED = /replacement user is required/i;
const REPLACEMENT_REJECTED = /^replacement user/i;

function readStatus(error: unknown): number | null {
  const status = (error as { response?: { status?: number } } | null)?.response?.status;
  return typeof status === "number" ? status : null;
}

function plural(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? "" : "s"}`;
}

/**
 * Delete (retire) flow from the backend contract:
 *
 *   GET deletion-preview
 *     ├─ 400 "already been deleted" → close, treat as deleted
 *     ├─ can_retire === false       → show blockers[0], no actions
 *     └─ offer what `available_actions` lists:
 *          BLOCK               → POST block
 *          TRANSFER_AND_DELETE → (GET replacement-candidates when any
 *                                 transfer_required flag is set) → DELETE
 *
 * The backend decides what is allowed; this dialog only renders its answer.
 */
export default function UserDeleteDialog(props: UserDeleteDialogProps) {
  const { isOpen, onClose } = props;
  const [isBusy, setIsBusy] = useState(false);

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        if (!isBusy) onClose();
      }}
      maxWidthClass="max-w-lg"
      ariaLabelledBy="delete-user-title"
    >
      <DeleteUserFlow {...props} onBusyChange={setIsBusy} />
    </Modal>
  );
}

function DeleteUserFlow({
  userId,
  userLabel,
  onClose,
  onUserChange,
  onDeleted,
  onNotify,
  onBusyChange,
}: UserDeleteDialogProps & { onBusyChange: (busy: boolean) => void }) {
  const [previewState, setPreviewState] = useState<PreviewState>({ status: "loading" });
  const [candidates, setCandidates] = useState<CandidatesState>({ status: "idle" });
  const [replacementId, setReplacementId] = useState("");
  const [pending, setPending] = useState<PendingAction>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [previewKey, setPreviewKey] = useState(0);
  const [candidatesKey, setCandidatesKey] = useState(0);

  const preview = previewState.status === "ready" ? previewState.preview : null;
  const needsTransfer = preview ? Object.values(preview.transfer_required).some(Boolean) : false;
  const canBlock = preview?.available_actions.includes("BLOCK") ?? false;
  const canDelete = preview?.available_actions.includes("TRANSFER_AND_DELETE") ?? false;
  const isBusy = pending !== null;

  useEffect(() => {
    let cancelled = false;
    setPreviewState({ status: "loading" });

    userService
      .getDeletionPreview(userId)
      .then((data) => {
        if (!cancelled) setPreviewState({ status: "ready", preview: data });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const message = extractApiError(err, "Couldn't load what deleting this user would affect.");
        if (readStatus(err) === 400 && ALREADY_DELETED.test(message)) {
          onDeleted(message);
          return;
        }
        setPreviewState({ status: "error", message });
      });

    return () => {
      cancelled = true;
    };
    // `onDeleted` is intentionally omitted: it is a fresh closure each render
    // and must not re-trigger the preview request.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, previewKey]);

  // Candidates are only needed when records must move to someone else.
  const shouldLoadCandidates = canDelete && needsTransfer;
  useEffect(() => {
    if (!shouldLoadCandidates) return;
    let cancelled = false;
    setCandidates({ status: "loading" });

    userService
      .getReplacementCandidates(userId)
      .then((items) => {
        if (!cancelled) setCandidates({ status: "ready", items });
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setCandidates({
            status: "error",
            message: extractApiError(err, "Couldn't load the users who can take over these records."),
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [userId, shouldLoadCandidates, candidatesKey]);

  function startAction(action: Exclude<PendingAction, null>) {
    setPending(action);
    onBusyChange(true);
    setActionError(null);
  }

  function endAction() {
    setPending(null);
    onBusyChange(false);
  }

  async function handleBlock() {
    startAction("block");
    try {
      const updated = await userService.blockUser(userId);
      onUserChange(updated);
      onNotify("User blocked successfully");
      onClose();
    } catch (err) {
      setActionError(extractApiError(err, "Couldn't block this user. Try again."));
    } finally {
      endAction();
    }
  }

  async function handleDelete() {
    startAction("delete");
    try {
      await userService.deleteUser(userId, needsTransfer ? { replacement_user_id: replacementId } : undefined);
      onDeleted(`${userLabel} was deleted`);
    } catch (err) {
      const message = extractApiError(err, "Couldn't delete this user. Try again.");
      if (readStatus(err) === 400 && ALREADY_DELETED.test(message)) {
        onDeleted(message);
        return;
      }
      if (readStatus(err) === 400 && REPLACEMENT_REQUIRED.test(message)) {
        // Records were added after the preview loaded, so a replacement is
        // now needed. Reload the preview to reveal the picker.
        setActionError("This user's records changed since you opened this dialog. Review the update and try again.");
        setPreviewKey((value) => value + 1);
        return;
      }
      if (readStatus(err) !== null && REPLACEMENT_REJECTED.test(message)) {
        // The chosen replacement is no longer valid (e.g. it was blocked).
        setReplacementId("");
        setCandidatesKey((value) => value + 1);
      }
      // A 500 is a rolled-back transaction: nothing changed, so retrying is safe.
      setActionError(readStatus(err) === 500 ? `${message} Nothing was changed — you can try again.` : message);
    } finally {
      endAction();
    }
  }

  const candidateItems = candidates.status === "ready" ? candidates.items : [];
  const hasNoCandidates = candidates.status === "ready" && candidateItems.length === 0;
  const deleteBlocked = needsTransfer && (!replacementId || candidates.status !== "ready");

  return (
    <div className="flex min-h-0 flex-col">
      <div className="min-h-0 space-y-4 overflow-y-auto p-5">
        <div>
          <h2 id="delete-user-title" className="pr-6 text-base font-semibold text-fg">
            Delete {userLabel}?
          </h2>
          <p className="mt-1 text-sm text-ink-soft">Review what happens to this user&apos;s data before continuing.</p>
        </div>

        {previewState.status === "loading" && (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-8 animate-shimmer rounded-md" />
            ))}
          </div>
        )}

        {previewState.status === "error" && (
          <div className="flex items-center justify-between gap-3 rounded-md border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger">
            <p>{previewState.message}</p>
            <button
              type="button"
              onClick={() => setPreviewKey((value) => value + 1)}
              className="shrink-0 rounded-md border border-danger/30 px-2.5 py-1 text-xs font-semibold transition hover:bg-surface"
            >
              Retry
            </button>
          </div>
        )}

        {preview && !preview.can_retire && (
          <p role="alert" className="rounded-md border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger">
            {preview.blockers[0] ?? "This user can't be deleted."}
          </p>
        )}

        {preview && preview.can_retire && (
          <>
            <ImpactSummary preview={preview} />

            {needsTransfer && canDelete && (
              <ReplacementPicker
                state={candidates}
                value={replacementId}
                disabled={isBusy}
                hasNoCandidates={hasNoCandidates}
                onChange={setReplacementId}
                onRetry={() => setCandidatesKey((value) => value + 1)}
              />
            )}

            {preview.user_is_blocked && (
              <p className="text-xs text-ink-soft">This account is already blocked.</p>
            )}
          </>
        )}

        {actionError && (
          <p
            role="alert"
            className="animate-shake rounded-md border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger"
          >
            {actionError}
          </p>
        )}
      </div>

      <div className="flex flex-wrap justify-end gap-2 border-t border-line p-4">
        <button
          type="button"
          onClick={onClose}
          disabled={isBusy}
          className="rounded-md border border-line px-4 py-2 text-sm font-medium text-fg hover:bg-paper disabled:opacity-60"
        >
          Cancel
        </button>

        {preview?.can_retire && canBlock && (
          <button
            type="button"
            onClick={handleBlock}
            disabled={isBusy}
            title="Keeps all data and can be undone by unblocking."
            className="flex items-center gap-2 rounded-md border border-danger/40 bg-danger-soft px-4 py-2 text-sm font-semibold text-danger transition hover:opacity-90 active:scale-[0.98] disabled:opacity-60"
          >
            {pending === "block" && <Spinner size="sm" />}
            Block instead
          </button>
        )}

        {preview?.can_retire && canDelete && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={isBusy || deleteBlocked}
            className="flex items-center gap-2 rounded-md bg-danger px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pending === "delete" && <Spinner size="sm" className="border-white/30 border-t-white" />}
            {needsTransfer ? "Transfer and delete" : "Delete user"}
          </button>
        )}
      </div>
    </div>
  );
}

function ImpactSummary({ preview }: { preview: UserDeletionPreview }) {
  const { impact, transfer_required: transfer, permanent_deletions: permanent } = preview;

  const transferRows = [
    transfer.leads && plural(impact.leads, "lead"),
    transfer.contacts && plural(impact.contacts, "contact"),
    transfer.accounts && plural(impact.accounts, "account"),
    transfer.meetings && plural(impact.meetings, "hosted meeting"),
  ].filter((row): row is string => Boolean(row));

  const permanentRows = [
    permanent.tasks > 0 && plural(permanent.tasks, "task"),
    permanent.reminders > 0 && plural(permanent.reminders, "reminder"),
    permanent.notifications > 0 && plural(permanent.notifications, "notification"),
  ].filter((row): row is string => Boolean(row));

  if (transferRows.length === 0 && permanentRows.length === 0) {
    return (
      <p className="rounded-md border border-line bg-paper px-3 py-2 text-sm text-ink-soft">
        This user has no related records, so nothing needs to be transferred or removed.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {transferRows.length > 0 && (
        <div className="rounded-md border border-line bg-paper px-3 py-2.5">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">Transferred to a replacement</p>
          <ul className="mt-1.5 list-inside list-disc text-sm text-fg">
            {transferRows.map((row) => (
              <li key={row}>{row}</li>
            ))}
          </ul>
        </div>
      )}

      {permanentRows.length > 0 && (
        <div className="rounded-md border border-danger/30 bg-danger-soft px-3 py-2.5">
          <p className="text-xs font-semibold uppercase tracking-wide text-danger">Permanently deleted</p>
          <ul className="mt-1.5 list-inside list-disc text-sm text-danger">
            {permanentRows.map((row) => (
              <li key={row}>{row}</li>
            ))}
          </ul>
          <p className="mt-1.5 text-xs text-danger">This can&apos;t be undone.</p>
        </div>
      )}

      <p className="text-xs text-ink-soft">Timeline history is always kept.</p>
    </div>
  );
}

interface ReplacementPickerProps {
  state: CandidatesState;
  value: string;
  disabled: boolean;
  hasNoCandidates: boolean;
  onChange: (id: string) => void;
  onRetry: () => void;
}

function ReplacementPicker({ state, value, disabled, hasNoCandidates, onChange, onRetry }: ReplacementPickerProps) {
  if (state.status === "error") {
    return (
      <div className="flex items-center justify-between gap-3 rounded-md border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger">
        <p>{state.message}</p>
        <button
          type="button"
          onClick={onRetry}
          className="shrink-0 rounded-md border border-danger/30 px-2.5 py-1 text-xs font-semibold transition hover:bg-surface"
        >
          Retry
        </button>
      </div>
    );
  }

  if (state.status !== "ready") {
    return <div className="h-10 animate-shimmer rounded-md" />;
  }

  if (hasNoCandidates) {
    return (
      <p role="alert" className="rounded-md border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger">
        No other active Admin or Superadmin is available to take over these records. Create or unblock one first.
      </p>
    );
  }

  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-fg">
        Replacement user<span className="text-danger"> *</span>
      </span>
      <Select
        value={value}
        onChange={onChange}
        disabled={disabled}
        placeholder="Select a user…"
        ariaLabel="Replacement user"
        options={state.items.map((candidate) => ({
          value: candidate.id,
          label: `${candidate.name || candidate.email} — ${roleLabel(candidate.role)}`,
          description: candidate.email,
        }))}
      />
    </label>
  );
}
