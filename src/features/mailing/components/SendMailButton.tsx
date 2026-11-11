"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Mail } from "lucide-react";
import BulkMailDialog from "@/features/mailing/components/BulkMailDialog";
import MailAccountDialog from "@/features/mailing/components/MailAccountDialog";
import { useMailer } from "@/features/mailing/hooks/useMailer";
import type { MailEntity, MailSelection } from "@/features/mailing/types/mail.types";
import { isPlausibleEmail } from "@/features/mailing/utils/gmailCompose";

interface SendMailButtonProps {
  entity: MailEntity;
  recordId: string;
  recordName: string;
  /** Leads and contacts: the address the draft is opened to. Not used for accounts. */
  email?: string | null;
  /** Contacts only. */
  emailOptOut?: boolean;
}

/**
 * "Send Mail" for one record.
 *
 * Leads and contacts open a Gmail draft to their address straight away.
 * Accounts have no address of their own, so they open the mail dialog for
 * their contacts. The small arrow beside the button shows which Google
 * account is used and lets the user change it.
 */
export default function SendMailButton({
  entity,
  recordId,
  recordName,
  email,
  emailOptOut = false,
}: SendMailButtonProps) {
  const mailer = useMailer();
  const [menuOpen, setMenuOpen] = useState(false);
  const [accountDialogOpen, setAccountDialogOpen] = useState(false);
  const [accountMailOpen, setAccountMailOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const isAccount = entity === "accounts";
  const hasEmail = isPlausibleEmail(email);
  const disabled = !isAccount && !hasEmail;
  const title = disabled ? "This record has no valid email address" : "Send mail";

  const accountSelection = useMemo<MailSelection>(() => ({ mode: "ids", ids: [recordId] }), [recordId]);

  useEffect(() => {
    if (!menuOpen) return;
    function handleMouseDown(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) setMenuOpen(false);
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("mousedown", handleMouseDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuOpen]);

  function handleSend() {
    if (isAccount) {
      setAccountMailOpen(true);
      return;
    }
    mailer.composeSingle({
      recordType: entity === "contacts" ? "CONTACT" : "LEAD",
      recordId,
      name: recordName,
      email,
      emailOptOut,
    });
  }

  return (
    <div ref={wrapperRef} className="relative inline-flex">
      <button
        type="button"
        onClick={handleSend}
        disabled={disabled}
        title={title}
        className="inline-flex items-center gap-1.5 rounded-l-md border border-line px-3 py-2 text-sm font-medium text-fg hover:bg-paper disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Mail size={15} />
        Send Mail
      </button>
      <button
        type="button"
        onClick={() => setMenuOpen((open) => !open)}
        aria-label="Mail options"
        aria-expanded={menuOpen}
        className="inline-flex items-center rounded-r-md border border-l-0 border-line px-1.5 py-2 text-ink-soft hover:bg-paper"
      >
        <ChevronDown size={14} />
      </button>

      {menuOpen && (
        <div className="absolute right-0 top-full z-20 mt-1 w-64 rounded-md border border-line bg-surface p-3 shadow-lg">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
            {mailer.provider === "gmail" ? "Opens Gmail as" : "Opens your mail app"}
          </p>
          {mailer.provider === "gmail" && (
            <p className="mt-0.5 break-all text-sm font-medium text-fg">{mailer.accountEmail || "—"}</p>
          )}

          <div className="mt-3 inline-flex overflow-hidden rounded-md border border-line text-sm" role="group" aria-label="Open drafts in">
            {(["gmail", "mailto"] as const).map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={mailer.provider === option}
                onClick={() => mailer.setProvider(option)}
                className={`px-3 py-1 font-medium ${
                  mailer.provider === option ? "bg-ink text-white" : "bg-surface text-fg hover:bg-paper"
                }`}
              >
                {option === "gmail" ? "Gmail" : "Mail app"}
              </button>
            ))}
          </div>

          {mailer.provider === "gmail" && (
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                setAccountDialogOpen(true);
              }}
              className="mt-3 block text-sm font-medium text-slate hover:underline"
            >
              Change Google mail…
            </button>
          )}
        </div>
      )}

      <MailAccountDialog
        isOpen={accountDialogOpen}
        onClose={() => setAccountDialogOpen(false)}
        loginEmail={mailer.loginEmail}
        googleEmail={mailer.googleEmail}
        onSave={mailer.saveGoogleEmail}
      />

      {accountMailOpen && (
        <BulkMailDialog
          entity={entity}
          selection={accountSelection}
          mailer={mailer}
          onClose={() => setAccountMailOpen(false)}
        />
      )}
    </div>
  );
}
