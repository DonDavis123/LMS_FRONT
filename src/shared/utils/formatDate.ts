/**
 * Formats an ISO date string using the browser's locale, falling back to
 * the raw value if it isn't parseable. Extracted from identical private
 * `formatDate` copies in LeadDetail / ContactDetail / AccountDetail.
 */
export function formatDateTime(value?: string | null): string {
  if (!value) return "";
  try {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
  } catch {
    return value;
  }
}
