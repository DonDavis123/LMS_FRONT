"use client";

import { useState, type FormEvent } from "react";
import { Eye, EyeOff } from "lucide-react";
import { platformService } from "@/features/platform/services/platformService";
import { Field, inputClass } from "@/shared/components/FormLayout";
import Modal from "@/shared/components/Modal";
import Spinner from "@/shared/components/Spinner";
import { extractApiError } from "@/shared/utils/apiError";

interface CompanyUserResetPasswordDialogProps {
  isOpen: boolean;
  companyId: string;
  userId: string;
  userLabel: string;
  onClose: () => void;
  onReset: () => void;
}

const MIN_LENGTH = 8;
const MAX_LENGTH = 128;

/**
 * POST /platform/companies/{id}/users/{userId}/reset-password/ — 204, and
 * the user is signed out everywhere. The dialog unmounts its form on close
 * so the password only ever lives in component state: never logged,
 * persisted or put in a URL.
 */
export default function CompanyUserResetPasswordDialog(props: CompanyUserResetPasswordDialogProps) {
  return (
    <Modal
      isOpen={props.isOpen}
      onClose={props.onClose}
      maxWidthClass="max-w-md"
      ariaLabelledBy="reset-company-user-title"
    >
      <ResetPasswordForm {...props} />
    </Modal>
  );
}

function ResetPasswordForm({ companyId, userId, userLabel, onClose, onReset }: CompanyUserResetPasswordDialogProps) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isResetting, setIsResetting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isResetting) return;

    if (password.length < MIN_LENGTH) {
      setError(`Password must be at least ${MIN_LENGTH} characters.`);
      return;
    }
    if (password.length > MAX_LENGTH) {
      setError(`Password must be at most ${MAX_LENGTH} characters.`);
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setError(null);
    setIsResetting(true);
    try {
      await platformService.resetCompanyUserPassword(companyId, userId, password);
      onReset();
    } catch (err) {
      setError(extractApiError(err, "Couldn't reset the password. Try again."));
    } finally {
      setIsResetting(false);
    }
  }

  const inputType = showPasswords ? "text" : "password";

  return (
    <form onSubmit={handleSubmit} noValidate className="flex min-h-0 flex-col">
      <div className="min-h-0 space-y-4 overflow-y-auto p-5">
        <div>
          <h2 id="reset-company-user-title" className="pr-6 text-base font-semibold text-fg">
            Reset password
          </h2>
          <p className="mt-1 text-sm text-ink-soft">
            Set a new password for {userLabel}. They will be signed out everywhere and must use the new password.
          </p>
        </div>

        <Field label="New password" required>
          <input
            type={inputType}
            value={password}
            onChange={(event) => {
              setPassword(event.target.value);
              setError(null);
            }}
            autoComplete="new-password"
            autoFocus
            className={inputClass}
          />
        </Field>

        <Field label="Confirm password" required>
          <input
            type={inputType}
            value={confirmPassword}
            onChange={(event) => {
              setConfirmPassword(event.target.value);
              setError(null);
            }}
            autoComplete="new-password"
            className={inputClass}
          />
        </Field>

        <button
          type="button"
          onClick={() => setShowPasswords((value) => !value)}
          aria-pressed={showPasswords}
          className="flex items-center gap-1.5 text-xs font-medium text-slate hover:text-fg"
        >
          {showPasswords ? <EyeOff size={14} /> : <Eye size={14} />}
          {showPasswords ? "Hide passwords" : "Show passwords"}
        </button>

        <p className="text-xs text-ink-soft">At least {MIN_LENGTH} characters.</p>

        {error && (
          <p className="animate-shake rounded-md border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger">
            {error}
          </p>
        )}
      </div>

      <div className="flex justify-end gap-2 border-t border-line p-4">
        <button
          type="button"
          onClick={onClose}
          disabled={isResetting}
          className="rounded-md border border-line px-4 py-2 text-sm font-medium text-fg hover:bg-paper disabled:opacity-60"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isResetting || !password || !confirmPassword}
          className="flex items-center gap-2 rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white transition hover:bg-ink-2 active:scale-[0.98] disabled:opacity-60"
        >
          {isResetting && <Spinner size="sm" className="border-white/30 border-t-white" />}
          {isResetting ? "Resetting…" : "Reset password"}
        </button>
      </div>
    </form>
  );
}
