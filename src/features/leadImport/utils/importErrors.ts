import { extractApiError } from "@/shared/utils/apiError";
import type { ImportApiError } from "@/features/leadImport/types/leadImport.types";

/** A failure turned into plain words. Always show `message` AND `howToFix`. */
export interface ImportErrorInfo {
  /** The headline: the backend's `detail`, or a plain-English fallback. */
  message: string;
  /** The backend's `how_to_fix` (or a sensible default). `null` when there is nothing to add. */
  howToFix: string | null;
  /** The backend's machine code, e.g. "too_many_rows". `null` when it sent none. */
  code: string | null;
  /** The request never got an answer (offline, server unreachable, timeout). */
  isNetwork: boolean;
  /** The request was cancelled on purpose (AbortController). Not a real error. */
  isCancelled: boolean;
}

type ErrorLike = {
  code?: unknown;
  name?: unknown;
  message?: unknown;
  response?: { status?: number; data?: unknown };
  request?: unknown;
};

function asErrorLike(error: unknown): ErrorLike {
  return error && typeof error === "object" ? (error as ErrorLike) : {};
}

export function isImportApiError(value: unknown): value is ImportApiError {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return typeof record.detail === "string" && typeof record.code === "string";
}

export function isCancelledRequest(error: unknown): boolean {
  const { code, name } = asErrorLike(error);
  return code === "ERR_CANCELED" || name === "CanceledError" || name === "AbortError";
}

export function isNetworkFailure(error: unknown): boolean {
  const e = asErrorLike(error);
  if (isCancelledRequest(error)) return false;
  if (e.response) return false;
  return (
    e.code === "ERR_NETWORK" ||
    e.code === "ECONNABORTED" ||
    e.code === "ETIMEDOUT" ||
    e.message === "Network Error" ||
    Boolean(e.request)
  );
}

/**
 * Turns anything thrown by the import service into text for the screen.
 * Built on extractApiError plus the backend's `code` and `how_to_fix`.
 */
export function getImportError(
  error: unknown,
  fallback = "Something went wrong. Please try again.",
): ImportErrorInfo {
  if (isCancelledRequest(error)) {
    return { message: "Cancelled.", howToFix: null, code: "cancelled", isNetwork: false, isCancelled: true };
  }

  if (isNetworkFailure(error)) {
    return {
      message: "The connection failed.",
      howToFix: "Check that you are online, then try again.",
      code: "network_error",
      isNetwork: true,
      isCancelled: false,
    };
  }

  const { response } = asErrorLike(error);
  const data = response?.data;

  if (isImportApiError(data)) {
    const how = (data as { how_to_fix?: unknown }).how_to_fix;
    return {
      message: data.detail,
      howToFix: typeof how === "string" && how.trim() ? how : null,
      code: data.code,
      isNetwork: false,
      isCancelled: false,
    };
  }

  // A reverse proxy can reject a big upload before Django ever sees it.
  if (response?.status === 413) {
    return {
      message: "This file is too large to upload.",
      howToFix: "Remove unused columns or split the file into smaller files, then try again.",
      code: "file_too_large",
      isNetwork: false,
      isCancelled: false,
    };
  }

  if (response?.status === 403) {
    return {
      message: extractApiError(error, "You don't have permission to import leads."),
      howToFix: null,
      code: "forbidden",
      isNetwork: false,
      isCancelled: false,
    };
  }

  const record = data && typeof data === "object" ? (data as Record<string, unknown>) : null;
  const how = record && typeof record.how_to_fix === "string" ? record.how_to_fix : null;
  const code = record && typeof record.code === "string" ? record.code : null;

  return {
    message: extractApiError(error, fallback),
    howToFix: how,
    code,
    isNetwork: false,
    isCancelled: false,
  };
}

/**
 * A failed download arrives with its JSON error body as a Blob. This reads
 * that Blob and puts the parsed object back on `error.response.data`, so
 * getImportError() works on it exactly like on any other failure.
 * Always returns the same error it was given.
 */
export async function unwrapBlobError<E>(error: E): Promise<E> {
  const response = asErrorLike(error).response;
  if (!response || typeof Blob === "undefined" || !(response.data instanceof Blob)) return error;
  try {
    const text = await response.data.text();
    response.data = JSON.parse(text) as unknown;
  } catch {
    // Not JSON (for example an HTML error page): drop the body so the
    // generic fallback message is used instead of a raw Blob.
    response.data = undefined;
  }
  return error;
}
