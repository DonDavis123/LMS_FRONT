"use client";

import { useEffect, useState, type FormEvent } from "react";
import { platformService } from "@/features/platform/services/platformService";
import type { Company, CompanyDetail, UpdateCompanyPayload } from "@/features/platform/types/platform.types";
import { mapUserFormError } from "@/features/users/utils/userFormErrors";
import { Field, inputClass } from "@/shared/components/FormLayout";
import { RecordSection } from "@/shared/components/RecordSection";
import Spinner from "@/shared/components/Spinner";

interface CompanyEditCardProps {
  company: CompanyDetail;
  onCompanyChange: (company: Company) => void;
  onNotify: (message: string) => void;
}

type EditField = "name" | "website";
type FieldErrors = Partial<Record<EditField, string>>;

const EDIT_FIELDS: readonly EditField[] = ["name", "website"];
const NAME_MAX_LENGTH = 255;

function isValidWebsite(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function validate(name: string, website: string): FieldErrors {
  const errors: FieldErrors = {};
  if (!name.trim()) errors.name = "Company name is required.";
  else if (name.trim().length > NAME_MAX_LENGTH) errors.name = `Name must be at most ${NAME_MAX_LENGTH} characters.`;

  if (website.trim() && !isValidWebsite(website.trim())) {
    errors.website = "Enter a valid URL, e.g. https://example.com.";
  }
  return errors;
}

/** PATCH /platform/companies/{id}/ — name and/or website. The slug never changes. */
export default function CompanyEditCard({ company, onCompanyChange, onNotify }: CompanyEditCardProps) {
  const savedName = company.name ?? "";
  const savedWebsite = company.website ?? "";

  const [name, setName] = useState(savedName);
  const [website, setWebsite] = useState(savedWebsite);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Re-sync the inputs only when the saved values actually change (e.g. after
  // a save), so suspending or adding users never wipes in-progress edits.
  useEffect(() => {
    setName(savedName);
    setWebsite(savedWebsite);
  }, [savedName, savedWebsite]);

  const payload: UpdateCompanyPayload = {};
  if (name.trim() !== savedName) payload.name = name.trim();
  // An emptied website is sent as `null`, which clears it on the server.
  if (website.trim() !== savedWebsite) payload.website = website.trim() || null;
  const hasChanges = Object.keys(payload).length > 0;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!hasChanges || isSaving) return;

    const errors = validate(name, website);
    setFieldErrors(errors);
    setFormError(null);
    if (Object.keys(errors).length > 0) return;

    setIsSaving(true);
    try {
      const updated = await platformService.updateCompany(company.id, payload);
      onCompanyChange(updated);
      onNotify("Company updated successfully");
    } catch (error) {
      const mapped = mapUserFormError(error, EDIT_FIELDS, {}, "Couldn't update this company. Try again.");
      setFieldErrors(mapped.fields);
      setFormError(mapped.form);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <RecordSection title="Edit company">
      <form onSubmit={handleSubmit} noValidate className="space-y-4 sm:col-span-2">
        <div className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
          <Field label="Company name" required>
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

          <Field label="Website">
            <input
              type="url"
              value={website}
              onChange={(event) => {
                setWebsite(event.target.value);
                setFieldErrors((current) => ({ ...current, website: undefined }));
              }}
              aria-invalid={Boolean(fieldErrors.website)}
              placeholder="https://example.com"
              autoComplete="off"
              className={inputClass}
            />
            {fieldErrors.website ? (
              <span className="mt-1 block text-xs text-danger">{fieldErrors.website}</span>
            ) : (
              <span className="mt-1 block text-xs text-ink-soft">Leave empty to remove the website.</span>
            )}
          </Field>
        </div>

        <p className="text-xs text-ink-soft">
          The company slug (<span className="font-medium text-fg">{company.slug}</span>) never changes.
        </p>

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
