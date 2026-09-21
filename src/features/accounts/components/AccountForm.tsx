"use client";

import { useEffect, useState, type FormEvent } from "react";
import { userService } from "@/features/users/services/userService";
import type { LeadOwnerOption } from "@/features/auth/types/auth.types";
import { authService } from "@/features/auth/services/authService";
import OwnerPicker from "@/shared/components/OwnerPicker";
import Spinner from "@/shared/components/Spinner";
import { inputClass, Section, Field } from "@/shared/components/FormLayout";
import { LEAD_INDUSTRIES, LEAD_RATINGS, type LeadIndustry, type LeadRating } from "@/features/leads/types/lead.types";
import {
  ACCOUNT_OWNERSHIP_OPTIONS,
  type Account,
  type AccountOwnership,
  type CreateAccountPayload,
} from "@/features/accounts/types/account.types";

interface AccountFormProps {
  mode: "create" | "edit";
  initialAccount?: Account;
  onSubmit: (payload: CreateAccountPayload) => Promise<void>;
  onCancel: () => void;
}

interface FormState {
  owner_id: string;
  ownerLabel: string;
  account_name: string;
  account_site: string;
  account_number: string;
  account_type: string;
  industry: LeadIndustry | "";
  annual_revenue: string;
  rating: LeadRating | "";
  phone: string;
  website: string;
  ticker_symbol: string;
  ownership: AccountOwnership;
  employees: string;
  sic_code: string;
  billing_address: string;
  billing_city: string;
  billing_state: string;
  billing_country: string;
  billing_postal_code: string;
  description: string;
}

function emptyForm(): FormState {
  return {
    owner_id: "",
    ownerLabel: "",
    account_name: "",
    account_site: "",
    account_number: "",
    account_type: "",
    industry: "",
    annual_revenue: "",
    rating: "",
    phone: "",
    website: "",
    ticker_symbol: "",
    ownership: "None",
    employees: "",
    sic_code: "",
    billing_address: "",
    billing_city: "",
    billing_state: "",
    billing_country: "",
    billing_postal_code: "",
    description: "",
  };
}

function formFromAccount(account: Account): FormState {
  return {
    owner_id: account.account_owner_id ?? "",
    ownerLabel: account.account_owner_name ?? "",
    account_name: account.account_name ?? "",
    account_site: account.account_site ?? "",
    account_number: account.account_number ?? "",
    account_type: account.account_type ?? "",
    industry: (account.industry as LeadIndustry) ?? "",
    annual_revenue: account.annual_revenue?.toString() ?? "",
    rating: (account.rating as LeadRating) ?? "",
    phone: account.phone ?? "",
    website: account.website ?? "",
    ticker_symbol: account.ticker_symbol ?? "",
    ownership: account.ownership ?? "None",
    employees: account.employees?.toString() ?? "",
    sic_code: account.sic_code ?? "",
    billing_address: account.billing_address ?? "",
    billing_city: account.billing_city ?? "",
    billing_state: account.billing_state ?? "",
    billing_country: account.billing_country ?? "",
    billing_postal_code: account.billing_postal_code ?? "",
    description: account.description ?? "",
  };
}

