/**
 * Helpers for "return to where I came from" navigation.
 *
 * A page that links to a record (e.g. the lead conversion screen linking to an
 * existing Account/Contact) appends `?returnTo=<path>`. The record's detail page
 * then uses that path for its back link instead of the default list page.
 */

export const RETURN_TO_PARAM = "returnTo";

/** Only same-app dashboard paths are accepted, to avoid open redirects. */
export function getSafeReturnTo(value: string | null | undefined): string | null {
  if (!value) return null;
  if (!value.startsWith("/dashboard/") || value.startsWith("//") || value.includes("\\")) return null;
  return value;
}

/** Appends `returnTo` to a href (keeps any existing query string). */
export function withReturnTo(href: string, returnTo: string | null | undefined): string {
  if (!returnTo) return href;
  const sep = href.includes("?") ? "&" : "?";
  return `${href}${sep}${RETURN_TO_PARAM}=${encodeURIComponent(returnTo)}`;
}
