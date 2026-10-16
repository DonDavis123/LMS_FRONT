"use client";

import { useState, type FormEvent } from "react";
import { Eye, EyeOff } from "lucide-react";
import { platformService } from "@/features/platform/services/platformService";
import type { CreateCompanyPayload, CreateCompanyResult } from "@/features/platform/types/platform.types";
import { mapUserFormError } from "@/features/users/utils/userFormErrors";
import { Field, inputClass } from "@/shared/components/FormLayout";
import Modal from "@/shared/components/Modal";
import Spinner from "@/shared/components/Spinner";

interface CompanyCreateDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (result: CreateCompanyResult) => void;
}

type CreateField = "company_name" | "website" | "admin_name" | "admin_email" | "admin_password";
type FieldErrors = Partial<Record<CreateField, string>>;

const CREATE_FIELDS: readonly CreateField[] = [
  "company_name",
  "website",
  "admin_name",
  "admin_email",
  "admin_password",
];
// Business-rule failures arrive as `{ detail }` ("User with this email already exists.").
const DETAIL_MATCHERS: Partial<Record<CreateField, RegExp>> = {
  admin_email: /email/i,
};

const COMPANY_NAME_MAX_LENGTH = 255;
const ADMIN_NAME_MAX_LENGTH = 150;
const PASSWORD_MIN_LENGTH = 8;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isValidWebsite(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function validate(values: {
  companyName: string;
  website: string;
  adminName: string;
  adminEmail: string;
  adminPassword: string;
}): FieldErrors {
  const errors: FieldErrors = {};

  if (!values.companyName.trim()) errors.company_name = "Company name is required.";
  else if (values.companyName.trim().length > COMPANY_NAME_MAX_LENGTH) {
    errors.company_name = `Company name must be at most ${COMPANY_NAME_MAX_LENGTH} characters.`;
  }

  if (values.website.trim() && !isValidWebsite(values.website.trim())) {
    errors.website = "Enter a valid URL, e.g. https://example.com.";
  }

  if (!values.adminName.trim()) errors.admin_name = "Name is required.";
  else if (values.adminName.trim().length > ADMIN_NAME_MAX_LENGTH) {
    errors.admin_name = `Name must be at most ${ADMIN_NAME_MAX_LENGTH} characters.`;
  }

  if (!values.adminEmail.trim()) errors.admin_email = "Email is required.";
  else if (!EMAIL_PATTERN.test(values.adminEmail.trim())) errors.admin_email = "Enter a valid email address.";

  if (!values.adminPassword) errors.admin_password = "Password is required.";
  else if (values.adminPassword.length < PASSWORD_MIN_LENGTH) {
    errors.admin_password = `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`;
  }

  return errors;
}

/**
 * POST /platform/companies/ — creates a company together with its first
 * Superadmin in one transaction. The dialog unmounts its form state on
 * close so a password never lingers.
 */
export default function CompanyCreateDialog({ isOpen, onClose, onCreated }: CompanyCreateDialogProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidthClass="max-w-lg" ariaLabelledBy="create-company-title">
      <CreateCompanyForm onClose={onClose} onCreated={onCreated} />
    </Modal>
  );
}

function CreateCompanyForm({ onClose, onCreated }: Omit<CompanyCreateDialogProps, "isOpen">) {
  const [companyName, setCompanyName] = useState("");
  const [website, setWebsite] = useState("");
  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
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

    const errors = validate({ companyName, website, adminName, adminEmail, adminPassword });
    setFieldErrors(errors);
    setFormError(null);
    if (Object.keys(errors).length > 0) return;

    // The password is sent exactly as typed — the backend never trims it.
    const payload: CreateCompanyPayload = {
      company_name: companyName.trim(),
      website: website.trim() || undefined,
      admin_name: adminName.trim(),
      admin_email: adminEmail.trim(),
      admin_password: adminPassword,
    };

    setIsSaving(true);
    try {
      const result = await platformService.createCompany(payload);
      onCreated(result);
    } catch (error) {
      const mapped = mapUserFormError(
        error,
        CREATE_FIELDS,
        DETAIL_MATCHERS,
        "Couldn't create this company. Try again.",
      );
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
          <h2 id="create-company-title" className="pr-6 text-base font-semibold text-fg">
            New company
          </h2>
          <p className="mt-1 text-sm text-ink-soft">
            Creates the company and its first Superadmin, who can then invite the rest of the team.
          </p>
        </div>

        <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">Company</p>

        <Field label="Company name" required>
          <input
            value={companyName}
            onChange={(event) => {
              setCompanyName(event.target.value);
              clearFieldError("company_name");
            }}
            aria-invalid={Boolean(fieldErrors.company_name)}
            autoComplete="off"
            autoFocus
            className={inputClass}
          />
          {fieldErrors.company_name && (
            <span className="mt-1 block text-xs text-danger">{fieldErrors.company_name}</span>
          )}
        </Field>

        <Field label="Website">
          <input
            type="url"
            value={website}
            onChange={(event) => {
              setWebsite(event.target.value);
              clearFieldError("website");
            }}
            aria-invalid={Boolean(fieldErrors.website)}
            placeholder="https://example.com"
            autoComplete="off"
            className={inputClass}
          />
          {fieldErrors.website && <span className="mt-1 block text-xs text-danger">{fieldErrors.website}</span>}
        </Field>

        <p className="pt-1 text-xs font-semibold uppercase tracking-wide text-ink-soft">First superadmin</p>

        <Field label="Name" required>
          <input
            value={adminName}
            onChange={(event) => {
              setAdminName(event.target.value);
              clearFieldError("admin_name");
            }}
            aria-invalid={Boolean(fieldErrors.admin_name)}
            autoComplete="off"
            className={inputClass}
          />
          {fieldErrors.admin_name && <span className="mt-1 block text-xs text-danger">{fieldErrors.admin_name}</span>}
        </Field>

        <Field label="Email" required>
          <input
            type="email"
            value={adminEmail}
            onChange={(event) => {
              setAdminEmail(event.target.value);
              clearFieldError("admin_email");
            }}
            aria-invalid={Boolean(fieldErrors.admin_email)}
            autoComplete="off"
            className={inputClass}
          />
          {fieldErrors.admin_email && (
            <span className="mt-1 block text-xs text-danger">{fieldErrors.admin_email}</span>
          )}
        </Field>

        <Field label="Password" required>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={adminPassword}
              onChange={(event) => {
                setAdminPassword(event.target.value);
                clearFieldError("admin_password");
              }}
              aria-invalid={Boolean(fieldErrors.admin_password)}
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
          {fieldErrors.admin_password ? (
            <span className="mt-1 block text-xs text-danger">{fieldErrors.admin_password}</span>
          ) : (
            <span className="mt-1 block text-xs text-ink-soft">At least {PASSWORD_MIN_LENGTH} characters.</span>
          )}
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
          {isSaving ? "Creating…" : "Create company"}
        </button>
      </div>
    </form>
  );
}