export default function AccountForm({ mode, initialAccount, onSubmit, onCancel }: AccountFormProps) {
  const [form, setForm] = useState<FormState>(() =>
    initialAccount ? formFromAccount(initialAccount) : emptyForm()
  );
  const [owners, setOwners] = useState<LeadOwnerOption[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    userService
      .getLeadOwners()
      .then(setOwners)
      .catch(() => setOwners([]));

    if (mode === "create") {
      const current = authService.getSessionUser();
      if (current) {
        update("owner_id", current.id);
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
    if (!form.account_name.trim()) {
      setError("Account Name is required.");
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      await onSubmit({
        account_name: form.account_name.trim(),
        owner_id: form.owner_id,
        account_site: form.account_site.trim() || null,
        account_number: form.account_number.trim() || null,
        account_type: form.account_type.trim() || null,
        industry: form.industry || null,
        annual_revenue: form.annual_revenue ? Number(form.annual_revenue) : null,
        rating: form.rating || null,
        phone: form.phone.trim() || null,
        website: form.website.trim() || null,
        ticker_symbol: form.ticker_symbol.trim() || null,
        ownership: form.ownership,
        employees: form.employees ? Number(form.employees) : null,
        sic_code: form.sic_code.trim() || null,
        billing_address: form.billing_address.trim() || null,
        billing_city: form.billing_city.trim() || null,
        billing_state: form.billing_state.trim() || null,
        billing_country: form.billing_country.trim() || null,
        billing_postal_code: form.billing_postal_code.trim() || null,
        description: form.description.trim() || null,
      });
    } catch {
      setError("Couldn't save this account. Check the fields and try again.");
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="sticky top-0 z-10 -mx-6 -mt-6 flex items-center justify-between rounded-t-lg border-b border-line bg-surface px-6 py-4">
        <h1 className="font-serif text-2xl text-fg">
          {mode === "create" ? "Create Account" : "Edit Account"}
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

      <Section title="Account Information">
        <Field label="Account Owner">
          <OwnerPicker
            owners={owners}
            value={form.owner_id}
            label={form.ownerLabel}
            onChange={(id, label) => {
              update("owner_id", id);
              update("ownerLabel", label);
            }}
          />
        </Field>
        <Field label="Account Name" required>
          <input
            value={form.account_name}
            onChange={(e) => update("account_name", e.target.value)}
            className={inputClass}
            placeholder="ABC Technologies Pvt Ltd"
          />
        </Field>

        <Field label="Account Site">
          <input
            value={form.account_site}
            onChange={(e) => update("account_site", e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Account Number">
          <input
            value={form.account_number}
            onChange={(e) => update("account_number", e.target.value)}
            className={inputClass}
          />
        </Field>

        <Field label="Account Type">
          <input
            value={form.account_type}
            onChange={(e) => update("account_type", e.target.value)}
            className={inputClass}
            placeholder="Customer, Partner, Prospect…"
          />
        </Field>
        <Field label="Ownership">
          <select
            value={form.ownership}
            onChange={(e) => update("ownership", e.target.value as AccountOwnership)}
            className={inputClass}
          >
            {ACCOUNT_OWNERSHIP_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Website">
          <input
            value={form.website}
            onChange={(e) => update("website", e.target.value)}
            className={inputClass}
            placeholder="https://abctech.com"
          />
        </Field>
        <Field label="Phone">
          <input
            value={form.phone}
            onChange={(e) => update("phone", e.target.value)}
            className={inputClass}
          />
        </Field>

        <Field label="Industry">
          <select
            value={form.industry}
            onChange={(e) => update("industry", e.target.value as LeadIndustry)}
            className={inputClass}
          >
            <option value="">-None-</option>
            {LEAD_INDUSTRIES.map((industry) => (
              <option key={industry} value={industry}>
                {industry}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Rating">
          <select
            value={form.rating}
            onChange={(e) => update("rating", e.target.value as LeadRating)}
            className={inputClass}
          >
            <option value="">-None-</option>
            {LEAD_RATINGS.map((rating) => (
              <option key={rating} value={rating}>
                {rating}
              </option>
            ))}
          </select>
        </Field>

        <Field label="No. of Employees">
          <input
            type="number"
            min="0"
            value={form.employees}
            onChange={(e) => update("employees", e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Annual Revenue">
          <input
            type="number"
            min="0"
            value={form.annual_revenue}
            onChange={(e) => update("annual_revenue", e.target.value)}
            className={inputClass}
          />
        </Field>

        <Field label="Ticker Symbol">
          <input
            value={form.ticker_symbol}
            onChange={(e) => update("ticker_symbol", e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="SIC Code">
          <input
            value={form.sic_code}
            onChange={(e) => update("sic_code", e.target.value)}
            className={inputClass}
          />
        </Field>
      </Section>

      <Section title="Billing Address">
        <Field label="Billing Address" fullWidth>
          <input
            value={form.billing_address}
            onChange={(e) => update("billing_address", e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Billing City">
          <input
            value={form.billing_city}
            onChange={(e) => update("billing_city", e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Billing State">
          <input
            value={form.billing_state}
            onChange={(e) => update("billing_state", e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Billing Country">
          <input
            value={form.billing_country}
            onChange={(e) => update("billing_country", e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Billing Postal Code">
          <input
            value={form.billing_postal_code}
            onChange={(e) => update("billing_postal_code", e.target.value)}
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
