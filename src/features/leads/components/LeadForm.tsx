"use client";

import { useEffect, useState, type FormEvent } from "react";
import { ChevronDown } from "lucide-react";
import { userService } from "@/features/users/services/userService";
import type { LeadOwnerOption } from "@/features/auth/types/auth.types";
import { authService } from "@/features/auth/services/authService";
import OwnerPicker from "@/shared/components/OwnerPicker";
import Spinner from "@/shared/components/Spinner";
import { inputClass, Section, Field } from "@/shared/components/FormLayout";
import ModernStatusSelect from "@/shared/components/ModernStatusSelect";
import {
  LEAD_INDUSTRIES,
  LEAD_RATINGS,
  LEAD_SOURCES,
  LEAD_STATUSES,
  type CreateLeadPayload,
  type Lead,
  type LeadIndustry,
  type LeadRating,
  type LeadSource,
  type LeadStatus,
} from "@/features/leads/types/lead.types";
import Select from "@/shared/components/Select";

interface LeadFormProps {
  mode: "create" | "edit";
  initialLead?: Lead;
  onSubmit: (payload: CreateLeadPayload) => Promise<void>;
  onSaveAndNext?: (payload: CreateLeadPayload) => Promise<void>;
  onCancel: () => void;
}

interface FormState {
  owner_id: string;
  ownerLabel: string;
  name: string;
  title: string;
  company_name: string;
  email: string;
  phone: string;
  mobile_number: string;
  fax: string;
  website: string;
  lead_source: LeadSource;
  lead_status: LeadStatus;
  industry: LeadIndustry;
  rating: LeadRating;
  number_of_employees: string;
  annual_revenue: string;
  address: string;
  city: string;
  state: string;
  country: string;
  postal_code: string;
  description: string;
}

function emptyForm(): FormState {
  return {
    owner_id: "",
    ownerLabel: "",
    name: "",
    title: "",
    company_name: "",
    email: "",
    phone: "",
    mobile_number: "",
    fax: "",
    website: "",
    lead_source: "None",
    lead_status: "None",
    industry: "None",
    rating: "None",
    number_of_employees: "",
    annual_revenue: "",
    address: "",
    city: "",
    state: "",
    country: "",
    postal_code: "",
    description: "",
  };
}

function formFromLead(lead: Lead): FormState {
  return {
    owner_id: lead.owner?.id ?? "",
    ownerLabel: lead.owner?.name ?? "",
    name: lead.name ?? "",
    title: lead.title ?? "",
    company_name: lead.company_name ?? "",
    email: lead.email ?? "",
    phone: lead.phone ?? "",
    mobile_number: lead.mobile_number ?? "",
    fax: lead.fax ?? "",
    website: lead.website ?? "",
    lead_source: lead.lead_source ?? "None",
    lead_status: lead.lead_status ?? "None",
    industry: lead.industry ?? "None",
    rating: lead.rating ?? "None",
    number_of_employees: lead.number_of_employees?.toString() ?? "",
    annual_revenue: lead.annual_revenue?.toString() ?? "",
    address: lead.address ?? "",
    city: lead.city ?? "",
    state: lead.state ?? "",
    country: lead.country ?? "",
    postal_code: lead.postal_code ?? "",
    description: lead.description ?? "",
  };
}

