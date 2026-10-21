"use client";

import FormWarning from "@/shared/components/FormWarning";
import { useNoChangeGuard } from "@/shared/hooks/useNoChangeGuard";
import { DateTimeInput } from "@/shared/components/DateInput";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Lock, Play, Square, Timer } from "lucide-react";
import { userService } from "@/features/users/services/userService";
import type { LeadOwnerOption } from "@/features/auth/types/auth.types";
import { authService } from "@/features/auth/services/authService";
import OwnerPicker from "@/shared/components/OwnerPicker";
import RelatedToPicker, { emptyRelatedTo, type RelatedToValue } from "@/shared/components/RelatedToPicker";
import Spinner from "@/shared/components/Spinner";
import { inputClass, Field } from "@/shared/components/FormLayout";
import Select from "@/shared/components/Select";
import { useFormError } from "@/shared/hooks/useFormError";
import { extractApiError } from "@/shared/utils/apiError";
import {
  CALL_FUTURE_TOLERANCE_MS,
  CALL_OUTCOMES,
  CALL_TYPES,
  DEFAULT_CALL_OUTCOME,
  DEFAULT_CALL_TYPE,
  MAX_CALL_DURATION_SECONDS,
  MAX_CALL_NOTES_LENGTH,
  type Call,
  type CallEntryMethod,
  type CallOutcome,
  type CallType,
  type CreateCallPayload,
  type UpdateCallPayload,
} from "@/features/calls/types/call.types";
import { callRecord, formatClock, formatDuration, recordLabel, toLocalInputValue } from "@/features/calls/utils/callFormat";

type CallFormProps =
  | {
      mode: "create";
      /** Pre-selects the lead / contact (and account) the call is being logged for. */
      initialRelated?: RelatedToValue;
      onSubmit: (payload: CreateCallPayload) => Promise<void>;
      onCancel: () => void;
    }
  | {
      mode: "edit";
      initialCall: Call;
      onSubmit: (payload: UpdateCallPayload) => Promise<void>;
      onCancel: () => void;
    };

interface FormState {
  owner_id: string;
  ownerLabel: string;
  call_type: CallType;
  outcome: CallOutcome;
  call_start_time: string; // local "YYYY-MM-DDTHH:mm"
  minutes: string;
  seconds: string;
  description: string;
  entry_method: CallEntryMethod;
  related: RelatedToValue;
}

function emptyForm(related?: RelatedToValue): FormState {
  return {
    owner_id: "",
    ownerLabel: "",
    call_type: DEFAULT_CALL_TYPE,
    outcome: DEFAULT_CALL_OUTCOME,
    call_start_time: toLocalInputValue(new Date()),
    minutes: "",
    seconds: "",
    description: "",
    entry_method: "MANUAL",
    related: related ?? emptyRelatedTo(),
  };
}

function formFromCall(call: Call): FormState {
  const record = callRecord(call);
  return {
    owner_id: call.owner_id,
    ownerLabel: call.owner_name ?? "",
    call_type: call.call_type,
    outcome: call.outcome,
    call_start_time: toLocalInputValue(call.call_start_time),
    minutes: String(Math.floor(call.duration_seconds / 60)),
    seconds: String(call.duration_seconds % 60),
    description: call.description ?? "",
    entry_method: call.entry_method,
    related: {
      personType: record ? (record.type === "LEAD" ? "lead" : "contact") : "",
      personId: record?.id ?? "",
      personLabel: record?.name ?? "",
      accountId: call.account_id ?? "",
      accountLabel: call.account_name ?? "",
    },
  };
}

/** Whole-number text -> integer, or null when blank/invalid. Blank counts as 0. */
function parseWhole(value: string): number | null {
  const text = value.trim();
  if (!text) return 0;
  if (!/^\d+$/.test(text)) return null;
  return Number(text);
}

