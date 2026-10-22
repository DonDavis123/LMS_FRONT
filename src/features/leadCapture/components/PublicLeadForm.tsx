"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type MutableRefObject,
  type ReactNode,
  type RefObject,
} from "react";
import { AlertCircle, CheckCircle2, Link2Off, PauseCircle } from "lucide-react";
import Spinner from "@/shared/components/Spinner";
import { inputClass } from "@/shared/components/FormLayout";
import { PublicLeadFormService } from "@/features/leadCapture/services/PublicLeadFormService";
import {
  PUBLIC_LEAD_LIMITS,
  type PublicLeadFormInfo,
} from "@/features/leadCapture/types/publicLeadForm.types";

type Step = "loading" | "invalid" | "closed" | "loadError" | "form" | "review" | "success";
type FieldName = "name" | "email" | "phone" | "description";
type Values = Record<FieldName, string>;
type FieldErrors = Partial<Record<FieldName, string>>;

const FIELDS: FieldName[] = ["name", "email", "phone", "description"];
const EMPTY: Values = { name: "", email: "", phone: "", description: "" };
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[+()\-.\s\d]*\d[+()\-.\s\d]*$/;

const LABELS: Record<FieldName, string> = {
  name: "Name",
  email: "Email",
  phone: "Phone",
  description: "Message",
};

const CLOSED_MESSAGE = "This form is not accepting responses right now.";

function validateField(field: FieldName, raw: string): string | undefined {
  const value = raw.trim();
  const label = LABELS[field];
  if (!value) return `${label} is required.`;
  if (value.length > PUBLIC_LEAD_LIMITS[field]) {
    return `${label} must be ${PUBLIC_LEAD_LIMITS[field]} characters or fewer.`;
  }
  if (field === "email" && !EMAIL_RE.test(value)) return "Enter a valid email address.";
  if (field === "phone" && !PHONE_RE.test(value)) return "Enter a valid phone number.";
  return undefined;
}

function validateAll(values: Values): FieldErrors {
  const errors: FieldErrors = {};
  for (const field of FIELDS) {
    const message = validateField(field, values[field]);
    if (message) errors[field] = message;
  }
  return errors;
}

function statusOf(error: unknown): number | undefined {
  return (error as { response?: { status?: number } } | null)?.response?.status;
}

/** Pulls `{ field: ["msg"] }` entries for the four visible fields out of a 400 body. */
function serverFieldErrors(error: unknown): FieldErrors {
  const data = (error as { response?: { data?: unknown } } | null)?.response?.data;
  const result: FieldErrors = {};
  if (!data || typeof data !== "object") return result;
  const record = data as Record<string, unknown>;
  for (const field of FIELDS) {
    const value = record[field];
    const message = Array.isArray(value) ? value[0] : value;
    if (typeof message === "string" && message.length < 200) result[field] = message;
  }
  return result;
}

