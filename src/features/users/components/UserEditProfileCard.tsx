"use client";

import { useEffect, useState, type FormEvent } from "react";
import { userService } from "@/features/users/services/userService";
import {
  ASSIGNABLE_USER_ROLES,
  type AssignableUserRole,
  type ManagedUserDetail,
  type UpdateUserPayload,
} from "@/features/users/types/user.types";
import { mapUserFormError } from "@/features/users/utils/userFormErrors";
import { roleLabel } from "@/features/users/utils/userLabels";
import { Field, inputClass } from "@/shared/components/FormLayout";
import { RecordSection } from "@/shared/components/RecordSection";
import Spinner from "@/shared/components/Spinner";
import Select from "@/shared/components/Select";

interface UserEditProfileCardProps {
  user: ManagedUserDetail;
  /** The backend rejects changing your own role, so the role input is locked. */
  isSelf: boolean;
  onUserChange: (user: ManagedUserDetail) => void;
  onNotify: (message: string) => void;
}

type EditField = "name" | "email" | "role";
type FieldErrors = Partial<Record<EditField, string>>;

const EDIT_FIELDS: readonly EditField[] = ["name", "email", "role"];
// Business-rule failures arrive as `{ detail }`; attach them to the input they are about.
const DETAIL_MATCHERS: Partial<Record<EditField, RegExp>> = {
  email: /email/i,
  role: /role/i,
};

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

export default function UserEditProfileCard({ user, isSelf, onUserChange, onNotify }: UserEditProfileCardProps) {
  const savedName = user.name ?? "";
  const savedEmail = user.email ?? "";
  const savedRole = user.role ?? "";

  const [name, setName] = useState(savedName);
  const [email, setEmail] = useState(savedEmail);
  const [role, setRole] = useState(savedRole);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Re-sync the inputs only when the saved values actually change (e.g. after
  // a save), so blocking/unblocking never wipes in-progress edits.
  useEffect(() => {
    setName(savedName);
    setEmail(savedEmail);
    setRole(savedRole);
  }, [savedName, savedEmail, savedRole]);

  // Accounts with a role that can't be assigned here (e.g. a sales role) keep
  // it as a no-op choice so the select always shows the real value.
  const roleOptions: string[] = (ASSIGNABLE_USER_ROLES as readonly string[]).includes(savedRole)
    ? [...ASSIGNABLE_USER_ROLES]
    : [savedRole, ...ASSIGNABLE_USER_ROLES];

  const payload: UpdateUserPayload = {};
  if (name.trim() !== savedName) payload.name = name.trim();
  if (email.trim() !== savedEmail) payload.email = email.trim();
  if (role !== savedRole) payload.role = role as AssignableUserRole;
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
      const mapped = mapUserFormError(error, EDIT_FIELDS, DETAIL_MATCHERS, "Couldn't update this user. Try again.");
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

          <Field label="Role" required>
            <Select
              value={role}
              onChange={(next) => {
                setRole(next);
                setFieldErrors((current) => ({ ...current, role: undefined }));
              }}
              disabled={isSelf}
              ariaLabel="Role"
              ariaInvalid={Boolean(fieldErrors.role)}
              options={roleOptions.map((value) => ({ value, label: roleLabel(value) }))}
            />
            {fieldErrors.role ? (
              <span className="mt-1 block text-xs text-danger">{fieldErrors.role}</span>
            ) : isSelf ? (
              <span className="mt-1 block text-xs text-ink-soft">You can&apos;t change your own role.</span>
            ) : payload.role ? (
              <span className="mt-1 block text-xs text-ink-soft">
                Changing the role signs this user out of every session.
              </span>
            ) : null}
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
