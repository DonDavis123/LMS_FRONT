"use client";

import { useCallback, useEffect, useState } from "react";
import { authService } from "@/features/auth/services/authService";
import { authStorage } from "@/infrastructure/auth/tokenStorage";
import { getMailAccountEmail, type AuthUser } from "@/features/auth/types/auth.types";
import { MailService } from "@/features/mailing/services/MailService";
import type { MailLogRecordType, MailProvider } from "@/features/mailing/types/mail.types";
import {
  buildComposeUrl,
  isPlausibleEmail,
  newClientRef,
  openComposeWindow,
  recipientFields,
} from "@/features/mailing/utils/gmailCompose";

const PROVIDER_STORAGE_KEY = "crm.mail.provider";

function readStoredProvider(): MailProvider {
  try {
    return window.localStorage.getItem(PROVIDER_STORAGE_KEY) === "mailto" ? "mailto" : "gmail";
  } catch {
    return "gmail";
  }
}

export interface ComposeSingleArgs {
  recordType: MailLogRecordType;
  recordId: string;
  name: string;
  email: string | null | undefined;
  /** Contacts only. An opted-out contact needs the user's confirmation. */
  emailOptOut?: boolean;
}

export type ComposeSingleResult = "opened" | "cancelled" | "no_email";

export interface Mailer {
  /** Google account Gmail opens in (Google mail if set, otherwise the login email). */
  accountEmail: string;
  loginEmail: string;
  googleEmail: string | null;
  provider: MailProvider;
  setProvider: (provider: MailProvider) => void;
  saveGoogleEmail: (googleEmail: string | null) => Promise<void>;
  /** Opens a draft to one lead/contact and records it on their timeline. */
  composeSingle: (args: ComposeSingleArgs) => ComposeSingleResult;
}

/**
 * Everything the Send Mail buttons share: who the mail is sent as, how the
 * draft is opened, and the one-record flow.
 *
 * The first render uses the cached session (sessions saved before the Google
 * mail field existed fall back to the login email); the current user is then
 * refreshed from the server so a change made elsewhere shows up.
 */
export function useMailer(): Mailer {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [provider, setProviderState] = useState<MailProvider>("gmail");

  useEffect(() => {
    let cancelled = false;
    setUser(authService.getSessionUser());
    setProviderState(readStoredProvider());

    authService.fetchCurrentUser().then((fresh) => {
      if (!fresh || cancelled) return;
      authStorage.setUser(fresh);
      setUser(fresh);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const accountEmail = getMailAccountEmail(user);

  const setProvider = useCallback((next: MailProvider) => {
    setProviderState(next);
    try {
      window.localStorage.setItem(PROVIDER_STORAGE_KEY, next);
    } catch {
      // The choice still applies for this page view.
    }
  }, []);

  const saveGoogleEmail = useCallback(
    async (googleEmail: string | null) => {
      const updated = await MailService.setOwnGoogleEmail(googleEmail);
      const base = authService.getSessionUser() ?? user;
      const merged = { ...(base ?? {}), ...updated } as AuthUser;
      authStorage.setUser(merged);
      setUser(merged);
    },
    [user],
  );

  const composeSingle = useCallback(
    (args: ComposeSingleArgs): ComposeSingleResult => {
      const email = args.email?.trim();
      if (!isPlausibleEmail(email)) return "no_email";

      if (
        args.emailOptOut &&
        !window.confirm(`${args.name || "This contact"} has opted out of email. Open a draft anyway?`)
      ) {
        return "cancelled";
      }

      // Opened first, synchronously, so the popup blocker treats it as the click's own tab.
      openComposeWindow(provider, buildComposeUrl(provider, recipientFields([email]), accountEmail));

      // The timeline only knows about Gmail drafts; a failed log never blocks the user.
      if (provider === "gmail") {
        void MailService.logCompose({
          client_ref: newClientRef(),
          channel: "GMAIL_COMPOSE",
          targets: [{ record_type: args.recordType, record_id: args.recordId }],
        }).catch(() => undefined);
      }
      return "opened";
    },
    [provider, accountEmail],
  );

  return {
    accountEmail,
    loginEmail: user?.email ?? "",
    googleEmail: user?.google_email ?? null,
    provider,
    setProvider,
    saveGoogleEmail,
    composeSingle,
  };
}
