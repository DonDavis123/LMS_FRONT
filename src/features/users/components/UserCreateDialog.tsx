"use client";

import { useState, type FormEvent } from "react";
import { Eye, EyeOff } from "lucide-react";
import { userService } from "@/features/users/services/userService";
import {
  ASSIGNABLE_USER_ROLES,
  type AssignableUserRole,
  type CreateUserPayload,
  type ManagedUserDetail,
} from "@/features/users/types/user.types";
import { mapUserFormError } from "@/features/users/utils/userFormErrors";
import { roleLabel } from "@/features/users/utils/userLabels";
import { Field, inputClass } from "@/shared/components/FormLayout";
import Modal from "@/shared/components/Modal";
import Spinner from "@/shared/components/Spinner";
import Select from "@/shared/components/Select";

interface UserCreateDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (user: ManagedUserDetail) => void;
}

type CreateField = "name" | "email" | "password" | "role";
type FieldErrors = Partial<Record<CreateField, string>>;

const CREATE_FIELDS: readonly CreateField[] = ["name", "email", "password", "role"];
const DETAIL_MATCHERS: Partial<Record<CreateField, RegExp>> = {
  email: /email/i,
  role: /role/i,
};

const NAME_MAX_LENGTH = 150;
const PASSWORD_MIN_LENGTH = 8;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DEFAULT_ROLE: AssignableUserRole = "ADMIN";

function validate(name: string, email: string, password: string): FieldErrors {
  const errors: FieldErrors = {};
  if (!name.trim()) errors.name = "Name is required.";
  else if (name.trim().length > NAME_MAX_LENGTH) errors.name = `Name must be at most ${NAME_MAX_LENGTH} characters.`;

  if (!email.trim()) errors.email = "Email is required.";
  else if (!EMAIL_PATTERN.test(email.trim())) errors.email = "Enter a valid email address.";

  if (!password) errors.password = "Password is required.";
  else if (password.length < PASSWORD_MIN_LENGTH) {
    errors.password = `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`;
  }
  return errors;
}

/**
 * POST /users/ — a superadmin creates an Admin or Superadmin account. The
 * dialog unmounts its form state on close so a password never lingers.
 */
export default function UserCreateDialog({ isOpen, onClose, onCreated }: UserCreateDialogProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidthClass="max-w-md" ariaLabelledBy="create-user-title">
      <CreateUserForm onClose={onClose} onCreated={onCreated} />
    </Modal>
  );
}

function CreateUserForm({ onClose, onCreated }: Omit<UserCreateDialogProps, "isOpen">) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<AssignableUserRole>(DEFAULT_ROLE);
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  function clearFieldError(field: CreateField) {
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSaving) return;

    const errors = validate(name, email, password);
    setFieldErrors(errors);
    setFormError(null);
    if (Object.keys(errors).length > 0) return;

    // The password is sent exactly as typed — the backend never trims it.
    const payload: CreateUserPayload = { name: name.trim(), email: email.trim(), password, role };

    setIsSaving(true);
    try {
      const created = await userService.createUser(payload);
      onCreated(created);
    } catch (error) {
      const mapped = mapUserFormError(error, CREATE_FIELDS, DETAIL_MATCHERS, "Couldn't create this user. Try again.");
      setFieldErrors(mapped.fields);
      setFormError(mapped.form);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex min-h-0 flex-col">
      <div className="min-h-0 space-y-4 overflow-y-auto p-5">
        <div>
          <h2 id="create-user-title" className="pr-6 text-base font-semibold text-fg">
            New user
          </h2>
          <p className="mt-1 text-sm text-ink-soft">Create an Admin or Superadmin account.</p>
        </div>

        <Field label="Name" required>
          <input
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              clearFieldError("name");
            }}
            aria-invalid={Boolean(fieldErrors.name)}
            autoComplete="off"
            autoFocus
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
              clearFieldError("email");
            }}
            aria-invalid={Boolean(fieldErrors.email)}
            autoComplete="off"
            className={inputClass}
          />
          {fieldErrors.email && <span className="mt-1 block text-xs text-danger">{fieldErrors.email}</span>}
        </Field>

        <Field label="Password" required>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                clearFieldError("password");
              }}
              aria-invalid={Boolean(fieldErrors.password)}
              autoComplete="new-password"
              className={`${inputClass} pr-10`}
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              aria-pressed={showPassword}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-ink-soft hover:text-fg"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {fieldErrors.password ? (
            <span className="mt-1 block text-xs text-danger">{fieldErrors.password}</span>
          ) : (
            <span className="mt-1 block text-xs text-ink-soft">At least {PASSWORD_MIN_LENGTH} characters.</span>
          )}
        </Field>

        <Field label="Role" required>
          <Select
            value={role}
            onChange={(next) => {
              setRole(next as AssignableUserRole);
              clearFieldError("role");
            }}
            ariaLabel="Role"
            ariaInvalid={Boolean(fieldErrors.role)}
            options={ASSIGNABLE_USER_ROLES.map((value) => ({ value, label: roleLabel(value) }))}
          />
          {fieldErrors.role && <span className="mt-1 block text-xs text-danger">{fieldErrors.role}</span>}
        </Field>

        {formError && (
          <p className="animate-shake rounded-md border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger">
            {formError}
          </p>
        )}
      </div>

      <div className="flex justify-end gap-2 border-t border-line p-4">
        <button
          type="button"
          onClick={onClose}
          disabled={isSaving}
          className="rounded-md border border-line px-4 py-2 text-sm font-medium text-fg hover:bg-paper disabled:opacity-60"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSaving}
          className="flex items-center gap-2 rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white transition hover:bg-ink-2 active:scale-[0.98] disabled:opacity-60"
        >
          {isSaving && <Spinner size="sm" className="border-white/30 border-t-white" />}
          {isSaving ? "Creating…" : "Create user"}
        </button>
      </div>
    </form>
  );
}