export default function PublicLeadForm({ token }: { token: string }) {
  const [step, setStep] = useState<Step>("loading");
  const [info, setInfo] = useState<PublicLeadFormInfo | null>(null);
  const [values, setValues] = useState<Values>(EMPTY);
  const [fax, setFax] = useState(""); // hidden trap field — always sent, normally empty
  const [errors, setErrors] = useState<FieldErrors>({});
  const [touched, setTouched] = useState<Partial<Record<FieldName, boolean>>>({});
  const [banner, setBanner] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const headingRef = useRef<HTMLHeadingElement>(null);
  const fieldRefs = useRef<Partial<Record<FieldName, HTMLInputElement | HTMLTextAreaElement | null>>>({});
  const submitLock = useRef(false);
  // Which field to focus after the next render (set when returning to the form with errors).
  const focusField = useRef<FieldName | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await PublicLeadFormService.getForm(token);
      setInfo(data);
      setStep(data.accepting_responses ? "form" : "closed");
    } catch (error) {
      const status = statusOf(error);
      if (status === 404) setStep("invalid");
      else if (status === 410) setStep("closed");
      else setStep("loadError");
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  // Move focus when the step changes: first invalid field if there is one, else the heading.
  useEffect(() => {
    if (step === "loading") return;
    const target = focusField.current;
    focusField.current = null;
    if (target && fieldRefs.current[target]) fieldRefs.current[target]?.focus();
    else headingRef.current?.focus();
  }, [step]);

  function setValue(field: FieldName, value: string) {
    setValues((prev) => ({ ...prev, [field]: value }));
    // Re-validate live once the user has already seen an error for this field.
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: validateField(field, value) }));
  }

  function blurField(field: FieldName) {
    setTouched((prev) => ({ ...prev, [field]: true }));
    setErrors((prev) => ({ ...prev, [field]: validateField(field, values[field]) }));
  }

  function handleContinue(event: FormEvent) {
    event.preventDefault();
    const found = validateAll(values);
    setErrors(found);
    setTouched({ name: true, email: true, phone: true, description: true });
    const first = FIELDS.find((f) => found[f]);
    if (first) {
      fieldRefs.current[first]?.focus();
      return;
    }
    setBanner(null);
    setStep("review");
  }

  async function handleSubmit() {
    if (submitLock.current) return;
    submitLock.current = true;
    setSubmitting(true);
    setBanner(null);
    try {
      await PublicLeadFormService.submit(token, {
        name: values.name.trim(),
        email: values.email.trim(),
        phone: values.phone.trim(),
        description: values.description.trim(),
        fax_number: fax,
      });
      setStep("success");
    } catch (error) {
      const status = statusOf(error);
      if (status === 410) {
        setStep("closed");
      } else if (status === 404) {
        setStep("invalid");
      } else if (status === 429) {
        setBanner("Too many attempts, please try again later.");
      } else if (status === 400) {
        const fieldErrors = serverFieldErrors(error);
        const first = FIELDS.find((f) => fieldErrors[f]);
        setErrors(fieldErrors);
        setTouched({ name: true, email: true, phone: true, description: true });
        setBanner(
          first
            ? "Please fix the highlighted fields and try again."
            : "We couldn't accept those details. Please check them and try again.",
        );
        focusField.current = first ?? null;
        setStep("form");
      } else {
        setBanner("Something went wrong sending your details. Please try again.");
      }
    } finally {
      submitLock.current = false;
      setSubmitting(false);
    }
  }

  function resetAll() {
    setValues(EMPTY);
    setFax("");
    setErrors({});
    setTouched({});
    setBanner(null);
    setStep("form");
  }

  const heading = info?.company_name || info?.title || "Get in touch";
  const subheading = info?.company_name && info.title ? info.title : null;

  return (
    <div className="lp-page-bg min-h-dvh bg-paper text-fg">
      <main className="mx-auto flex min-h-dvh w-full max-w-lg items-start justify-center px-4 py-8 sm:items-center sm:py-12">
        <div className="animate-fade-in-up w-full rounded-2xl border border-line bg-surface p-5 shadow-[var(--lp-shadow)] sm:p-8">
          {step === "loading" && (
            <div className="flex flex-col items-center gap-3 py-12" aria-live="polite">
              <Spinner size="md" />
              <p className="text-sm text-ink-soft">Loading form…</p>
            </div>
          )}

          {step === "invalid" && (
            <Notice
              icon={<Link2Off className="h-6 w-6" aria-hidden />}
              title="This link isn't valid"
              headingRef={headingRef}
            >
              Please check the link or scan the QR code again.
            </Notice>
          )}

          {step === "closed" && (
            <Notice
              icon={<PauseCircle className="h-6 w-6" aria-hidden />}
              title={CLOSED_MESSAGE}
              headingRef={headingRef}
            >
              Please check back later.
            </Notice>
          )}

          {step === "loadError" && (
            <Notice
              icon={<AlertCircle className="h-6 w-6" aria-hidden />}
              title="We couldn't load this form"
              headingRef={headingRef}
            >
              <span className="block">Check your connection and try again.</span>
              <button
                type="button"
                onClick={() => {
                  setStep("loading");
                  void load();
                }}
                className="mt-4 rounded-md bg-ink px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-ink-2 active:scale-[0.98]"
              >
                Try again
              </button>
            </Notice>
          )}

          {step === "form" && (
            <form onSubmit={handleContinue} noValidate>
              <Header heading={heading} subheading={subheading} headingRef={headingRef} hint="Step 1 of 2 · Your details" />

              {banner && <Banner message={banner} />}

              <div className="mt-6 space-y-4">
                <TextField
                  field="name"
                  label="Name"
                  autoComplete="name"
                  values={values}
                  errors={errors}
                  touched={touched}
                  fieldRefs={fieldRefs}
                  onChange={setValue}
                  onBlur={blurField}
                />
                <TextField
                  field="email"
                  label="Email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  values={values}
                  errors={errors}
                  touched={touched}
                  fieldRefs={fieldRefs}
                  onChange={setValue}
                  onBlur={blurField}
                />
                <TextField
                  field="phone"
                  label="Phone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  values={values}
                  errors={errors}
                  touched={touched}
                  fieldRefs={fieldRefs}
                  onChange={setValue}
                  onBlur={blurField}
                />
                <TextField
                  field="description"
                  label="Message"
                  multiline
                  values={values}
                  errors={errors}
                  touched={touched}
                  fieldRefs={fieldRefs}
                  onChange={setValue}
                  onBlur={blurField}
                />
              </div>

              {/* Trap field: invisible and unreachable for people, filled in by simple bots. */}
              <div
                aria-hidden="true"
                style={{ position: "absolute", left: "-10000px", top: "auto", width: 1, height: 1, overflow: "hidden" }}
              >
                <label>
                  Fax
                  <input
                    type="text"
                    name="fax_number"
                    value={fax}
                    onChange={(e) => setFax(e.target.value)}
                    tabIndex={-1}
                    autoComplete="off"
                  />
                </label>
              </div>

              <button
                type="submit"
                className="mt-6 w-full rounded-md bg-ink px-4 py-3 text-sm font-semibold text-white transition hover:bg-ink-2 active:scale-[0.98]"
              >
                Continue
              </button>
            </form>
          )}

          {step === "review" && (
            <div>
              <Header
                heading="Review your details"
                subheading="Make sure everything is correct before sending."
                headingRef={headingRef}
                hint="Step 2 of 2 · Review"
              />

              {banner && <Banner message={banner} />}

              <dl className="mt-6 divide-y divide-line rounded-xl border border-line">
                {FIELDS.map((field) => (
                  <div key={field} className="px-4 py-3">
                    <dt className="text-xs font-semibold uppercase tracking-wide text-ink-soft">{LABELS[field]}</dt>
                    <dd className="mt-1 whitespace-pre-wrap break-words text-sm text-fg">{values[field].trim()}</dd>
                  </div>
                ))}
              </dl>

              <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setBanner(null);
                    setStep("form");
                  }}
                  disabled={submitting}
                  className="rounded-md border border-line px-4 py-3 text-sm font-medium text-fg hover:bg-paper disabled:opacity-60 sm:py-2.5"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => void handleSubmit()}
                  disabled={submitting}
                  aria-busy={submitting}
                  className="flex items-center justify-center gap-2 rounded-md bg-ink px-5 py-3 text-sm font-semibold text-white transition hover:bg-ink-2 active:scale-[0.98] disabled:opacity-60 sm:py-2.5"
                >
                  {submitting && <Spinner size="sm" className="border-white/30 border-t-white" />}
                  {submitting ? "Submitting…" : "Submit"}
                </button>
              </div>
            </div>
          )}

          {step === "success" && (
            <div className="flex flex-col items-center py-6 text-center">
              <span className="animate-pop-in flex h-14 w-14 items-center justify-center rounded-full bg-success-soft text-success">
                <CheckCircle2 className="h-8 w-8" aria-hidden />
              </span>
              <h1
                ref={headingRef}
                tabIndex={-1}
                className="mt-5 font-serif text-2xl font-medium text-fg outline-none"
              >
                Thank you!
              </h1>
              <p className="mt-2 text-sm text-ink-soft">
                We&apos;ve received your details{info?.company_name ? ` and ${info.company_name} will` : " and will"} be in
                touch soon.
              </p>
              <button
                type="button"
                onClick={resetAll}
                className="mt-6 text-sm font-medium text-slate underline-offset-4 hover:underline"
              >
                Submit another response
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function Header({
  heading,
  subheading,
  hint,
  headingRef,
}: {
  heading: string;
  subheading: string | null;
  hint: string;
  headingRef: RefObject<HTMLHeadingElement | null>;
}) {
  return (
    <header>
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">{hint}</p>
      <h1 ref={headingRef} tabIndex={-1} className="mt-2 font-serif text-2xl font-medium text-fg outline-none sm:text-3xl">
        {heading}
      </h1>
      {subheading && <p className="mt-1.5 text-sm text-ink-soft">{subheading}</p>}
    </header>
  );
}

function Notice({
  icon,
  title,
  children,
  headingRef,
}: {
  icon: ReactNode;
  title: string;
  children: ReactNode;
  headingRef: RefObject<HTMLHeadingElement | null>;
}) {
  return (
    <div className="flex flex-col items-center py-8 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-light text-slate">{icon}</span>
      <h1 ref={headingRef} tabIndex={-1} className="mt-4 font-serif text-xl font-medium text-fg outline-none">
        {title}
      </h1>
      <div className="mt-2 text-sm text-ink-soft">{children}</div>
    </div>
  );
}

function Banner({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="mt-5 flex items-start gap-2 rounded-md bg-danger-soft px-3 py-2.5 text-sm text-danger"
    >
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <span>{message}</span>
    </div>
  );
}

interface TextFieldProps {
  field: FieldName;
  label: string;
  type?: "text" | "email" | "tel";
  inputMode?: "email" | "tel";
  autoComplete?: string;
  multiline?: boolean;
  values: Values;
  errors: FieldErrors;
  touched: Partial<Record<FieldName, boolean>>;
  fieldRefs: MutableRefObject<Partial<Record<FieldName, HTMLInputElement | HTMLTextAreaElement | null>>>;
  onChange: (field: FieldName, value: string) => void;
  onBlur: (field: FieldName) => void;
}

function TextField({
  field,
  label,
  type = "text",
  inputMode,
  autoComplete,
  multiline = false,
  values,
  errors,
  touched,
  fieldRefs,
  onChange,
  onBlur,
}: TextFieldProps) {
  const id = `lead-${field}`;
  const error = touched[field] || errors[field] ? errors[field] : undefined;
  const max = PUBLIC_LEAD_LIMITS[field];
  const common = {
    id,
    name: field,
    value: values[field],
    maxLength: max,
    required: true,
    "aria-required": true as const,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": error ? `${id}-error` : undefined,
    onChange: (e: { target: { value: string } }) => onChange(field, e.target.value),
    onBlur: () => onBlur(field),
    className: `${inputClass} ${error ? "border-danger focus:border-danger" : ""}`,
  };

  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-fg">
        {label}
        <span className="text-danger" aria-hidden="true"> *</span>
      </label>
      {multiline ? (
        <textarea
          {...common}
          ref={(el) => {
            fieldRefs.current[field] = el;
          }}
          rows={5}
          className={`${common.className} resize-y`}
        />
      ) : (
        <input
          {...common}
          ref={(el) => {
            fieldRefs.current[field] = el;
          }}
          type={type}
          inputMode={inputMode}
          autoComplete={autoComplete}
        />
      )}
      <div className="mt-1 flex items-start justify-between gap-3">
        <p id={`${id}-error`} className="min-h-4 text-xs text-danger" aria-live="polite">
          {error}
        </p>
        {multiline && (
          <span className="shrink-0 text-xs text-ink-soft">
            {values[field].length}/{max}
          </span>
        )}
      </div>
    </div>
  );
}
