/**
 * Picks a readable message out of a DRF-style error body (`{ detail }`,
 * `{ field: ["msg"] }`, or a short plain string) without ever surfacing raw
 * exceptions or HTML error pages. Falls back to `fallback`.
 */
export function extractApiError(error: unknown, fallback: string): string {
  const data = (error as { response?: { data?: unknown } } | null)?.response?.data;
  if (typeof data === "string" && data.length < 200 && !data.includes("<")) return data;
  if (data && typeof data === "object") {
    const record = data as Record<string, unknown>;
    if (typeof record.detail === "string") return record.detail;
    for (const value of Object.values(record)) {
      if (typeof value === "string") return value;
      if (Array.isArray(value) && typeof value[0] === "string") return value[0];
    }
  }
  return fallback;
}
