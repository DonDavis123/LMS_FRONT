"use client";

import { useEffect, useState, type FormEvent } from "react";
import { userService } from "@/features/users/services/userService";
import type { ManagedUserDetail, UpdateUserPayload } from "@/features/users/types/user.types";
import { Field, inputClass } from "@/shared/components/FormLayout";
import { RecordSection } from "@/shared/components/RecordSection";
import Spinner from "@/shared/components/Spinner";
import { extractApiError } from "@/shared/utils/apiError";

interface UserEditProfileCardProps {
  user: ManagedUserDetail;
  onUserChange: (user: ManagedUserDetail) => void;
  onNotify: (message: string) => void;
}

interface FieldErrors {
  name?: string;
  email?: string;
}

const NAME_MAX_LENGTH = 150;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validate(name: string, email: string): FieldErrors {
  const errors: FieldErrors = {};
  if (!name.trim()) errors.name = "Name is required.";
  else if (name.trim().length > NAME_MAX_LENGTH) errors.name = `Name must be at most ${NAME_MAX_LENGTH} characters.`;

  if (!email.trim()) errors.email = "Email is required.";
  else if (!EMAIL_PATTERN.test(email.trim())) errors.email = "Enter a valid email address.";
  return errors;
}

/** First message of a DRF field error (`{ email: ["..."] }` or `{ email: "..." }`). */
function readFieldMessage(data: Record<string, unknown>, field: string): string | undefined {
  const value = data[field];
  if (typeof value === "string") return value;
  if (Array.isArray(value) && typeof value[0] === "string") return value[0];
  return undefined;
}

/**
 * Maps a failed PATCH onto the form: field errors go under their input
 * (a duplicate email arrives as `{ detail: "User with this email already
 * exists." }`, so a `detail` that mentions the email is shown under it),
 * anything else becomes a form-level message — always the server's own text.
 */
function mapServerError(error: unknown): { fields: FieldErrors; form: string | null } {
  const data = (error as { response?: { data?: unknown } } | null)?.response?.data;
  const fields: FieldErrors = {};

  if (data && typeof data === "object" && !Array.isArray(data)) {
    const record = data as Record<string, unknown>;
    fields.name = readFieldMessage(record, "name");
    fields.email = readFieldMessage(record, "email");

    const detail = typeof record.detail === "string" ? record.detail : null;
    if (detail && /email/i.test(detail) && !fields.email) fields.email = detail;
  }

  if (fields.name || fields.email) return { fields, form: null };
  return { fields, form: extractApiError(error, "Couldn't update this user. Try again.") };
}

export default function UserEditProfileCard({ user, onUserChange, onNotify }: UserEditProfileCardProps) {
  const savedName = user.name ?? "";
  const savedEmail = user.email ?? "";

  const [name, setName] = useState(savedName);
  const [email, setEmail] = useState(savedEmail);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Re-sync the inputs only when the saved values actually change (e.g. after
  // a save), so blocking/unblocking never wipes in-progress edits.
  useEffect(() => {
    setName(savedName);
    setEmail(savedEmail);
  }, [savedName, savedEmail]);

  const payload: UpdateUserPayload = {};
  if (name.trim() !== savedName) payload.name = name.trim();
  if (email.trim() !== savedEmail) payload.email = email.trim();
  const hasChanges = Object.keys(payload).length > 0;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!hasChanges || isSaving) return;

    const errors = validate(name, email);
    setFieldErrors(errors);
    setFormError(null);
    if (errors.name || errors.email) return;

    setIsSaving(true);
    try {
      const updated = await userService.updateUser(user.id, payload);
      onUserChange(updated);
      onNotify("User updated successfully");
    } catch (error) {
      const mapped = mapServerError(error);
      setFieldErrors(mapped.fields);
      setFormError(mapped.form);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <RecordSection title="Edit profile">
      <form onSubmit={handleSubmit} noValidate className="space-y-4 sm:col-span-2">
        <div className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
          <Field label="Name" required>
            <input
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                setFieldErrors((current) => ({ ...current, name: undefined }));
              }}
              aria-invalid={Boolean(fieldErrors.name)}
              autoComplete="off"
              className={inputClass}
            />
            {fieldErrors.name && <span className="mt-1 block text-xs text-danger">{fieldErrors.name}</span>}
          </Field>

          <Field label="Email" required>
            <input
              type="email"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                setFieldErrors((current) => ({ ...current, email: undefined }));
              }}
              aria-invalid={Boolean(fieldErrors.email)}
              autoComplete="off"
              className={inputClass}
            />
            {fieldErrors.email && <span className="mt-1 block text-xs text-danger">{fieldErrors.email}</span>}
          </Field>
        </div>

        {formError && (
          <p className="animate-shake rounded-md border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger">
            {formError}
          </p>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={!hasChanges || isSaving}
            className="flex items-center gap-2 rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white transition hover:bg-ink-2 active:scale-[0.98] disabled:opacity-60"
          >
            {isSaving && <Spinner size="sm" className="border-white/30 border-t-white" />}
            {isSaving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </form>
    </RecordSection>
  );
}
