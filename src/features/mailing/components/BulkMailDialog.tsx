"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Copy, ExternalLink, Mail } from "lucide-react";
import Modal from "@/shared/components/Modal";
import { extractApiError } from "@/shared/utils/apiError";
import MailAccountDialog from "@/features/mailing/components/MailAccountDialog";
import type { Mailer } from "@/features/mailing/hooks/useMailer";
import { MailService } from "@/features/mailing/services/MailService";
import {
  MAIL_BATCH_SIZE,
  MAIL_MAX_BATCH_SIZE,
  MAIL_MAX_LOG_SUBJECT,
  type MailEntity,
  type MailLogTarget,
  type MailRecipient,
  type MailSelection,
  type MailSkipReason,
  type ResolveRecipientsResponse,
  type SkippedMailRecord,
} from "@/features/mailing/types/mail.types";
import {
  buildComposeUrl,
  newClientRef,
  openComposeWindow,
  recipientFields,
  splitIntoBatches,
} from "@/features/mailing/utils/gmailCompose";

interface BulkMailDialogProps {
  entity: MailEntity;
  /** Fixed when the dialog opens: the ids picked, or "everything matching" the list's filters. */
  selection: MailSelection;
  mailer: Mailer;
  onClose: () => void;
}

type ResolveState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; data: ResolveRecipientsResponse };

interface Batch {
  /** Stable id of the batch's content; keeps its "opened" mark and log reference. */
  key: string;
  emails: string[];
  targets: MailLogTarget[];
}

const SKIP_LABELS: Record<MailSkipReason, string> = {
  NO_EMAIL: "No email address",
  INVALID_EMAIL: "Invalid email address",
  OPTED_OUT: "Opted out of email",
  DUPLICATE_EMAIL: "Duplicate address",
  NOT_FOUND: "No longer available",
  NO_CONTACTS: "Account has no contacts",
};

const SKIPPED_NAMES_SHOWN = 25;

const ENTITY_NOUN: Record<MailEntity, string> = {
  contacts: "contacts",
  leads: "leads",
  accounts: "accounts",
};

function noop() {}

function plural(count: number, one: string, many: string): string {
  return count === 1 ? one : many;
}

