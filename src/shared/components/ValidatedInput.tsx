"use client";

import { useState } from "react";
import { inputClass } from "@/shared/components/FormLayout";
import {
  validateContactField,
  type ContactFieldKind,
} from "@/shared/utils/contactFieldRules";

interface ValidatedInputProps {
  kind: ContactFieldKind;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  placeholder?: string;
  /** Force the error to show (e.g. after a failed submit attempt). */
  showError?: boolean;
}

/**
 * Phone / email input that validates while the user types.
 * A format error appears as soon as something invalid is typed; the
 * "required" error appears after the field is left or a submit is attempted.
 */
export default function ValidatedInput({
  kind,
  value,
  onChange,
  required = false,
  placeholder,
  showError = false,
}: ValidatedInputProps) {
  const [typed, setTyped] = useState(false);
  const [blurred, setBlurred] = useState(false);

  const error = validateContactField(kind, value, required);
  const visible = Boolean(error) && (showError || blurred || (typed && value.trim() !== ""));

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
        aria-invalid={visible}
        className={`${inputClass} ${visible ? "border-danger focus:border-danger" : ""}`}
        placeholder={placeholder}
      />
      {visible && <p className="mt-1 text-xs text-danger">{error}</p>}
    </>
  );
}
