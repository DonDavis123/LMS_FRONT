"use client";

import { useMemo, useState, type FormEvent } from "react";
import { ChevronDown, ChevronUp, Info, RefreshCw, X } from "lucide-react";
import Select, { type SelectOption } from "@/shared/components/Select";
import Spinner from "@/shared/components/Spinner";
import { extractApiError } from "@/shared/utils/apiError";
import { formatDateTime } from "@/shared/utils/formatDate";
import { usePicklists } from "@/features/picklists/hooks/useLeadPicklists";
import { toSelectOptions } from "@/features/picklists/utils/optionHelpers";
import type { LeadOwnerOption } from "@/features/auth/types/auth.types";
import {
  LEAD_FORM_MAX_ROTATION_OWNERS,
  LEAD_FORM_TITLE_MAX_LENGTH,
  type LeadForm,
  type LeadFormAssignmentMode,
  type UpdateLeadFormPayload,
} from "@/features/leadCapture/types/leadCapture.types";

interface LeadFormSettingsProps {
  form: LeadForm;
  /** Eligible owners (GET /lead-owners/): active Admin / Superadmin users. */
  owners: LeadOwnerOption[];
  isOwnersLoading: boolean;
  ownersError: string | null;
  onRetryOwners: () => void;
  /** Sends the PATCH; resolves with the saved form, rejects with the API error. */
  onSave: (payload: UpdateLeadFormPayload) => Promise<LeadForm>;
}

interface Draft {
  title: string;
  /** "" = not chosen. */
  leadSource: string;
  mode: LeadFormAssignmentMode;
  /** "" = not chosen. */
  singleOwnerId: string;
  /** Ordered: the order is the rotation order. */
  rotationIds: string[];
}

/** The backend's built-in "no value" option; it is shown as "Not selected" here. */
const SYSTEM_NONE = "None";

function normalize(text: string): string {
  return text.split(/\s+/).filter(Boolean).join(" ");
}

function draftFromForm(form: LeadForm): Draft {
  return {
    title: form.title,
    leadSource: form.lead_source ?? "",
    mode: form.assignment_mode,
    singleOwnerId: form.single_owner?.id ?? "",
    rotationIds: form.rotation_owners.map((owner) => owner.id),
  };
}

function sameIds(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((id, index) => id === b[index]);
}

/**
 * Only what changed. When the assignment mode changes, the owner field of the
 * chosen mode is sent too, because the backend requires the owner setup to be
 * complete for the mode as soon as it is touched.
 */
function diff(form: LeadForm, draft: Draft): UpdateLeadFormPayload {
  const payload: UpdateLeadFormPayload = {};

  const title = normalize(draft.title);
  if (title !== form.title) payload.title = title;

  if (draft.leadSource !== (form.lead_source ?? "")) payload.lead_source = draft.leadSource || null;

  const modeChanged = draft.mode !== form.assignment_mode;
  if (modeChanged) payload.assignment_mode = draft.mode;

  if (draft.mode === "SINGLE_OWNER") {
    if (modeChanged || draft.singleOwnerId !== (form.single_owner?.id ?? "")) {
      payload.single_owner_id = draft.singleOwnerId || null;
    }
  } else if (modeChanged || !sameIds(draft.rotationIds, form.rotation_owners.map((owner) => owner.id))) {
    payload.rotation_owner_ids = draft.rotationIds;
  }

  return payload;
}