export default function BulkMailDialog({ entity, selection, mailer, onClose }: BulkMailDialogProps) {
  const [state, setState] = useState<ResolveState>({ status: "loading" });
  const [reloadKey, setReloadKey] = useState(0);
  const [includeSecondary, setIncludeSecondary] = useState(false);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [opened, setOpened] = useState<Set<string>>(new Set());
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [logFailed, setLogFailed] = useState(false);
  const [accountDialogOpen, setAccountDialogOpen] = useState(false);
  // One log reference per batch, so opening the same batch twice never double-logs it.
  const clientRefs = useRef(new Map<string, string>());

  const { provider, accountEmail } = mailer;

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading" });
    MailService.resolveRecipients({
      entity,
      selection,
      include_secondary_email: includeSecondary,
      batch_size: MAIL_MAX_BATCH_SIZE,
    })
      .then((data) => {
        if (!cancelled) setState({ status: "ready", data });
      })
      .catch((error) => {
        if (!cancelled) {
          setState({
            status: "error",
            message: extractApiError(error, "Couldn't prepare the recipient list. Try again."),
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [entity, selection, includeSecondary, reloadKey]);

  const readyData = state.status === "ready" ? state.data : null;

  // The addresses are split so every draft link stays short enough for Gmail.
  const plan = useMemo<{ batches: Batch[]; error: string | null }>(() => {
    if (!readyData || readyData.recipients.length === 0) return { batches: [], error: null };

    const byEmail = new Map<string, MailRecipient>();
    for (const recipient of readyData.recipients) byEmail.set(recipient.email.toLowerCase(), recipient);

    try {
      const groups = splitIntoBatches(
        readyData.recipients.map((recipient) => recipient.email),
        (emails) =>
          buildComposeUrl(provider, { ...recipientFields(emails), subject: subject.trim(), body }, accountEmail),
        { maxPerBatch: MAIL_BATCH_SIZE },
      );

      const batches = groups.map<Batch>((emails) => {
        const targets = new Map<string, MailLogTarget>();
        for (const email of emails) {
          const recipient = byEmail.get(email.toLowerCase());
          if (recipient) {
            targets.set(`${recipient.record_type}:${recipient.record_id}`, {
              record_type: recipient.record_type,
              record_id: recipient.record_id,
            });
          }
        }
        return {
          key: emails.map((email) => email.toLowerCase()).join("|"),
          emails,
          targets: Array.from(targets.values()),
        };
      });
      return { batches, error: null };
    } catch (error) {
      return {
        batches: [],
        error: error instanceof Error ? error.message : "Couldn't prepare the drafts.",
      };
    }
  }, [readyData, provider, accountEmail, subject, body]);

  const skippedGroups = useMemo(() => {
    const groups = new Map<MailSkipReason, SkippedMailRecord[]>();
    for (const record of readyData?.skipped ?? []) {
      const list = groups.get(record.reason);
      if (list) list.push(record);
      else groups.set(record.reason, [record]);
    }
    return Array.from(groups.entries());
  }, [readyData]);

  function openBatch(batch: Batch, index: number, total: number) {
    // Straight from the click, before any await, so the popup blocker allows the tab.
    const url = buildComposeUrl(
      provider,
      { ...recipientFields(batch.emails), subject: subject.trim(), body },
      accountEmail,
    );
    openComposeWindow(provider, url);
    setOpened((current) => new Set(current).add(batch.key));

    // Only Gmail drafts are written to the timeline.
    if (provider !== "gmail" || batch.targets.length === 0) return;

    let clientRef = clientRefs.current.get(batch.key);
    if (!clientRef) {
      clientRef = newClientRef();
      clientRefs.current.set(batch.key, clientRef);
    }
    const trimmedSubject = subject.trim().slice(0, MAIL_MAX_LOG_SUBJECT);
    MailService.logCompose({
      client_ref: clientRef,
      channel: "GMAIL_COMPOSE",
      targets: batch.targets,
      subject: trimmedSubject || undefined,
      batch_index: index + 1,
      batch_total: total,
    })
      .then(() => setLogFailed(false))
      .catch(() => setLogFailed(true));
  }

  async function copyAddresses(key: string, emails: string[]) {
    try {
      await navigator.clipboard.writeText(emails.join(", "));
      setCopiedKey(key);
      window.setTimeout(() => setCopiedKey((current) => (current === key ? null : current)), 1500);
    } catch {
      window.alert("Couldn't copy the addresses. Select and copy them manually.");
    }
  }

  const noun = ENTITY_NOUN[entity];
  const eligible = readyData?.recipients.length ?? 0;
  const skipped = readyData?.skipped.length ?? 0;
  const allEmails = readyData?.recipients.map((recipient) => recipient.email) ?? [];

  return (
    <>
      {/* While the Google mail dialog is on top, Escape must only close that one. */}
      <Modal isOpen onClose={accountDialogOpen ? noop : onClose} maxWidthClass="max-w-2xl" ariaLabelledBy="bulk-mail-title">
        <div className="shrink-0 border-b border-line px-5 py-4">
          <h2 id="bulk-mail-title" className="flex items-center gap-2 pr-8 font-serif text-lg text-fg">
            <Mail size={18} className="text-slate" />
            Send mail to selected {noun}
          </h2>
          {entity === "accounts" && (
            <p className="mt-1 text-sm text-ink-soft">Accounts are mailed through their contacts.</p>
          )}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {state.status === "loading" && (
            <div className="space-y-3" aria-label="Preparing recipients">
              {[0, 1, 2].map((row) => (
                <div key={row} className="h-10 animate-shimmer rounded-md" />
              ))}
            </div>
          )}

          {state.status === "error" && (
            <div className="space-y-3">
              <p className="rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">{state.message}</p>
              <button
                type="button"
                onClick={() => setReloadKey((key) => key + 1)}
                className="rounded-md border border-line px-3 py-1.5 text-sm font-medium text-fg hover:bg-paper"
              >
                Try again
              </button>
            </div>
          )}

          {readyData && (
            <div className="space-y-5">
              {/* What will happen */}
              <div>
                <p className="text-sm text-fg">
                  <span className="font-semibold">{eligible}</span> {plural(eligible, "address", "addresses")} will be mailed
                  {skipped > 0 && (
                    <>
                      {" "}
                      · <span className="font-semibold">{skipped}</span> skipped
                    </>
                  )}
                  <span className="text-ink-soft"> · {readyData.summary.selected} selected</span>
                </p>

                {entity !== "leads" && (
                  <label className="mt-2 flex items-center gap-2 text-sm text-fg">
                    <input
                      type="checkbox"
                      checked={includeSecondary}
                      onChange={(event) => setIncludeSecondary(event.target.checked)}
                      className="h-4 w-4 rounded border-line accent-slate"
                    />
                    Also include secondary email addresses
                  </label>
                )}

                {skippedGroups.length > 0 && (
                  <details className="mt-3 rounded-md border border-line bg-paper px-3 py-2 text-sm">
                    <summary className="cursor-pointer font-medium text-fg">
                      Why {skipped} {plural(skipped, "record was", "records were")} skipped
                    </summary>
                    <div className="mt-2 space-y-3">
                      {skippedGroups.map(([reason, records]) => (
                        <div key={reason}>
                          <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
                            {SKIP_LABELS[reason]} ({records.length})
                          </p>
                          <p className="mt-0.5 text-ink-soft">
                            {records
                              .slice(0, SKIPPED_NAMES_SHOWN)
                              .map((record) => record.name || "Unnamed")
                              .join(", ")}
                            {records.length > SKIPPED_NAMES_SHOWN && ` and ${records.length - SKIPPED_NAMES_SHOWN} more`}
                          </p>
                        </div>
                      ))}
                    </div>
                  </details>
                )}
              </div>

              {eligible === 0 ? (
                <p className="rounded-md border border-line bg-paper px-3 py-3 text-sm text-ink-soft">
                  None of the selected {noun} can be emailed. Check the reasons above and try a different selection.
                </p>
              ) : (
                <>
                  {/* Draft content */}
                  <div className="space-y-3">
                    <div>
                      <label htmlFor="bulk-mail-subject" className="block text-xs font-semibold uppercase tracking-wide text-ink-soft">
                        Subject (optional)
                      </label>
                      <input
                        id="bulk-mail-subject"
                        value={subject}
                        onChange={(event) => setSubject(event.target.value)}
                        className="mt-1 w-full rounded-md border border-line bg-surface px-3 py-2 text-sm text-fg outline-none focus:border-slate"
                      />
                    </div>
                    <div>
                      <label htmlFor="bulk-mail-body" className="block text-xs font-semibold uppercase tracking-wide text-ink-soft">
                        Message (optional)
                      </label>
                      <textarea
                        id="bulk-mail-body"
                        rows={4}
                        value={body}
                        onChange={(event) => setBody(event.target.value)}
                        className="mt-1 w-full resize-y rounded-md border border-line bg-surface px-3 py-2 text-sm text-fg outline-none focus:border-slate"
                      />
                    </div>
                    <p className="text-xs text-ink-soft">
                      Recipients go in Bcc, so they can&apos;t see each other. The same text is used for every draft.
                    </p>
                  </div>

                  {/* Who it is sent as */}
                  <div className="rounded-md border border-line bg-paper px-3 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="inline-flex overflow-hidden rounded-md border border-line text-sm" role="group" aria-label="Open drafts in">
                        {(["gmail", "mailto"] as const).map((option) => (
                          <button
                            key={option}
                            type="button"
                            aria-pressed={provider === option}
                            onClick={() => mailer.setProvider(option)}
                            className={`px-3 py-1.5 font-medium ${
                              provider === option ? "bg-ink text-white" : "bg-surface text-fg hover:bg-paper"
                            }`}
                          >
                            {option === "gmail" ? "Gmail" : "Mail app"}
                          </button>
                        ))}
                      </div>
                      {provider === "gmail" && (
                        <p className="min-w-0 text-sm text-fg">
                          Opens as <span className="break-all font-semibold">{accountEmail || "your Google account"}</span>{" "}
                          <button
                            type="button"
                            onClick={() => setAccountDialogOpen(true)}
                            className="font-medium text-slate hover:underline"
                          >
                            Change
                          </button>
                        </p>
                      )}
                    </div>
                    <p className="mt-2 text-xs text-ink-soft">
                      {provider === "gmail"
                        ? "Make sure you're signed in to that Google account in this browser."
                        : "Drafts open in your default mail app. They aren't recorded on the timeline."}
                    </p>
                  </div>

                  {/* Drafts */}
                  <div>
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
                        {plan.batches.length > 1 ? `${plan.batches.length} drafts` : "Draft"}
                      </h3>
                      {allEmails.length > 0 && (
                        <button
                          type="button"
                          onClick={() => void copyAddresses("all", allEmails)}
                          className="inline-flex items-center gap-1 text-xs font-medium text-slate hover:underline"
                        >
                          {copiedKey === "all" ? <Check size={12} /> : <Copy size={12} />}
                          {copiedKey === "all" ? "Copied" : "Copy all addresses"}
                        </button>
                      )}
                    </div>

                    {plan.error && <p className="rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">{plan.error}</p>}

                    {plan.batches.length > 1 && (
                      <p className="mb-2 text-xs text-ink-soft">
                        A draft link can only hold so many addresses, so this selection opens as several drafts. Open them one at a time.
                      </p>
                    )}

                    <ul className="space-y-2">
                      {plan.batches.map((batch, index) => {
                        const isOpened = opened.has(batch.key);
                        return (
                          <li
                            key={batch.key}
                            className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-line bg-surface px-3 py-2"
                          >
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-fg">
                                {plan.batches.length > 1 ? `Draft ${index + 1} of ${plan.batches.length}` : "Draft"}
                                <span className="font-normal text-ink-soft">
                                  {" "}
                                  · {batch.emails.length} {plural(batch.emails.length, "recipient", "recipients")}
                                </span>
                              </p>
                              <p className="truncate text-xs text-ink-soft" title={batch.emails.join(", ")}>
                                {batch.emails.slice(0, 3).join(", ")}
                                {batch.emails.length > 3 && ` +${batch.emails.length - 3} more`}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => void copyAddresses(batch.key, batch.emails)}
                                className="inline-flex items-center gap-1 rounded-md border border-line px-2.5 py-1.5 text-xs font-medium text-fg hover:bg-paper"
                              >
                                {copiedKey === batch.key ? <Check size={12} /> : <Copy size={12} />}
                                {copiedKey === batch.key ? "Copied" : "Copy"}
                              </button>
                              <button
                                type="button"
                                onClick={() => openBatch(batch, index, plan.batches.length)}
                                className="inline-flex items-center gap-1.5 rounded-md bg-amber px-3 py-1.5 text-sm font-semibold text-fg transition hover:bg-amber-dark active:scale-[0.98]"
                              >
                                {isOpened ? <Check size={14} /> : <ExternalLink size={14} />}
                                {isOpened ? "Open again" : provider === "gmail" ? "Open in Gmail" : "Open in mail app"}
                              </button>
                            </div>
                          </li>
                        );
                      })}
                    </ul>

                    {logFailed && (
                      <p className="mt-2 text-xs text-ink-soft">
                        The draft opened, but it couldn&apos;t be recorded on the timeline.
                      </p>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        <div className="flex shrink-0 justify-end border-t border-line px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-line px-4 py-2 text-sm font-medium text-fg hover:bg-paper"
          >
            Close
          </button>
        </div>
      </Modal>

      <MailAccountDialog
        isOpen={accountDialogOpen}
        onClose={() => setAccountDialogOpen(false)}
        loginEmail={mailer.loginEmail}
        googleEmail={mailer.googleEmail}
        onSave={mailer.saveGoogleEmail}
      />
    </>
  );
}
