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

/**
 * Compact "time ago" label (e.g. "5 minutes ago", "just now") for
 * notification-style feeds. Falls back to a locale date string once the
 * gap is large enough that a relative label stops being useful.
 */
export function formatRelativeTime(value?: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  const diffMs = Date.now() - date.getTime();
  const diffSeconds = Math.round(diffMs / 1000);

  if (diffSeconds < 5) return "just now";
  if (diffSeconds < 60) return `${diffSeconds} seconds ago`;

  const diffMinutes = Math.round(diffSeconds / 60);
  if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes === 1 ? "" : "s"} ago`;

  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;

  const diffDays = Math.round(diffHours / 24);
  if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;

  return date.toLocaleDateString();
}