export default function LeadForm({
  mode,
  initialLead,
  onSubmit,
  onSaveAndNext,
  onCancel,
}: LeadFormProps) {
  const [form, setForm] = useState<FormState>(() =>
    initialLead ? formFromLead(initialLead) : emptyForm()
  );
  const [owners, setOwners] = useState<LeadOwnerOption[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSavingNext, setIsSavingNext] = useState(false);
  // Create starts with a quick form; edit always shows every field.
  const [showMore, setShowMore] = useState(mode === "edit");

  function defaultOwnerToCurrentUser() {
    const current = authService.getSessionUser();
    if (current) {
      update("owner_id", current.id);
      update("ownerLabel", current.name);
    }
  }

  // Default the owner to the signed-in user on create, and load the
  // owner picker's options either way.
  useEffect(() => {
    userService
      .getLeadOwners()
      .then(setOwners)
      .catch(() => setOwners([]));

    if (mode === "create") {
      defaultOwnerToCurrentUser();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function buildPayload(): CreateLeadPayload | null {
    if (!form.name.trim()) {
      setError("Name is required.");
      return null;
    }
    setError(null);
    return {
      name: form.name.trim(),
      company_name: form.company_name.trim() || null,
      owner_id: form.owner_id,
      email: form.email.trim() || null,
      title: form.title.trim() || null,
      phone: form.phone.trim() || null,
      mobile_number: form.mobile_number.trim() || null,
      fax: form.fax.trim() || null,
      website: form.website.trim() || null,
      lead_source: form.lead_source,
      lead_status: form.lead_status,
      industry: form.industry,
      rating: form.rating,
      number_of_employees: form.number_of_employees ? Number(form.number_of_employees) : null,
      annual_revenue: form.annual_revenue ? Number(form.annual_revenue) : null,
      address: form.address.trim() || null,
      city: form.city.trim() || null,
      state: form.state.trim() || null,
      country: form.country.trim() || null,
      postal_code: form.postal_code.trim() || null,
      description: form.description.trim() || null,
    };
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const payload = buildPayload();
    if (!payload) return;

    setIsSubmitting(true);
    try {
      await onSubmit(payload);
    } catch {
      setError("Couldn't save this lead. Check the fields and try again.");
      setIsSubmitting(false);
    }
  }

  async function handleSaveAndNext() {
    const payload = buildPayload();
    if (!payload) return;
    if (!onSaveAndNext) return;

    setIsSavingNext(true);
    try {
      await onSaveAndNext(payload);
      if (mode === "create") {
        // Stay on the page, ready for the next lead — mirrors Zoho's
        // "Save and New." Edit mode navigates away, so no reset needed there.
        setForm(emptyForm());
        defaultOwnerToCurrentUser();
        setNotice("Lead created successfully. Ready for the next one.");
        window.setTimeout(() => setNotice(null), 3000);
      }
    } catch {
      setError("Couldn't save this lead. Check the fields and try again.");
    } finally {
      setIsSavingNext(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="sticky top-0 z-10 -mx-3 -mt-3 flex items-center justify-between gap-2 rounded-t-[7px] border-b border-line bg-surface px-3 py-2.5 sm:-mx-5 sm:-mt-5 sm:px-5 sm:py-3">
        <h1 className="font-serif text-2xl text-fg">
          {mode === "create" ? "Create Lead" : "Edit Lead"}
        </h1>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-line px-4 py-2 text-sm font-medium text-fg hover:bg-paper"
          >
            Cancel
          </button>
          {onSaveAndNext && (
            <button
              type="button"
              onClick={handleSaveAndNext}
              disabled={isSavingNext || isSubmitting}
              className="flex items-center gap-2 rounded-md border border-line px-4 py-2 text-sm font-semibold text-fg hover:bg-paper disabled:opacity-60"
            >
              {isSavingNext && <Spinner size="sm" />}
              {isSavingNext ? "Saving…" : "Save and Next"}
            </button>
          )}
          <button
            type="submit"
            disabled={isSubmitting || isSavingNext}
            className="flex items-center gap-2 rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white transition hover:bg-ink-2 active:scale-[0.98] disabled:opacity-60"
          >
            {isSubmitting && <Spinner size="sm" className="border-white/30 border-t-white" />}
            {isSubmitting ? "Saving…" : "Save"}
          </button>
        </div>
      </div>

      {notice && (
        <p className="mt-4 rounded-md border border-success/30 bg-success-soft px-3 py-2 text-sm text-success">
          {notice}
        </p>
      )}

      {error && (
        <p className="mt-4 animate-shake rounded-md border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}

      {/* Quick form — the only fields shown when creating a lead. */}
      <Section title="Lead Information" last={mode === "create"}>
        <Field label="Lead Owner">
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
        <Field label="Name" required>
          <input
            value={form.name}
            onChange={(e) => update("name", e.target.value)}
            className={inputClass}
            placeholder="John Davis"
          />
        </Field>

        <Field label="Phone">
          <input
            value={form.phone}
            onChange={(e) => update("phone", e.target.value)}
            className={inputClass}
            placeholder="+914412345678"
          />
        </Field>
        <Field label="Email">
          <input
            type="email"
            value={form.email}
            onChange={(e) => update("email", e.target.value)}
            className={inputClass}
            placeholder="john.davis@abctech.com"
          />
        </Field>

        <Field label="Lead Source">
          <Select
            value={form.lead_source}
            onChange={(next) => update("lead_source", next as LeadSource)}
            ariaLabel="Lead source"
            options={LEAD_SOURCES.map((source) => ({ value: source, label: source }))}
          />
        </Field>

        <Field label="Description" fullWidth>
          <textarea
            value={form.description}
            onChange={(e) => update("description", e.target.value)}
            className={`${inputClass} min-h-[96px] resize-y`}
            placeholder="Potential enterprise software customer."
          />
        </Field>
      </Section>

      {mode === "create" && (
        <button
          type="button"
          onClick={() => setShowMore((value) => !value)}
          aria-expanded={showMore}
          className="mt-4 flex items-center gap-1 text-sm font-medium text-slate hover:text-fg"
        >
          {showMore ? "Show less" : "Show more"}
          <ChevronDown size={14} className={`transition ${showMore ? "rotate-180" : ""}`} />
        </button>
      )}

      {/* Everything else — shown on edit, or after "Show more" on create. */}
      {showMore && (
        <div className="animate-fade-in">
          <Section title="More Information">
            <Field label="Company">
              <input
                value={form.company_name}
                onChange={(e) => update("company_name", e.target.value)}
                className={inputClass}
                placeholder="ABC Technologies Pvt Ltd"
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

            <Field label="Fax">
              <input
                value={form.fax}
                onChange={(e) => update("fax", e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Website">
              <input
                value={form.website}
                onChange={(e) => update("website", e.target.value)}
                className={inputClass}
                placeholder="https://abctech.com"
              />
            </Field>

            <Field label="Mobile">
              <input
                value={form.mobile_number}
                onChange={(e) => update("mobile_number", e.target.value)}
                className={inputClass}
                placeholder="+919876543210"
              />
            </Field>
            <Field label="Lead Status">
              <ModernStatusSelect
                value={form.lead_status}
                onChange={(value) => update("lead_status", value as LeadStatus)}
                fullWidth
                options={LEAD_STATUSES.map((status) => ({
                  value: status,
                  label: status,
                  tone: status === "Contacted" || status === "Pre-Qualified" ? "success" : status === "Junk Lead" || status === "Lost Lead" || status === "Not Qualified" ? "danger" : status === "Attempted to Contact" || status === "Contact in Future" ? "warning" : "neutral",
                }))}
              />
            </Field>

            <Field label="Rating">
              <Select
                value={form.rating}
                onChange={(next) => update("rating", next as LeadRating)}
                ariaLabel="Rating"
                options={LEAD_RATINGS.map((rating) => ({ value: rating, label: rating }))}
              />
            </Field>
            <Field label="Industry">
              <Select
                value={form.industry}
                onChange={(next) => update("industry", next as LeadIndustry)}
                ariaLabel="Industry"
                options={LEAD_INDUSTRIES.map((industry) => ({ value: industry, label: industry }))}
              />
            </Field>

            <Field label="No. of Employees">
              <input
                type="number"
                min="0"
                value={form.number_of_employees}
                onChange={(e) => update("number_of_employees", e.target.value)}
                className={inputClass}
                placeholder="150"
              />
            </Field>
            <Field label="Annual Revenue">
              <input
                type="number"
                min="0"
                value={form.annual_revenue}
                onChange={(e) => update("annual_revenue", e.target.value)}
                className={inputClass}
                placeholder="10000000"
              />
            </Field>
          </Section>

          <Section title="Address Information" last>
            <Field label="Country / Region">
              <input
                value={form.country}
                onChange={(e) => update("country", e.target.value)}
                className={inputClass}
                placeholder="India"
              />
            </Field>
            <Field label="City">
              <input
                value={form.city}
                onChange={(e) => update("city", e.target.value)}
                className={inputClass}
                placeholder="Chennai"
              />
            </Field>

            <Field label="Address" fullWidth>
              <input
                value={form.address}
                onChange={(e) => update("address", e.target.value)}
                className={inputClass}
                placeholder="12 MG Road"
              />
            </Field>

            <Field label="State / Province">
              <input
                value={form.state}
                onChange={(e) => update("state", e.target.value)}
                className={inputClass}
                placeholder="Tamil Nadu"
              />
            </Field>
            <Field label="Zip / Postal Code">
              <input
                value={form.postal_code}
                onChange={(e) => update("postal_code", e.target.value)}
                className={inputClass}
                placeholder="600001"
              />
            </Field>
          </Section>
        </div>
      )}
    </form>
  );
}
