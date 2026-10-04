"use client";

import { useState, type FormEvent } from "react";
import { Eye, EyeOff } from "lucide-react";
import ConfirmActionDialog from "@/features/users/components/ConfirmActionDialog";
import { userService } from "@/features/users/services/userService";
import { Field, inputClass } from "@/shared/components/FormLayout";
import { RecordSection } from "@/shared/components/RecordSection";
import Spinner from "@/shared/components/Spinner";
import { extractApiError } from "@/shared/utils/apiError";

interface UserResetPasswordCardProps {
  userId: string;
  userLabel: string;
  /** Backend rejects resetting your own password, so the form is replaced by a hint. */
  isSelf: boolean;
  onNotify: (message: string) => void;
}

const MIN_LENGTH = 8;
const MAX_LENGTH = 128;

export default function UserResetPasswordCard({ userId, userLabel, isSelf, onNotify }: UserResetPasswordCardProps) {
  // Held only in component state: never logged, persisted or put in a URL.
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  if (isSelf) {
    return (
      <RecordSection title="Reset password">
        <p className="text-sm text-ink-soft sm:col-span-2">
          You can&apos;t reset your own password here. Use &quot;Forgot password&quot; on the sign-in page instead.
        </p>
      </RecordSection>
    );
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setServerError(null);

    if (password.length < MIN_LENGTH) {
      setValidationError(`Password must be at least ${MIN_LENGTH} characters.`);
      return;
    }
    if (password.length > MAX_LENGTH) {
      setValidationError(`Password must be at most ${MAX_LENGTH} characters.`);
      return;
    }
    if (password !== confirmPassword) {
      setValidationError("Passwords do not match.");
      return;
    }

    setValidationError(null);
    setIsConfirmOpen(true);
  }

  async function handleConfirm() {
    setIsResetting(true);
    try {
      await userService.resetUserPassword(userId, password);
      setPassword("");
      setConfirmPassword("");
      setShowPasswords(false);
      onNotify("Password reset successfully");
    } catch (error) {
      setServerError(extractApiError(error, "Couldn't reset the password. Try again."));
    } finally {
      setIsResetting(false);
      setIsConfirmOpen(false);
    }
  }

  const inputType = showPasswords ? "text" : "password";
  const error = validationError ?? serverError;

  return (
    <RecordSection title="Reset password">
      <form onSubmit={handleSubmit} noValidate className="space-y-4 sm:col-span-2">
        <div className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
          <Field label="New password" required>
            <input
              type={inputType}
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                setValidationError(null);
              }}
              autoComplete="new-password"
              className={inputClass}
            />
          </Field>

          <Field label="Confirm password" required>
            <input
              type={inputType}
              value={confirmPassword}
              onChange={(event) => {
                setConfirmPassword(event.target.value);
                setValidationError(null);
              }}
              autoComplete="new-password"
              className={inputClass}
            />
          </Field>
        </div>

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

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isResetting || !password || !confirmPassword}
            className="flex items-center gap-2 rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white transition hover:bg-ink-2 active:scale-[0.98] disabled:opacity-60"
          >
            {isResetting && <Spinner size="sm" className="border-white/30 border-t-white" />}
            Reset password
          </button>
        </div>
      </form>

      <ConfirmActionDialog
        isOpen={isConfirmOpen}
        title="Reset password?"
        message={`Reset the password for ${userLabel}? The user will be signed out everywhere and must use the new password.`}
        confirmLabel="Reset password"
        isBusy={isResetting}
        onConfirm={handleConfirm}
        onCancel={() => setIsConfirmOpen(false)}
      />
    </RecordSection>
  );
}
