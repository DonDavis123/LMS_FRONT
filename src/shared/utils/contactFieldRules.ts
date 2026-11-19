/**
 * Phone / email format rules. Mirrors the backend rules in
 * `shared/application/services/contact_field_rules.py` so the form can show
 * the same message while the user types. The backend stays the source of
 * truth and re-checks on save.
 */

export type ContactFieldKind = "phone" | "email";

const PHONE_MIN_DIGITS = 7;
const PHONE_MAX_DIGITS = 15;
const PHONE_MAX_LENGTH = 20;
const EMAIL_MAX_LENGTH = 254;

export const PHONE_REQUIRED_MESSAGE = "Phone number is required.";
const PHONE_INVALID_MESSAGE = "Enter a valid phone number (7 to 15 digits, optional leading +).";
const PHONE_CHARS_MESSAGE = "Phone number can only contain digits, spaces, + ( ) - and .";
const EMAIL_INVALID_MESSAGE = "Enter a valid email address.";

const INDIA_INVALID_MESSAGE = "Indian numbers (+91) must have exactly 10 digits.";

const PHONE_ALLOWED = /^\+?[\d\s().-]+$/;
const EMAIL_RE =
  /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$/;

/** Returns an error message, or `null` when valid. Empty is valid unless `required`. */
export function validatePhone(value: string, required = false): string | null {
  const text = value.trim();
  if (!text) return required ? PHONE_REQUIRED_MESSAGE : null;
  if (text.length > PHONE_MAX_LENGTH) return PHONE_INVALID_MESSAGE;
  if (!PHONE_ALLOWED.test(text) || text.slice(1).includes("+")) return PHONE_CHARS_MESSAGE;
  const digits = (text.match(/\d/g) ?? []).length;
  if (digits < PHONE_MIN_DIGITS || digits > PHONE_MAX_DIGITS) return PHONE_INVALID_MESSAGE;
  // India (+91): the number after the country code is always 10 digits.
  if (text.replace(/[\s().-]/g, "").startsWith("+91") && digits !== 12) return INDIA_INVALID_MESSAGE;
  return null;
}

/** Returns an error message, or `null` when valid. Empty is valid unless `required`. */
export function validateEmail(value: string, required = false): string | null {
  const text = value.trim();
  if (!text) return required ? "Email is required." : null;
  if (text.length > EMAIL_MAX_LENGTH || text.includes("..")) return EMAIL_INVALID_MESSAGE;
  const local = text.split("@")[0];
  if (local.startsWith(".") || local.endsWith(".")) return EMAIL_INVALID_MESSAGE;
  if (!EMAIL_RE.test(text)) return EMAIL_INVALID_MESSAGE;
  return null;
}

export function validateContactField(
  kind: ContactFieldKind,
  value: string,
  required = false
): string | null {
  return kind === "phone" ? validatePhone(value, required) : validateEmail(value, required);
}

/** First error among `[kind, value, required]` checks, or `null` when all pass. */
export function firstContactFieldError(
  checks: ReadonlyArray<readonly [ContactFieldKind, string, boolean?]>
): string | null {
  for (const [kind, value, required] of checks) {
    const message = validateContactField(kind, value, required ?? false);
    if (message) return message;
  }
  return null;
}