export default function CallForm(props: CallFormProps) {
  const { mode, onCancel } = props;
  const initialCall = props.mode === "edit" ? props.initialCall : undefined;

  const [form, setForm] = useState<FormState>(() =>
    initialCall ? formFromCall(initialCall) : emptyForm(props.mode === "create" ? props.initialRelated : undefined),
  );
  const { warning, isUnchanged } = useNoChangeGuard(form, mode === "edit");
  const [owners, setOwners] = useState<LeadOwnerOption[]>([]);
  const [error, setError, errorRef] = useFormError();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Call timer (create only): Start -> Stop fills the start time and duration.
  const timerStartRef = useRef<number | null>(null);
  const [timerRunning, setTimerRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (mode !== "create") return;
    userService
      .getLeadOwners()
      .then(setOwners)
      .catch(() => setOwners([]));

    const current = authService.getSessionUser();
    if (current) {
      setForm((prev) => ({ ...prev, owner_id: current.id, ownerLabel: current.name }));
    }
  }, [mode]);

  useEffect(() => {
    if (!timerRunning) return;
    const id = window.setInterval(() => {
      if (timerStartRef.current !== null) setElapsed(Math.floor((Date.now() - timerStartRef.current) / 1000));
    }, 500);
    return () => window.clearInterval(id);
  }, [timerRunning]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function startTimer() {
    const now = Date.now();
    timerStartRef.current = now;
    setElapsed(0);
    setTimerRunning(true);
    setError(null);
    setForm((prev) => ({ ...prev, call_start_time: toLocalInputValue(new Date(now)) }));
  }

  /** Stops the timer and writes the measured duration into the form. Returns the seconds. */
  function stopTimer(): number {
    const startedAt = timerStartRef.current;
    timerStartRef.current = null;
    setTimerRunning(false);
    const seconds = startedAt === null ? 0 : Math.min(MAX_CALL_DURATION_SECONDS, Math.round((Date.now() - startedAt) / 1000));
    setElapsed(seconds);
    setForm((prev) => ({
      ...prev,
      minutes: String(Math.floor(seconds / 60)),
      seconds: String(seconds % 60),
      entry_method: "TIMER",
    }));
    return seconds;
  }

  function setDuration(field: "minutes" | "seconds", value: string) {
    // Typing a duration by hand means it is no longer a timed call.
    setForm((prev) => ({ ...prev, [field]: value, entry_method: "MANUAL" }));
  }

  /** Returns the duration in seconds, or an error message. */
  function readDuration(): { seconds: number } | { error: string } {
    const minutes = parseWhole(form.minutes);
    const seconds = parseWhole(form.seconds);
    if (minutes === null || seconds === null) return { error: "Duration must be whole numbers." };
    if (seconds > 59) return { error: "Seconds must be between 0 and 59." };
    const total = minutes * 60 + seconds;
    if (total > MAX_CALL_DURATION_SECONDS) return { error: "Call duration cannot exceed 24 hours." };
    return { seconds: total };
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (isUnchanged()) return;

    // Stopping the timer on submit: its result is read from the return value,
    // because the form state has not re-rendered yet.
    const timedSeconds = timerRunning ? stopTimer() : null;

    if (mode === "create" && !form.related.personId) {
      setError("Select the lead or contact this call was made with.");
      return;
    }
    if (!form.call_start_time) {
      setError("Call start time is required.");
      return;
    }
    const start = new Date(form.call_start_time);
    if (Number.isNaN(start.getTime())) {
      setError("Call start time is not a valid date.");
      return;
    }
    if (start.getTime() > Date.now() + CALL_FUTURE_TOLERANCE_MS) {
      setError("Call start time cannot be more than 5 minutes in the future.");
      return;
    }

    const duration = timedSeconds !== null ? { seconds: timedSeconds } : readDuration();
    if ("error" in duration) {
      setError(duration.error);
      return;
    }

    const notes = form.description.trim();
    if (notes.length > MAX_CALL_NOTES_LENGTH) {
      setError(`Notes cannot exceed ${MAX_CALL_NOTES_LENGTH} characters.`);
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      if (props.mode === "edit") {
        const original = props.initialCall;
        const originalForm = formFromCall(original);
        const changes: UpdateCallPayload = {};

        // Only send what actually changed: the form's start time is minute-precise,
        // so re-sending an untouched value would log a bogus change.
        if (form.call_start_time !== originalForm.call_start_time) changes.call_start_time = start.toISOString();
        if (duration.seconds !== original.duration_seconds) changes.duration_seconds = duration.seconds;
        if (form.call_type !== original.call_type) changes.call_type = form.call_type;
        if (form.outcome !== original.outcome) changes.outcome = form.outcome;
        if ((notes || null) !== (original.description || null)) changes.description = notes || null;

        await props.onSubmit(changes);
      } else {
        const isLead = form.related.personType === "lead";
        await props.onSubmit({
          owner_id: form.owner_id || null,
          call_type: form.call_type,
          outcome: form.outcome,
          call_start_time: start.toISOString(),
          duration_seconds: duration.seconds,
          description: notes || null,
          entry_method: timedSeconds !== null ? "TIMER" : form.entry_method,
          lead_id: isLead ? form.related.personId : null,
          contact_id: isLead ? null : form.related.personId,
          // The backend only allows an account on a contact call.
          account_id: isLead ? null : form.related.accountId || null,
        });
      }
    } catch (caught) {
      setError(extractApiError(caught, "Couldn't save this call. Check the fields and try again."));
      setIsSubmitting(false);
    }
  }

  const record = initialCall ? callRecord(initialCall) : null;
  const notesLength = form.description.trim().length;

  return (
    <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 items-center justify-between border-b border-line px-5 py-3">
        <h2 className="font-serif text-xl text-fg">{mode === "create" ? "Log a Call" : "Edit Call"}</h2>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
        {warning && <FormWarning message={warning} className="mb-4" />}
        {error && (
          <p
            ref={errorRef as React.RefObject<HTMLParagraphElement>}
            className="mb-4 animate-shake rounded-md border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger"
          >
            {error}
          </p>
        )}

        <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
          {mode === "create" ? (
            <>
              <Field label="Related To" required fullWidth>
                <RelatedToPicker
                  value={form.related}
                  onChange={(related) => update("related", related)}
                  disableAccountForLead
                />
              </Field>

              <Field label="Call Owner" required>
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

              {/* Optional live timer */}
              <div className="sm:self-end">
                <div className="flex items-center justify-between gap-3 rounded-md border border-line bg-paper/40 px-3 py-2">
                  <div className="flex items-center gap-2 text-sm text-fg">
                    <Timer size={16} className={timerRunning ? "text-success" : "text-ink-soft"} />
                    <span className={`font-mono tabular-nums ${timerRunning ? "font-semibold text-success" : "text-ink-soft"}`}>
                      {formatClock(timerRunning ? elapsed : parseTotal(form))}
                    </span>
                  </div>
                  {timerRunning ? (
                    <button
                      type="button"
                      onClick={() => stopTimer()}
                      className="inline-flex items-center gap-1.5 rounded-md bg-danger px-3 py-1.5 text-xs font-semibold text-white transition hover:opacity-90 active:scale-[0.98]"
                    >
                      <Square size={12} /> Stop
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={startTimer}
                      className="inline-flex items-center gap-1.5 rounded-md border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-fg transition hover:bg-paper active:scale-[0.98]"
                    >
                      <Play size={12} /> Start timer
                    </button>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="sm:col-span-2">
              <div className="flex items-start gap-2.5 rounded-md border border-line bg-paper/40 px-3 py-2.5 text-sm">
                <Lock size={15} className="mt-0.5 shrink-0 text-ink-soft" />
                <div className="min-w-0">
                  <p className="font-medium text-fg">
                    {record ? `${recordLabel(record.type)}: ${record.name}` : "—"}
                    {initialCall?.account_name ? <span className="font-normal text-ink-soft"> · {initialCall.account_name}</span> : null}
                  </p>
                  <p className="text-xs text-ink-soft">
                    Owner: {initialCall?.owner_name ?? "—"} · The record and owner can&apos;t be changed once a call is logged.
                  </p>
                </div>
              </div>
            </div>
          )}

          <Field label="Call Type">
            <Select
              value={form.call_type}
              onChange={(next) => update("call_type", next as CallType)}
              ariaLabel="Call type"
              options={CALL_TYPES.map((t) => ({ value: t, label: t }))}
            />
          </Field>

          <Field label="Outcome" required>
            <Select
              value={form.outcome}
              onChange={(next) => update("outcome", next as CallOutcome)}
              ariaLabel="Call outcome"
              options={CALL_OUTCOMES.map((o) => ({ value: o, label: o }))}
            />
          </Field>

          <Field label="Call Start Time" required>
            <DateTimeInput
              value={form.call_start_time}
              onChange={(value) => update("call_start_time", value)}
              ariaLabel="Call start time"
            />
          </Field>

          <div>
            <span className="mb-1.5 block text-sm font-medium text-fg">Duration</span>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  type="number"
                  min={0}
                  max={1440}
                  inputMode="numeric"
                  aria-label="Duration minutes"
                  disabled={timerRunning}
                  value={form.minutes}
                  onChange={(e) => setDuration("minutes", e.target.value)}
                  className={`${inputClass} pr-12 disabled:opacity-60`}
                  placeholder="0"
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-ink-soft">min</span>
              </div>
              <div className="relative flex-1">
                <input
                  type="number"
                  min={0}
                  max={59}
                  inputMode="numeric"
                  aria-label="Duration seconds"
                  disabled={timerRunning}
                  value={form.seconds}
                  onChange={(e) => setDuration("seconds", e.target.value)}
                  className={`${inputClass} pr-12 disabled:opacity-60`}
                  placeholder="0"
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-ink-soft">sec</span>
              </div>
            </div>
          </div>

          <Field label="Call Notes" fullWidth>
            <textarea
              value={form.description}
              onChange={(e) => update("description", e.target.value)}
              maxLength={MAX_CALL_NOTES_LENGTH + 200}
              className={`${inputClass} min-h-[96px] resize-y`}
              placeholder="What was discussed? Agreed next steps, objections, follow-ups…"
            />
            <span className={`mt-1 block text-right text-xs ${notesLength > MAX_CALL_NOTES_LENGTH ? "text-danger" : "text-ink-soft"}`}>
              {notesLength}/{MAX_CALL_NOTES_LENGTH}
            </span>
          </Field>
        </div>
      </div>

      <div className="flex shrink-0 items-center justify-between gap-3 border-t border-line px-5 py-3">
        <span className="hidden text-xs text-ink-soft sm:block">
          {mode === "create" && !timerRunning ? `Duration: ${formatDuration(parseTotal(form))}` : ""}
        </span>
        <div className="ml-auto flex gap-3">
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
            {isSubmitting ? "Saving…" : mode === "create" ? "Log Call" : "Save"}
          </button>
        </div>
      </div>
    </form>
  );
}

/** Current minutes/seconds fields as total seconds (0 when invalid). */
function parseTotal(form: FormState): number {
  const minutes = parseWhole(form.minutes);
  const seconds = parseWhole(form.seconds);
  if (minutes === null || seconds === null) return 0;
  return Math.min(MAX_CALL_DURATION_SECONDS, minutes * 60 + seconds);
}
