/** Accepts a link typed without a scheme ("example.com/a.pdf") by adding https://. */
export function normalizeDocumentUrl(raw: string): string {
  const value = raw.trim();
  if (!value) return value;
  return /^[a-z][a-z0-9+.-]*:/i.test(value) ? value : `https://${value}`;
}
