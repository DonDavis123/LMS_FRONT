/**
 * Country dial codes for phone inputs. A phone is stored as ONE string,
 * `+<dial code><national digits>` (e.g. `+919876543210`), so no backend
 * field changes are needed.
 */

export interface Country {
  iso: string;
  name: string;
  dial: string; // digits only, no "+"
}

export const DEFAULT_COUNTRY_ISO = "IN";

export const COUNTRIES: readonly Country[] = [
  { iso: "IN", name: "India", dial: "91" },
  { iso: "US", name: "United States", dial: "1" },
  { iso: "CA", name: "Canada", dial: "1" },
  { iso: "GB", name: "United Kingdom", dial: "44" },
  { iso: "AE", name: "United Arab Emirates", dial: "971" },
  { iso: "SA", name: "Saudi Arabia", dial: "966" },
  { iso: "QA", name: "Qatar", dial: "974" },
  { iso: "KW", name: "Kuwait", dial: "965" },
  { iso: "OM", name: "Oman", dial: "968" },
  { iso: "BH", name: "Bahrain", dial: "973" },
  { iso: "SG", name: "Singapore", dial: "65" },
  { iso: "MY", name: "Malaysia", dial: "60" },
  { iso: "AU", name: "Australia", dial: "61" },
  { iso: "NZ", name: "New Zealand", dial: "64" },
  { iso: "DE", name: "Germany", dial: "49" },
  { iso: "FR", name: "France", dial: "33" },
  { iso: "IT", name: "Italy", dial: "39" },
  { iso: "ES", name: "Spain", dial: "34" },
  { iso: "NL", name: "Netherlands", dial: "31" },
  { iso: "CH", name: "Switzerland", dial: "41" },
  { iso: "IE", name: "Ireland", dial: "353" },
  { iso: "SE", name: "Sweden", dial: "46" },
  { iso: "RU", name: "Russia", dial: "7" },
  { iso: "CN", name: "China", dial: "86" },
  { iso: "JP", name: "Japan", dial: "81" },
  { iso: "KR", name: "South Korea", dial: "82" },
  { iso: "HK", name: "Hong Kong", dial: "852" },
  { iso: "TH", name: "Thailand", dial: "66" },
  { iso: "ID", name: "Indonesia", dial: "62" },
  { iso: "PH", name: "Philippines", dial: "63" },
  { iso: "VN", name: "Vietnam", dial: "84" },
  { iso: "PK", name: "Pakistan", dial: "92" },
  { iso: "BD", name: "Bangladesh", dial: "880" },
  { iso: "LK", name: "Sri Lanka", dial: "94" },
  { iso: "NP", name: "Nepal", dial: "977" },
  { iso: "ZA", name: "South Africa", dial: "27" },
  { iso: "NG", name: "Nigeria", dial: "234" },
  { iso: "KE", name: "Kenya", dial: "254" },
  { iso: "EG", name: "Egypt", dial: "20" },
  { iso: "TR", name: "Turkey", dial: "90" },
  { iso: "BR", name: "Brazil", dial: "55" },
  { iso: "MX", name: "Mexico", dial: "52" },
  { iso: "AR", name: "Argentina", dial: "54" },
];

export const DEFAULT_COUNTRY: Country =
  COUNTRIES.find((c) => c.iso === DEFAULT_COUNTRY_ISO) ?? COUNTRIES[0];

// Longest dial code first, so "+971" is not read as "+9".
const BY_DIAL_LENGTH = [...COUNTRIES].sort((a, b) => b.dial.length - a.dial.length);

export function findCountry(iso: string): Country {
  return COUNTRIES.find((c) => c.iso === iso) ?? DEFAULT_COUNTRY;
}

/**
 * Splits a stored phone into country + national digits.
 * A value with no leading "+" (older data) is shown under the default
 * country (India) and left exactly as it was until the user edits it.
 */
export function splitPhone(value: string, preferredIso?: string): { country: Country; national: string } {
  const text = value.trim();
  if (text.startsWith("+")) {
    const digits = text.replace(/\D/g, "");
    const match = BY_DIAL_LENGTH.find((c) => digits.startsWith(c.dial));
    if (match) {
      // Keep the chosen country when it shares the dial code (US / CA).
      const preferred = preferredIso ? COUNTRIES.find((c) => c.iso === preferredIso) : undefined;
      const country = preferred && preferred.dial === match.dial ? preferred : match;
      return { country, national: digits.slice(match.dial.length) };
    }
    return { country: DEFAULT_COUNTRY, national: digits };
  }
  return { country: DEFAULT_COUNTRY, national: text.replace(/[^\d]/g, "") };
}

/** `+<dial><digits>`; an empty national number gives an empty string. */
export function joinPhone(country: Country, nationalInput: string): string {
  const national = nationalInput.replace(/\D/g, "");
  return national ? `+${country.dial}${national}` : "";
}