export default function LeadFormSettings({
  form,
  owners,
  isOwnersLoading,
  ownersError,
  onRetryOwners,
  onSave,
}: LeadFormSettingsProps) {
  const [draft, setDraft] = useState<Draft>(() => draftFromForm(form));
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const picklists = usePicklists("leads");

  const ownersReady = !isOwnersLoading && ownersError === null;
  const eligibleIds = useMemo(() => new Set(owners.map((owner) => owner.id)), [owners]);

  // Names for owners that are no longer in the eligible list (deactivated…).
  const nameOf = useMemo(() => {
    const names = new Map<string, string>();
    if (form.single_owner) names.set(form.single_owner.id, form.single_owner.name);
    for (const owner of form.rotation_owners) names.set(owner.id, owner.name);
    for (const owner of owners) names.set(owner.id, owner.name);
    return (id: string) => names.get(id) ?? "Unknown user";
  }, [form.single_owner, form.rotation_owners, owners]);

  const payload = useMemo(() => diff(form, draft), [form, draft]);
  const isDirty = Object.keys(payload).length > 0;

  /* ── Select options ─────────────────────────────────────────────── */

  const sourceOptions = useMemo<SelectOption[]>(() => {
    const values = picklists.options.lead_source.filter((value) => value !== SYSTEM_NONE);
    // The form's current source stays selectable even if it was hidden since.
    return [{ value: "", label: "Not selected" }, ...toSelectOptions(values, form.lead_source)];
  }, [picklists.options.lead_source, form.lead_source]);

  const singleOwnerOptions = useMemo<SelectOption[]>(() => {
    const options: SelectOption[] = owners.map((owner) => ({
      value: owner.id,
      label: owner.name,
      description: owner.email,
    }));
    const current = form.single_owner;
    if (ownersReady && current && !eligibleIds.has(current.id)) {
      options.unshift({ value: current.id, label: `${current.name} (no longer eligible)`, disabled: true });
    }
    return options;
  }, [owners, form.single_owner, ownersReady, eligibleIds]);

  const addableOwnerOptions = useMemo<SelectOption[]>(
    () =>
      owners
        .filter((owner) => !draft.rotationIds.includes(owner.id))
        .map((owner) => ({ value: owner.id, label: owner.name, description: owner.email })),
    [owners, draft.rotationIds],
  );

  /* ── Draft updates ──────────────────────────────────────────────── */

  function update(changes: Partial<Draft>) {
    setDraft((current) => ({ ...current, ...changes }));
    if (error) setError(null);
  }

  function moveOwner(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= draft.rotationIds.length) return;
    const next = [...draft.rotationIds];
    [next[index], next[target]] = [next[target], next[index]];
    update({ rotationIds: next });
  }

  function removeOwner(id: string) {
    update({ rotationIds: draft.rotationIds.filter((item) => item !== id) });
  }

  function addOwner(id: string) {
    if (!id || draft.rotationIds.includes(id)) return;
    if (draft.rotationIds.length >= LEAD_FORM_MAX_ROTATION_OWNERS) return;
    update({ rotationIds: [...draft.rotationIds, id] });
  }

  /* ── Save ───────────────────────────────────────────────────────── */

  /** Mirrors the backend's rules so obvious mistakes never need a round trip. */
  function validate(): string | null {
    if (payload.title !== undefined) {
      if (!payload.title) return "Title cannot be empty.";
      if (payload.title.length > LEAD_FORM_TITLE_MAX_LENGTH) {
        return `Title cannot be longer than ${LEAD_FORM_TITLE_MAX_LENGTH} characters.`;
      }
    }

    const touchesOwners = "single_owner_id" in payload || "rotation_owner_ids" in payload;
    if (touchesOwners && !ownersReady) {
      return "The list of owners couldn't be loaded. Retry loading it before saving the owner settings.";
    }

    if ("single_owner_id" in payload) {
      if (!payload.single_owner_id) return "Choose the owner who receives the leads.";
      if (!eligibleIds.has(payload.single_owner_id)) {
        return "The selected owner is no longer an active Admin or Superadmin. Choose another owner.";
      }
    }

    if (payload.rotation_owner_ids !== undefined) {
      if (payload.rotation_owner_ids.length === 0) return "Add at least one owner to the rotation.";
      const gone = payload.rotation_owner_ids.filter((id) => !eligibleIds.has(id));
      if (gone.length > 0) {
        return `Remove ${gone.map(nameOf).join(", ")} from the rotation: no longer an active Admin or Superadmin.`;
      }
    }
    return null;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (isSaving || !isDirty) return;

    const problem = validate();
    if (problem) {
      setError(problem);
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      const saved = await onSave(payload);
      setDraft(draftFromForm(saved));
    } catch (saveError) {
      setError(extractApiError(saveError, "Couldn't save the settings. Try again."));
    } finally {
      setIsSaving(false);
    }
  }

  function handleDiscard() {
    setDraft(draftFromForm(form));
    setError(null);
  }

  const inputClass =
    "w-full rounded-md border border-line bg-surface px-3 py-2 text-base text-fg outline-none transition focus:border-slate focus:ring-2 focus:ring-slate-light disabled:opacity-60 sm:text-sm";

  return (
    <section aria-labelledby="lead-form-settings-title" className="lp-card overflow-hidden">
      <div className="border-b border-line px-4 py-3">
        <h2 id="lead-form-settings-title" className="text-base font-semibold text-fg">
          Settings
        </h2>
        <p className="text-sm text-ink-soft">
          Every lead sent through the form gets this lead source and is assigned to one of the owners you choose.
        </p>
      </div>

      <dl className="grid grid-cols-2 gap-px border-b border-line bg-line text-sm">
        <div className="bg-surface px-4 py-3">
          <dt className="text-xs font-medium text-ink-soft">Submissions</dt>
          <dd className="mt-0.5 text-lg font-semibold text-fg">{form.submission_count}</dd>
        </div>
        <div className="bg-surface px-4 py-3">
          <dt className="text-xs font-medium text-ink-soft">Last submission</dt>
          <dd className="mt-0.5 font-medium text-fg">
            {form.last_submission_at ? formatDateTime(form.last_submission_at) : "No submissions yet"}
          </dd>
        </div>
      </dl>

      <form onSubmit={(event) => void handleSubmit(event)} noValidate className="space-y-5 p-4">
        {form.is_active && (
          <p className="flex items-start gap-2 rounded-md border border-line bg-paper/60 px-3 py-2 text-xs text-ink-soft">
            <Info size={14} className="mt-px shrink-0" />
            The form is live. Changes apply to the next submission. To remove the lead source or leave it without an
            eligible owner, block the form first.
          </p>
        )}

        {/* Title */}
        <div>
          <label htmlFor="lead-form-title" className="mb-1.5 block text-sm font-medium text-fg">
            Title
          </label>
          <input
            id="lead-form-title"
            value={draft.title}
            onChange={(event) => update({ title: event.target.value })}
            maxLength={LEAD_FORM_TITLE_MAX_LENGTH}
            disabled={isSaving}
            className={inputClass}
          />
          <p className="mt-1 text-xs text-ink-soft">Shown at the top of the public form.</p>
        </div>

        {/* Lead source */}
        <div>
          <span className="mb-1.5 block text-sm font-medium text-fg">Lead source</span>
          <Select
            value={draft.leadSource}
            options={sourceOptions}
            onChange={(value) => update({ leadSource: value })}
            ariaLabel="Lead source"
            disabled={isSaving || picklists.isLoading}
          />
          <p className="mt-1 text-xs text-ink-soft">
            {picklists.error
              ? "Couldn't load your Lead Source options, so the built-in ones are shown. The server still checks the value you save."
              : "Chosen from your company's Lead Source dropdown options."}
          </p>
        </div>

        {/* Assignment */}
        <fieldset>
          <legend className="mb-1.5 text-sm font-medium text-fg">Assign new leads to</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            <ModeOption
              value="SINGLE_OWNER"
              selected={draft.mode === "SINGLE_OWNER"}
              title="Single owner"
              description="Every lead goes to the same person."
              disabled={isSaving}
              onSelect={() => update({ mode: "SINGLE_OWNER" })}
            />
            <ModeOption
              value="ROTATION"
              selected={draft.mode === "ROTATION"}
              title="Rotation"
              description="Leads go to the owners in turn, in the order below."
              disabled={isSaving}
              onSelect={() => update({ mode: "ROTATION" })}
            />
          </div>
        </fieldset>

        {ownersError && (
          <div className="flex items-center justify-between gap-3 rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">
            <p>{ownersError}</p>
            <button
              type="button"
              onClick={onRetryOwners}
              className="flex shrink-0 items-center gap-1.5 rounded-md border border-danger/30 px-2.5 py-1 text-xs font-semibold transition hover:bg-surface"
            >
              <RefreshCw size={12} />
              Retry
            </button>
          </div>
        )}

        {draft.mode === "SINGLE_OWNER" ? (
          <div>
            <span className="mb-1.5 block text-sm font-medium text-fg">Owner</span>
            <Select
              value={draft.singleOwnerId}
              options={singleOwnerOptions}
              onChange={(value) => update({ singleOwnerId: value })}
              placeholder={isOwnersLoading ? "Loading owners…" : "Select an owner"}
              ariaLabel="Lead owner"
              disabled={isSaving || !ownersReady}
            />
          </div>
        ) : (
          <div>
            <div className="mb-1.5 flex items-baseline justify-between gap-2">
              <span className="text-sm font-medium text-fg">Rotation order</span>
              <span className="text-xs text-ink-soft">
                {draft.rotationIds.length} of {LEAD_FORM_MAX_ROTATION_OWNERS}
              </span>
            </div>

            {draft.rotationIds.length === 0 ? (
              <p className="rounded-md border border-dashed border-line px-3 py-4 text-center text-sm text-ink-soft">
                No owners yet. Add at least one below.
              </p>
            ) : (
              <ol aria-label="Rotation order" className="divide-y divide-line overflow-hidden rounded-md border border-line">
                {draft.rotationIds.map((id, index) => {
                  const gone = ownersReady && !eligibleIds.has(id);
                  const name = nameOf(id);
                  return (
                    <li key={id} className="flex items-center gap-2 bg-surface px-3 py-2">
                      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-paper text-xs font-semibold text-ink-soft">
                        {index + 1}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-sm text-fg">
                        {name}
                        {gone && (
                          <span className="ml-2 rounded-full bg-danger-soft px-2 py-0.5 text-[11px] font-semibold text-danger">
                            No longer eligible
                          </span>
                        )}
                      </span>
                      <div className="flex shrink-0 items-center">
                        <IconButton
                          label={`Move ${name} up`}
                          disabled={isSaving || index === 0}
                          onClick={() => moveOwner(index, -1)}
                        >
                          <ChevronUp size={16} />
                        </IconButton>
                        <IconButton
                          label={`Move ${name} down`}
                          disabled={isSaving || index === draft.rotationIds.length - 1}
                          onClick={() => moveOwner(index, 1)}
                        >
                          <ChevronDown size={16} />
                        </IconButton>
                        <IconButton label={`Remove ${name}`} disabled={isSaving} onClick={() => removeOwner(id)}>
                          <X size={16} />
                        </IconButton>
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}

            <div className="mt-2">
              <Select
                value=""
                options={addableOwnerOptions}
                onChange={addOwner}
                placeholder={
                  isOwnersLoading
                    ? "Loading owners…"
                    : addableOwnerOptions.length === 0
                      ? "All eligible owners are in the rotation"
                      : "Add an owner…"
                }
                ariaLabel="Add an owner to the rotation"
                disabled={
                  isSaving ||
                  !ownersReady ||
                  addableOwnerOptions.length === 0 ||
                  draft.rotationIds.length >= LEAD_FORM_MAX_ROTATION_OWNERS
                }
              />
            </div>
            <p className="mt-1 text-xs text-ink-soft">
              The first lead goes to the first owner, the next to the second, and so on, starting over after the last.
              Changing the order starts the rotation again from the top.
            </p>
          </div>
        )}

        {error && (
          <p role="alert" className="rounded-md border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger">
            {error}
          </p>
        )}

        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line pt-4">
          {isDirty && !isSaving && <span className="mr-auto text-xs text-ink-soft">You have unsaved changes.</span>}
          <button
            type="button"
            onClick={handleDiscard}
            disabled={!isDirty || isSaving}
            className="rounded-md border border-line px-4 py-2 text-sm font-medium text-fg hover:bg-paper disabled:cursor-not-allowed disabled:opacity-60"
          >
            Discard
          </button>
          <button
            type="submit"
            disabled={!isDirty || isSaving}
            className="flex items-center gap-2 rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white transition hover:bg-ink-2 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving && <Spinner size="sm" className="border-white/30 border-t-white" />}
            Save settings
          </button>
        </div>
      </form>
    </section>
  );
}

function ModeOption({
  value,
  selected,
  title,
  description,
  disabled,
  onSelect,
}: {
  value: LeadFormAssignmentMode;
  selected: boolean;
  title: string;
  description: string;
  disabled: boolean;
  onSelect: () => void;
}) {
  return (
    <label
      className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition focus-within:ring-2 focus-within:ring-slate ${
        selected ? "border-slate bg-paper ring-1 ring-slate-light" : "border-line hover:bg-paper"
      } ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
    >
      <input
        type="radio"
        name="lead-form-assignment-mode"
        value={value}
        checked={selected}
        disabled={disabled}
        onChange={onSelect}
        className="mt-1 accent-slate"
      />
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-fg">{title}</span>
        <span className="mt-0.5 block text-xs text-ink-soft">{description}</span>
      </span>
    </label>
  );
}

function IconButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="rounded-md p-1.5 text-ink-soft outline-none transition hover:bg-paper hover:text-fg focus-visible:ring-2 focus-visible:ring-slate disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
    >
      {children}
    </button>
  );
}
