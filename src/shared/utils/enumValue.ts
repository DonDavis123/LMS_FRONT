/**
 * Normalises an enum-like value coming from the backend.
 *
 * The API documents plain values (`"ADMIN"`), but Python `(str, Enum)` members
 * that pass through a DRF `CharField` are rendered with `str()` and arrive as
 * `"UserRole.ADMIN"` / `"UserAuditAction.USER_BLOCKED"`. Both shapes are
 * accepted here and reduced to the bare, upper-cased value so the rest of the
 * UI can compare against `"ADMIN"` without caring which one the server sent.
 */
export function normalizeEnumValue(value: unknown): string {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  const lastDot = trimmed.lastIndexOf(".");
  const bare = lastDot >= 0 ? trimmed.slice(lastDot + 1) : trimmed;
  return bare.toUpperCase();
}
