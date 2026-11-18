/**
 * The one place amounts are parsed and formatted. Amounts arrive from the API
 * as strings (`"100000.00"`); the server also sends every total, so the UI
 * only ever *displays* money. The few optimistic-update helpers below use
 * integer paise, never float rupees.
 */

const inrFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const DECIMAL = /^-?\d+(\.\d+)?$/;

/** Whole-rupee display, e.g. `"100000.00"` → `₹1,00,000`. Unparseable → `—`. */
export function formatCurrency(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  const text = String(value).trim();
  if (!DECIMAL.test(text)) return "—";
  return inrFormatter.format(Number(text));
}

/**
 * Turns what a user typed into the API's decimal string (`"1,00,000.5"` →
 * `"100000.50"`). Returns `null` for anything that is not a non-negative
 * amount with at most two decimals.
 */
export function normalizeAmountInput(raw: string): string | null {
  const cleaned = raw.replace(/[₹,\s]/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  const [whole, fraction = ""] = cleaned.split(".");
  const integer = whole.replace(/^0+(?=\d)/, "");
  if (integer.length > 13) return null;
  return `${integer}.${fraction.padEnd(2, "0")}`;
}

/** `"100000.00"` → 10000000 paise (exact: digits are split, never multiplied as floats). */
export function amountToPaise(value: string): number {
  const text = value.trim();
  if (!DECIMAL.test(text)) return 0;
  const negative = text.startsWith("-");
  const [whole, fraction = ""] = text.replace("-", "").split(".");
  const paise = Number(whole) * 100 + Number(fraction.padEnd(2, "0").slice(0, 2));
  return negative ? -paise : paise;
}

/** 10000000 paise → `"100000.00"`. */
export function paiseToAmount(paise: number): string {
  const negative = paise < 0;
  const abs = Math.abs(Math.round(paise));
  const whole = Math.floor(abs / 100);
  const fraction = String(abs % 100).padStart(2, "0");
  return `${negative ? "-" : ""}${whole}.${fraction}`;
}
