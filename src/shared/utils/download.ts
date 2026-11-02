/** Saves a Blob as a file through a temporary object URL (revoked afterwards). */
export function saveBlob(blob: Blob, fileName: string): void {
  if (typeof document === "undefined") return;
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Give the browser a moment to start the download before releasing it.
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Reads the file name out of a Content-Disposition header. */
export function fileNameFromDisposition(header: unknown, fallback: string): string {
  if (typeof header !== "string") return fallback;
  const encoded = /filename\*\s*=\s*(?:UTF-8'')?([^;]+)/i.exec(header);
  if (encoded) {
    try {
      return decodeURIComponent(encoded[1].trim().replace(/^"|"$/g, ""));
    } catch {
      // fall through to the plain filename
    }
  }
  const plain = /filename\s*=\s*"?([^";]+)"?/i.exec(header);
  return plain ? plain[1].trim() : fallback;
}

/**
 * A failed download answers with a Blob body. Turns it back into the JSON the
 * server sent so `extractApiError` can read `detail`. Anything that is not
 * JSON (an HTML error page, say) is dropped so the fallback message is used.
 */
export async function unwrapBlobError<E>(error: E): Promise<E> {
  const response = (error as { response?: { data?: unknown } } | null)?.response;
  if (!response || typeof Blob === "undefined" || !(response.data instanceof Blob)) return error;
  try {
    response.data = JSON.parse(await response.data.text()) as unknown;
  } catch {
    response.data = undefined;
  }
  return error;
}
