import type { MailProvider } from "@/features/mailing/types/mail.types";

/**
 * Browsers and Gmail both truncate or refuse very long links, so a compose
 * link is kept under this many characters. Large selections are split into
 * several drafts ("batches") to respect it.
 */
export const COMPOSE_URL_LIMIT = 1900;

export interface ComposeFields {
  /** Visible recipients. */
  to?: string[];
  /** Hidden recipients: used for bulk mail so people never see each other. */
  bcc?: string[];
  subject?: string;
  body?: string;
}

export interface GmailComposeFields extends ComposeFields {
  /** Google account the draft should open in (Gmail's `authuser`). */
  account?: string;
}

const EMAIL_PATTERN = /^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/;

/** A light client-side check; the server applies the real validation. */
export function isPlausibleEmail(value: string | null | undefined): value is string {
  return typeof value === "string" && EMAIL_PATTERN.test(value.trim());
}

const enc = encodeURIComponent;

export function buildGmailComposeUrl(fields: GmailComposeFields): string {
  const parts = ["view=cm", "fs=1"];
  if (fields.account) parts.push(`authuser=${enc(fields.account)}`);
  if (fields.to?.length) parts.push(`to=${enc(fields.to.join(","))}`);
  if (fields.bcc?.length) parts.push(`bcc=${enc(fields.bcc.join(","))}`);
  if (fields.subject) parts.push(`su=${enc(fields.subject)}`);
  if (fields.body) parts.push(`body=${enc(fields.body)}`);
  return `https://mail.google.com/mail/?${parts.join("&")}`;
}

export function buildMailtoUrl(fields: ComposeFields): string {
  const query: string[] = [];
  if (fields.bcc?.length) query.push(`bcc=${enc(fields.bcc.join(","))}`);
  if (fields.subject) query.push(`subject=${enc(fields.subject)}`);
  if (fields.body) query.push(`body=${enc(fields.body)}`);
  const recipients = (fields.to ?? []).map(enc).join(",");
  return `mailto:${recipients}${query.length ? `?${query.join("&")}` : ""}`;
}

export function buildComposeUrl(
  provider: MailProvider,
  fields: ComposeFields,
  account?: string,
): string {
  return provider === "gmail"
    ? buildGmailComposeUrl({ ...fields, account })
    : buildMailtoUrl(fields);
}

/** One address goes in "To"; several go in "Bcc". */
export function recipientFields(emails: string[]): Pick<ComposeFields, "to" | "bcc"> {
  return emails.length === 1 ? { to: emails } : { bcc: emails };
}

export class ComposeTooLongError extends Error {
  constructor() {
    super("The subject and message are too long to open in a draft. Shorten them and try again.");
    this.name = "ComposeTooLongError";
  }
}

/**
 * Splits addresses into groups that each fit in one compose link: at most
 * `maxPerBatch` addresses AND a link no longer than `urlLimit` characters.
 * Order is kept. Throws ComposeTooLongError when even one address does not
 * fit (an over-long subject/message).
 */
export function splitIntoBatches(
  emails: string[],
  buildUrl: (batch: string[]) => string,
  options: { maxPerBatch: number; urlLimit?: number },
): string[][] {
  const urlLimit = options.urlLimit ?? COMPOSE_URL_LIMIT;
  const batches: string[][] = [];
  let current: string[] = [];

  for (const email of emails) {
    const candidate = [...current, email];
    if (candidate.length <= options.maxPerBatch && buildUrl(candidate).length <= urlLimit) {
      current = candidate;
      continue;
    }
    if (current.length === 0) throw new ComposeTooLongError();
    batches.push(current);
    if (buildUrl([email]).length > urlLimit) throw new ComposeTooLongError();
    current = [email];
  }

  if (current.length > 0) batches.push(current);
  return batches;
}

/**
 * Opens a draft. Must be called straight from a click handler (before any
 * `await`), otherwise the browser's popup blocker stops the new tab.
 */
export function openComposeWindow(provider: MailProvider, url: string): void {
  if (provider === "mailto") {
    window.location.href = url;
    return;
  }
  window.open(url, "_blank", "noopener,noreferrer");
}

/** A fresh id that makes a timeline log call safe to retry. */
export function newClientRef(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  const hex = () => Math.floor(Math.random() * 16).toString(16);
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (char) =>
    char === "x" ? hex() : ((Math.random() * 4) | 8).toString(16),
  );
}
