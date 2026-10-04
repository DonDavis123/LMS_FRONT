import { extractApiError } from "@/shared/utils/apiError";

export interface MappedFormError<F extends string> {
  /** Messages to render under their input. */
  fields: Partial<Record<F, string>>;
  /** Message for the form as a whole; `null` when a field error explains it. */
  form: string | null;
}

function readFieldMessage(data: Record<string, unknown>, field: string): string | undefined {
  const value = data[field];
  if (typeof value === "string") return value;
  if (Array.isArray(value) && typeof value[0] === "string") return value[0];
  return undefined;
}

/**
 * Maps a failed create/update request onto a form.
 *
 * DRF reports validation problems as `{ field: ["msg"] }`, but business-rule
 * failures arrive as `{ detail: "..." }` (e.g. "User with this email already
 * exists."). `detailMatchers` lets a form attach such a `detail` to the input
 * it is about. Anything left over becomes a form-level message — always the
 * server's own text, never a raw exception.
 */
export function mapUserFormError<F extends string>(
  error: unknown,
  fields: readonly F[],
  detailMatchers: Partial<Record<F, RegExp>>,
  fallback: string,
): MappedFormError<F> {
  const data = (error as { response?: { data?: unknown } } | null)?.response?.data;
  const mapped: Partial<Record<F, string>> = {};

  if (data && typeof data === "object" && !Array.isArray(data)) {
    const record = data as Record<string, unknown>;

    for (const field of fields) {
      const message = readFieldMessage(record, field);
      if (message) mapped[field] = message;
    }

    const detail = typeof record.detail === "string" ? record.detail : null;
    if (detail) {
      for (const field of fields) {
        const matcher = detailMatchers[field];
        if (!mapped[field] && matcher?.test(detail)) {
          mapped[field] = detail;
          break;
        }
      }
    }
  }

  if (Object.keys(mapped).length > 0) return { fields: mapped, form: null };
  return { fields: mapped, form: extractApiError(error, fallback) };
}
