"use client";

import { useEffect, useState } from "react";
import { inputClass } from "@/shared/components/FormLayout";
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

  return (
    <>
      <input
        type="text"
        inputMode={kind === "phone" ? "tel" : "email"}
        autoComplete={kind === "phone" ? "tel" : "email"}
        value={value}
        onChange={(e) => {
          setTyped(true);
          onChange(e.target.value);
        }}
        onBlur={() => setBlurred(true)}
        aria-invalid={Boolean(message)}
        className={`${inputClass} ${message ? "border-danger focus:border-danger" : ""}`}
        placeholder={placeholder}
      />
      {message && <p className="mt-1 text-xs text-danger">{message}</p>}
    </>
  );
}
