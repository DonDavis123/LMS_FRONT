"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import FormWarning from "@/shared/components/FormWarning";
import { useNoChangeGuard } from "@/shared/hooks/useNoChangeGuard";
import { useFormError } from "@/shared/hooks/useFormError";
import { userService } from "@/features/users/services/userService";
import { authService } from "@/features/auth/services/authService";
import type { LeadOwnerOption } from "@/features/auth/types/auth.types";
import OwnerPicker from "@/shared/components/OwnerPicker";
import RecordPicker from "@/shared/components/RecordPicker";
import Select from "@/shared/components/Select";
import DateInput from "@/shared/components/DateInput";
import Spinner from "@/shared/components/Spinner";
import { Field, inputClass } from "@/shared/components/FormLayout";
import { extractApiError } from "@/shared/utils/apiError";
import type { CreateDealPayload, Deal, DealStage } from "@/features/deals/types/deal.types";
import { CREATE_STAGES, DEFAULT_DEAL_STAGE, STAGE_META } from "@/features/deals/utils/dealStages";
import { normalizeAmountInput } from "@/features/deals/utils/formatCurrency";

/** Id of the form's heading, for the surrounding Modal's `ariaLabelledBy`. */
export const DEAL_FORM_TITLE_ID = "deal-form-title";

export interface PickedRecord {
  id: string;
  label: string;
}

interface DealFormProps {
  mode: "create" | "edit";
  initialDeal?: Deal;
  /** Pre-selects the account (e.g. when creating from an account page). */
  initialAccount?: PickedRecord;
  /** Pre-selects the contact (e.g. when creating from a contact page). */
  initialContact?: PickedRecord;
  onSubmit: (payload: CreateDealPayload) => Promise<void>;
  onCancel: () => void;
}

interface FormState {
  name: string;
  amount: string;
  expected_close_date: string;
  stage: DealStage;
  probability: string;
  /** Once the user edits the probability, changing the stage no longer overwrites it. */
  probabilityTouched: boolean;
  owner_id: string;
  ownerLabel: string;
  account_id: string;
  accountLabel: string;
  contact_id: string;
  contactLabel: string;
  description: string;
}

function formFromDeal(deal: Deal): FormState {
  return {
    name: deal.name ?? "",
    amount: deal.amount ?? "",
    expected_close_date: deal.expected_close_date ?? "",
    stage: deal.stage,
    probability: String(deal.probability ?? STAGE_META[deal.stage]?.defaultProbability ?? 0),
    probabilityTouched: true,
    owner_id: deal.owner_id ?? "",
    ownerLabel: deal.owner_name ?? "",
    account_id: deal.account_id ?? "",
    accountLabel: deal.account_name ?? "",
    contact_id: deal.contact_id ?? "",
    contactLabel: deal.contact_name ?? "",
    description: deal.description ?? "",
  };
}

function emptyForm(initialAccount?: PickedRecord, initialContact?: PickedRecord): FormState {
  const session = authService.getSessionUser();
  return {
    name: "",
    amount: "",
    expected_close_date: "",
    stage: DEFAULT_DEAL_STAGE,
    probability: String(STAGE_META[DEFAULT_DEAL_STAGE].defaultProbability),
    probabilityTouched: false,
    owner_id: session?.id ?? "",
    ownerLabel: session?.name ?? "",
    account_id: initialAccount?.id ?? "",
    accountLabel: initialAccount?.label ?? "",
    contact_id: initialContact?.id ?? "",
    contactLabel: initialContact?.label ?? "",
    description: "",
  };
}

