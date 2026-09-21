"use client";

import { useEffect, useState, type FormEvent } from "react";
import { userService } from "@/features/users/services/userService";
import type { LeadOwnerOption } from "@/features/auth/types/auth.types";
import { authService } from "@/features/auth/services/authService";
import OwnerPicker from "@/shared/components/OwnerPicker";
import RecordPicker from "@/shared/components/RecordPicker";
import Spinner from "@/shared/components/Spinner";
import { inputClass, Section, Field } from "@/shared/components/FormLayout";
import { LEAD_SOURCES, type LeadSource } from "@/features/leads/types/lead.types";
import { AccountService } from "@/features/accounts/services/AccountService";
import { ContactService } from "@/features/contacts/services/ContactService";
import type { Contact, CreateContactPayload } from "@/features/contacts/types/contact.types";

interface ContactFormProps {
  mode: "create" | "edit";
  initialContact?: Contact;
  onSubmit: (payload: CreateContactPayload) => Promise<void>;
  onCancel: () => void;
}

interface FormState {
  contact_owner_id: string;
  ownerLabel: string;
  account_id: string;
  accountLabel: string;
  reporting_to_id: string;
  reportingToLabel: string;
  name: string;
  email: string;
  secondary_email: string;
  phone: string;
  other_phone: string;
  mobile: string;
  home_phone: string;
  assistant_phone: string;
  title: string;
  department: string;
  lead_source: LeadSource | "";
  vendor_name: string;
  date_of_birth: string;
  assistant: string;
  email_opt_out: boolean;
  mailing_address: string;
  mailing_city: string;
  mailing_state: string;
  mailing_country: string;
  mailing_postal_code: string;
  other_address: string;
  description: string;
}

function emptyForm(): FormState {
  return {
    contact_owner_id: "",
    ownerLabel: "",
    account_id: "",
    accountLabel: "",
    reporting_to_id: "",
    reportingToLabel: "",
    name: "",
    email: "",
    secondary_email: "",
    phone: "",
    other_phone: "",
    mobile: "",
    home_phone: "",
    assistant_phone: "",
    title: "",
    department: "",
    lead_source: "",
    vendor_name: "",
    date_of_birth: "",
    assistant: "",
    email_opt_out: false,
    mailing_address: "",
    mailing_city: "",
    mailing_state: "",
    mailing_country: "",
    mailing_postal_code: "",
    other_address: "",
    description: "",
  };
}

function formFromContact(contact: Contact): FormState {
  return {
    contact_owner_id: contact.contact_owner_id ?? "",
    ownerLabel: contact.contact_owner_name ?? "",
    account_id: contact.account_id ?? "",
    accountLabel: contact.account_name ?? "",
    reporting_to_id: contact.reporting_to_id ?? "",
    reportingToLabel: contact.reporting_to_name ?? "",
    name: contact.name ?? "",
    email: contact.email ?? "",
    secondary_email: contact.secondary_email ?? "",
    phone: contact.phone ?? "",
    other_phone: contact.other_phone ?? "",
    mobile: contact.mobile ?? "",
    home_phone: contact.home_phone ?? "",
    assistant_phone: contact.assistant_phone ?? "",
    title: contact.title ?? "",
    department: contact.department ?? "",
    lead_source: (contact.lead_source as LeadSource) ?? "",
    vendor_name: contact.vendor_name ?? "",
    date_of_birth: contact.date_of_birth ?? "",
    assistant: contact.assistant ?? "",
    email_opt_out: contact.email_opt_out ?? false,
    mailing_address: contact.mailing_address ?? "",
    mailing_city: contact.mailing_city ?? "",
    mailing_state: contact.mailing_state ?? "",
    mailing_country: contact.mailing_country ?? "",
    mailing_postal_code: contact.mailing_postal_code ?? "",
    other_address: contact.other_address ?? "",
    description: contact.description ?? "",
  };
}

