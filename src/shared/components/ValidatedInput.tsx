"use client";

import { useEffect, useState } from "react";
import { AlertCircle } from "lucide-react";
import CountryCodePicker from "@/shared/components/CountryCodePicker";
import { inputClass, inputErrorClass } from "@/shared/components/FormLayout";
import {
  DEFAULT_COUNTRY_ISO,
  findCountry,
  joinPhone,
  splitPhone,
} from "@/shared/utils/countryCodes";
import {
  fieldValidationService,
  type RecordType,
} from "@/shared/services/fieldValidationService";
import {
  validateContactField,
  type ContactFieldKind,
} from "@/shared/utils/contactFieldRules";

interface DuplicateCheck {
  /** The record being edited (omit on create). */
  excludeType?: RecordType;
  excludeId?: string;
  /** The saved value; it is not re-checked while unchanged. */
  originalValue?: string;
}

interface ValidatedInputProps {
  kind: ContactFieldKind;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  placeholder?: string;
  /** Force the error to show (e.g. after a failed submit attempt). */
  showError?: boolean;
  /** Also check, while typing, that no lead / contact / account uses the value. */
  duplicateCheck?: DuplicateCheck;
}

const DEBOUNCE_MS = 450;

/**
 * Phone / email input that validates while the user types.
 * A format error appears as soon as something invalid is typed; the
 * "required" error appears after the field is left or a submit is attempted.
 * Phone numbers get a country-code picker (India by default); the value is
 * still one string, `+<code><number>`.
 * With `duplicateCheck`, a valid value is also checked against all leads,
 * contacts and accounts (debounced).
 */
export default function ValidatedInput({
  kind,
  value,
  onChange,
  required = false,
  placeholder,
  showError = false,
  duplicateCheck,
}: ValidatedInputProps) {
  const [typed, setTyped] = useState(false);
  const [blurred, setBlurred] = useState(false);
  const [duplicateMessage, setDuplicateMessage] = useState<string | null>(null);
  // The chosen country, kept even while the number is empty (and for US / CA,
  // which share a dial code).
  const [iso, setIso] = useState(() => splitPhone(value).country.iso || DEFAULT_COUNTRY_ISO);

  const formatError = validateContactField(kind, value, required);
  const formatVisible =
    Boolean(formatError) && (showError || blurred || (typed && value.trim() !== ""));

  const trimmed = value.trim();
  const enabled = Boolean(duplicateCheck);
  const unchanged = trimmed === (duplicateCheck?.originalValue ?? "").trim();
  const excludeType = duplicateCheck?.excludeType;
  const excludeId = duplicateCheck?.excludeId;

  useEffect(() => {
    if (!enabled || !typed || formatError || !trimmed || unchanged) {
      setDuplicateMessage(null);
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      fieldValidationService
        .check(
          kind,
          trimmed,
          excludeType && excludeId ? { type: excludeType, id: excludeId } : undefined,
          controller.signal
        )
        .then((result) => setDuplicateMessage(result.duplicate ? result.message : null))
        .catch(() => {
          // A failed check never blocks typing; the server re-checks on save.
        });
    }, DEBOUNCE_MS);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [enabled, typed, formatError, trimmed, unchanged, kind, excludeType, excludeId]);

  const message = formatVisible ? formatError : duplicateMessage;
  const inputStateClass = message ? inputErrorClass : "";

  if (kind === "phone") {
    const parsed = splitPhone(value, iso);
    const country = value.trim() ? parsed.country : findCountry(iso);

    function changeCountry(nextIso: string) {
      setIso(nextIso);
      setTyped(true);
      onChange(joinPhone(findCountry(nextIso), parsed.national));
    }

    function changeNumber(raw: string) {
      setTyped(true);
      // A pasted "+44 7700 900123" switches the country automatically.
      if (raw.trim().startsWith("+")) {
        const pasted = splitPhone(raw, iso);
        setIso(pasted.country.iso);
        onChange(joinPhone(pasted.country, pasted.national));
        return;
      }
      onChange(joinPhone(country, raw));
    }

    return (
      <>
        <div className="flex gap-2">
          <CountryCodePicker country={country} onChange={changeCountry} stateClass={inputStateClass} />
          <input
            type="text"
            inputMode="tel"
            autoComplete="tel-national"
            value={parsed.national}
            onChange={(e) => changeNumber(e.target.value)}
            onBlur={() => setBlurred(true)}
            aria-invalid={Boolean(message)}
            className={`${inputClass} min-w-0 flex-1 ${inputStateClass}`}
            placeholder={placeholder?.replace(/^\+\d+/, "") || "98765 43210"}
          />
        </div>
        {message && <FieldMessage message={message} />}
      </>
    );
  }

  return (
    <>
      <input
        type="text"
        inputMode="email"
        autoComplete="email"
        value={value}
        onChange={(e) => {
          setTyped(true);
          onChange(e.target.value);
        }}
        onBlur={() => setBlurred(true)}
        aria-invalid={Boolean(message)}
        className={`${inputClass} ${inputStateClass}`}
        placeholder={placeholder}
      />
      {message && <FieldMessage message={message} />}
    </>
  );
}

function FieldMessage({ message }: { message: string }) {
  return (
    <p role="alert" className="mt-1.5 flex items-start gap-1.5 text-xs font-medium text-danger">
      <AlertCircle size={13} className="mt-px shrink-0" aria-hidden="true" />
      <span>{message}</span>
    </p>
  );
}