export default function DealForm({
  mode,
  initialDeal,
  initialAccount,
  initialContact,
  onSubmit,
  onCancel,
}: DealFormProps) {
  const [form, setForm] = useState<FormState>(() =>
    initialDeal ? formFromDeal(initialDeal) : emptyForm(initialAccount, initialContact),
  );
  const { warning, isUnchanged } = useNoChangeGuard(form, mode === "edit");
  const [owners, setOwners] = useState<LeadOwnerOption[]>([]);
  const [error, setError, errorRef] = useFormError();
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    userService
      .getLeadOwners()
      .then(setOwners)
      .catch(() => setOwners([]));
  }, []);

  // A deal that is already Lost keeps that stage visible; moving to Lost
  // needs a reason, so it is done from the board / detail page instead.
  const stageOptions = useMemo(() => {
    const stages: DealStage[] = [...CREATE_STAGES];
    if (initialDeal && !stages.includes(initialDeal.stage)) stages.push(initialDeal.stage);
    return stages.map((stage) => ({
      value: stage,
      label: stage,
      disabled: stage === "Lost" && initialDeal?.stage !== "Lost",
    }));
  }, [initialDeal]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function changeStage(stage: DealStage) {
    setForm((prev) => ({
      ...prev,
      stage,
      probability: prev.probabilityTouched
        ? prev.probability
        : String(STAGE_META[stage]?.defaultProbability ?? prev.probability),
    }));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (isUnchanged()) return;

    if (!form.name.trim()) {
      setError("Deal name is required.");
      return;
    }
    const amount = normalizeAmountInput(form.amount);
    if (!amount) {
      setError("Enter a valid amount in rupees, e.g. 100000 or 2500.50.");
      return;
    }
    if (!form.owner_id) {
      setError("An owner is required.");
      return;
    }
    if (!form.account_id && !form.contact_id) {
      setError("Select an account or a contact for this deal.");
      return;
    }
    const probability = Number(form.probability);
    if (form.probability.trim() === "" || !Number.isInteger(probability) || probability < 0 || probability > 100) {
      setError("Probability must be a whole number between 0 and 100.");
      return;
    }

    const payload: CreateDealPayload = {
      name: form.name.trim(),
      amount,
      stage: form.stage,
      probability,
      owner_id: form.owner_id,
      expected_close_date: form.expected_close_date || null,
      account_id: form.account_id || null,
      contact_id: form.contact_id || null,
      description: form.description.trim() || null,
    };
    // On create, unset optional fields are simply left out; on edit the
    // nulls are how a field gets cleared.
    if (mode === "create") {
      if (!payload.expected_close_date) delete payload.expected_close_date;
      if (!payload.account_id) delete payload.account_id;
      if (!payload.contact_id) delete payload.contact_id;
      if (!payload.description) delete payload.description;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      await onSubmit(payload);
    } catch (err) {
      setError(extractApiError(err, "Couldn't save this deal. Check the fields and try again."));
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 items-center justify-between border-b border-line px-5 py-3 pr-12">
        <h2 id={DEAL_FORM_TITLE_ID} className="font-serif text-xl text-fg">
          {mode === "create" ? "Create Deal" : "Edit Deal"}
        </h2>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
        {warning && <FormWarning message={warning} className="mb-4" />}
        {error && (
          <p
            ref={errorRef as React.RefObject<HTMLParagraphElement>}
            role="alert"
            className="mb-4 animate-shake rounded-md border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger"
          >
            {error}
          </p>
        )}

        <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
          <Field label="Deal Name" required fullWidth>
            <input
              autoFocus
              value={form.name}
              onChange={(event) => update("name", event.target.value)}
              className={inputClass}
              placeholder="Website redesign — Phase 1"
            />
          </Field>

          <Field label="Amount (₹)" required>
            <div className="relative">
              <span aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-ink-soft">
                ₹
              </span>
              <input
                value={form.amount}
                onChange={(event) => update("amount", event.target.value)}
                inputMode="decimal"
                autoComplete="off"
                className={`${inputClass} pl-7`}
                placeholder="1,00,000"
              />
            </div>
          </Field>

          <Field label="Expected Close Date">
            <DateInput
              value={form.expected_close_date}
              onChange={(value) => update("expected_close_date", value)}
              ariaLabel="Expected close date"
            />
          </Field>

          <Field label="Stage">
            <Select
              value={form.stage}
              onChange={(next) => changeStage(next as DealStage)}
              ariaLabel="Stage"
              options={stageOptions}
            />
          </Field>

          <Field label="Probability (%)">
            <input
              type="number"
              min={0}
              max={100}
              step={1}
              value={form.probability}
              onChange={(event) => {
                update("probability", event.target.value);
                update("probabilityTouched", true);
              }}
              className={inputClass}
            />
            <span className="mt-1 block text-xs text-ink-soft">Fills in from the stage; change it if this deal differs.</span>
          </Field>

          <Field label="Owner" required>
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

          <Field label="Account">
            <RecordPicker
              kind="account"
              value={form.account_id}
              label={form.accountLabel}
              placeholder="Select account…"
              ariaLabel="Account"
              onChange={(id, label) => {
                update("account_id", id);
                update("accountLabel", label);
              }}
            />
          </Field>

          <Field label="Contact">
            <RecordPicker
              kind="contact"
              value={form.contact_id}
              label={form.contactLabel}
              placeholder="Select contact…"
              ariaLabel="Contact"
              onChange={(id, label) => {
                update("contact_id", id);
                update("contactLabel", label);
              }}
            />
          </Field>

          <p className="text-xs text-ink-soft sm:col-span-2">Link the deal to an account, a contact, or both — at least one is required.</p>

          <Field label="Description" fullWidth>
            <textarea
              value={form.description}
              onChange={(event) => update("description", event.target.value)}
              className={`${inputClass} min-h-[88px] resize-y`}
            />
          </Field>
        </div>
      </div>

      <div className="flex shrink-0 justify-end gap-3 border-t border-line px-5 py-3">
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
    </form>
  );
}