export default function ContactForm({ mode, initialContact, onSubmit, onCancel }: ContactFormProps) {
  const [form, setForm] = useState<FormState>(() =>
    initialContact ? formFromContact(initialContact) : emptyForm()
  );
  const [owners, setOwners] = useState<LeadOwnerOption[]>([]);
  const [accountOptions, setAccountOptions] = useState<{ id: string; label: string }[]>([]);
  const [contactOptions, setContactOptions] = useState<{ id: string; label: string }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    userService
      .getLeadOwners()
      .then(setOwners)
      .catch(() => setOwners([]));

    AccountService.getAccounts()
      .then((accounts) =>
        setAccountOptions(accounts.map((a) => ({ id: a.id, label: a.account_name })))
      )
      .catch(() => setAccountOptions([]));

    ContactService.getContacts()
      .then((contacts) =>
        setContactOptions(
          contacts
            .filter((c) => c.id !== initialContact?.id)
            .map((c) => ({ id: c.id, label: c.name }))
        )
      )
      .catch(() => setContactOptions([]));

    if (mode === "create") {
      const current = authService.getSessionUser();
      if (current) {
        update("contact_owner_id", current.id);
        update("ownerLabel", current.name);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!form.name.trim()) {
      setError("Name is required.");
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      await onSubmit({
        name: form.name.trim(),
        contact_owner_id: form.contact_owner_id,
        account_id: form.account_id || null,
        email: form.email.trim() || null,
        secondary_email: form.secondary_email.trim() || null,
        phone: form.phone.trim() || null,
        other_phone: form.other_phone.trim() || null,
        mobile: form.mobile.trim() || null,
        home_phone: form.home_phone.trim() || null,
        assistant_phone: form.assistant_phone.trim() || null,
        title: form.title.trim() || null,
        department: form.department.trim() || null,
        lead_source: form.lead_source || null,
        vendor_name: form.vendor_name.trim() || null,
        date_of_birth: form.date_of_birth || null,
        assistant: form.assistant.trim() || null,
        email_opt_out: form.email_opt_out,
        reporting_to_id: form.reporting_to_id || null,
        mailing_address: form.mailing_address.trim() || null,
        mailing_city: form.mailing_city.trim() || null,
        mailing_state: form.mailing_state.trim() || null,
        mailing_country: form.mailing_country.trim() || null,
        mailing_postal_code: form.mailing_postal_code.trim() || null,
        other_address: form.other_address.trim() || null,
        description: form.description.trim() || null,
      });
    } catch {
      setError("Couldn't save this contact. Check the fields and try again.");
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="sticky top-0 z-10 -mx-6 -mt-6 flex items-center justify-between rounded-t-lg border-b border-line bg-surface px-6 py-4">
        <h1 className="font-serif text-2xl text-fg">
          {mode === "create" ? "Create Contact" : "Edit Contact"}
        </h1>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-line px-4 py-2 text-sm font-medium text-fg hover:bg-paper"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center gap-2 rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white transition hover:bg-ink-2 active:scale-[0.98] disabled:opacity-60"
          >
            {isSubmitting && <Spinner size="sm" className="border-white/30 border-t-white" />}
            {isSubmitting ? "Saving…" : "Save"}
          </button>
        </div>
      </div>

      {error && (
        <p className="mt-4 animate-shake rounded-md border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}

      <Section title="Contact Information">
        <Field label="Contact Owner">
          <OwnerPicker
            owners={owners}
            value={form.contact_owner_id}
            label={form.ownerLabel}
            onChange={(id, label) => {
              update("contact_owner_id", id);
              update("ownerLabel", label);
            }}
          />
        </Field>
        <Field label="Account Name">
          <RecordPicker
            options={accountOptions}
            value={form.account_id}
            label={form.accountLabel}
            onChange={(id, label) => {
              update("account_id", id);
              update("accountLabel", label);
            }}
            placeholder="No account"
          />
        </Field>

        <Field label="Name" required>
          <input
            value={form.name}
            onChange={(e) => update("name", e.target.value)}
            className={inputClass}
            placeholder="Don Davis"
          />
        </Field>
        <Field label="Title">
          <input
            value={form.title}
            onChange={(e) => update("title", e.target.value)}
            className={inputClass}
            placeholder="IT Manager"
          />
        </Field>

        <Field label="Email">
          <input
            type="email"
            value={form.email}
            onChange={(e) => update("email", e.target.value)}
            className={inputClass}
            placeholder="don.davis@abctech.com"
          />
        </Field>
        <Field label="Secondary Email">
          <input
            type="email"
            value={form.secondary_email}
            onChange={(e) => update("secondary_email", e.target.value)}
            className={inputClass}
          />
        </Field>

        <Field label="Phone">
          <input
            value={form.phone}
            onChange={(e) => update("phone", e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Mobile">
          <input
            value={form.mobile}
            onChange={(e) => update("mobile", e.target.value)}
            className={inputClass}
          />
        </Field>

        <Field label="Home Phone">
          <input
            value={form.home_phone}
            onChange={(e) => update("home_phone", e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Other Phone">
          <input
            value={form.other_phone}
            onChange={(e) => update("other_phone", e.target.value)}
            className={inputClass}
          />
        </Field>

        <Field label="Department">
          <input
            value={form.department}
            onChange={(e) => update("department", e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Lead Source">
          <select
            value={form.lead_source}
            onChange={(e) => update("lead_source", e.target.value as LeadSource)}
            className={inputClass}
          >
            <option value="">-None-</option>
            {LEAD_SOURCES.map((source) => (
              <option key={source} value={source}>
                {source}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Vendor Name">
          <input
            value={form.vendor_name}
            onChange={(e) => update("vendor_name", e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Date of Birth">
          <input
            type="date"
            value={form.date_of_birth}
            onChange={(e) => update("date_of_birth", e.target.value)}
            className={inputClass}
          />
        </Field>

        <Field label="Assistant">
          <input
            value={form.assistant}
            onChange={(e) => update("assistant", e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Assistant Phone">
          <input
            value={form.assistant_phone}
            onChange={(e) => update("assistant_phone", e.target.value)}
            className={inputClass}
          />
        </Field>

        <Field label="Reporting To">
          <RecordPicker
            options={contactOptions}
            value={form.reporting_to_id}
            label={form.reportingToLabel}
            onChange={(id, label) => {
              update("reporting_to_id", id);
              update("reportingToLabel", label);
            }}
            placeholder="No one"
          />
        </Field>
        <Field label="Email Opt Out">
          <div className="flex h-[42px] items-center gap-2 text-sm text-fg">
            <input
              id="email_opt_out"
              type="checkbox"
              checked={form.email_opt_out}
              onChange={(e) => update("email_opt_out", e.target.checked)}
              className="h-4 w-4 rounded border-line accent-ink"
            />
            <label htmlFor="email_opt_out">Don&apos;t send this contact marketing emails</label>
          </div>
        </Field>
      </Section>

      <Section title="Address Information">
        <Field label="Mailing Address" fullWidth>
          <input
            value={form.mailing_address}
            onChange={(e) => update("mailing_address", e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Mailing City">
          <input
            value={form.mailing_city}
            onChange={(e) => update("mailing_city", e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Mailing State">
          <input
            value={form.mailing_state}
            onChange={(e) => update("mailing_state", e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Mailing Country">
          <input
            value={form.mailing_country}
            onChange={(e) => update("mailing_country", e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Mailing Postal Code">
          <input
            value={form.mailing_postal_code}
            onChange={(e) => update("mailing_postal_code", e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Other Address" fullWidth>
          <input
            value={form.other_address}
            onChange={(e) => update("other_address", e.target.value)}
            className={inputClass}
          />
        </Field>
      </Section>

      <Section title="Description Information" last>
        <Field label="Description" fullWidth>
          <textarea
            value={form.description}
            onChange={(e) => update("description", e.target.value)}
            className={`${inputClass} min-h-[88px] resize-y`}
          />
        </Field>
      </Section>
    </form>
  );
}
