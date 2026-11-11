"use client";

import { useEffect, useState } from "react";
import Modal from "@/shared/components/Modal";
import Spinner from "@/shared/components/Spinner";
import { extractApiError } from "@/shared/utils/apiError";
import { isPlausibleEmail } from "@/features/mailing/utils/gmailCompose";

interface MailAccountDialogProps {
  isOpen: boolean;
  onClose: () => void;
  /** The email the user signs in with. */
  loginEmail: string;
  /** The Google account saved for this user, if any. */
  googleEmail: string | null;
  onSave: (googleEmail: string | null) => Promise<void>;
}

/**
 * Lets a user say which Google account Gmail should open with. Users sign in
 * with a company email that is often not a Google account, so this is
 * separate from the login email.
 */
export default function MailAccountDialog({
  isOpen,
  onClose,
  loginEmail,
  googleEmail,
  onSave,
}: MailAccountDialogProps) {
  const [value, setValue] = useState(googleEmail ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setValue(googleEmail ?? "");
      setError(null);
    }
  }, [isOpen, googleEmail]);

  async function save(next: string | null) {
    setSaving(true);
    setError(null);
    try {
      await onSave(next);
      onClose();
    } catch (err) {
      setError(extractApiError(err, "Couldn't save your Google mail. Try again."));
    } finally {
      setSaving(false);
    }
  }

  function handleSubmit() {
    const trimmed = value.trim();
    if (!trimmed) {
      void save(null);
      return;
    }
    if (!isPlausibleEmail(trimmed)) {
      setError("Enter a valid email address.");
      return;
    }
    void save(trimmed);
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidthClass="max-w-md" ariaLabelledBy="mail-account-title">
      <div className="p-5">
        <h2 id="mail-account-title" className="pr-8 font-serif text-lg text-fg">
          Google mail
        </h2>
        <p className="mt-1 text-sm text-ink-soft">
          Gmail drafts open in this Google account. Leave it empty to use your login email
          {loginEmail ? ` (${loginEmail})` : ""}.
        </p>

        <label htmlFor="mail-account-input" className="mt-4 block text-xs font-semibold uppercase tracking-wide text-ink-soft">
          Google / Gmail address
        </label>
        <input
          id="mail-account-input"
          type="email"
          value={value}
          disabled={saving}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") handleSubmit();
          }}
          placeholder="you@gmail.com"
          className="mt-1 w-full rounded-md border border-line bg-surface px-3 py-2 text-sm text-fg outline-none focus:border-slate"
        />
        <p className="mt-2 text-xs text-ink-soft">
          Google Workspace addresses work too. You need to be signed in to this account in your browser.
        </p>

        {error && <p className="mt-3 rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p>}

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-md border border-line px-4 py-2 text-sm font-medium text-fg hover:bg-paper disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white hover:bg-ink-2 disabled:opacity-50"
          >
            {saving && <Spinner size="sm" />}
            Save
          </button>
        </div>
      </div>
    </Modal>
  );
}
