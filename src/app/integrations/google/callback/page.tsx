"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import Spinner from "@/shared/components/Spinner";
import {
  GOOGLE_OAUTH_CHANNEL,
  GOOGLE_OAUTH_MESSAGE_TYPE,
  type GoogleOAuthMessage,
} from "@/features/googleIntegration/types/google.types";

const DEFAULT_ERROR = "Google connection failed. Please try again.";

/**
 * Where the backend sends the browser after Google's consent screen
 * (`?status=connected` or `?status=error&message=…`). It needs no login and
 * makes no API call: it just hands the result to the window that opened the
 * popup and closes itself.
 */
function CallbackContent() {
  const params = useSearchParams();
  const result: "connected" | "error" =
    params.get("status") === "connected" ? "connected" : "error";
  const message = params.get("message");
  const [hadOpener, setHadOpener] = useState<boolean | null>(null);
  const sentRef = useRef(false);

  useEffect(() => {
    if (sentRef.current) return;
    sentRef.current = true;

    const payload: GoogleOAuthMessage = {
      type: GOOGLE_OAUTH_MESSAGE_TYPE,
      status: result,
      ...(result === "error" ? { message: message || DEFAULT_ERROR } : {}),
    };

    // Fallback for browsers/flows where Google's pages cut `window.opener`.
    try {
      if (typeof BroadcastChannel !== "undefined") {
        const channel = new BroadcastChannel(GOOGLE_OAUTH_CHANNEL);
        channel.postMessage(payload);
        channel.close();
      }
    } catch {
      // Not critical.
    }

    let closeTimer: number | undefined;
    const opener = window.opener as Window | null;
    let openerAvailable = false;
    try {
      openerAvailable = Boolean(opener && !opener.closed);
    } catch {
      openerAvailable = false;
    }

    if (openerAvailable && opener) {
      try {
        opener.postMessage(payload, window.location.origin);
      } catch {
        // Fall through to the visible message.
      }
      closeTimer = window.setTimeout(() => window.close(), 400);
    }
    setHadOpener(openerAvailable);

    return () => {
      if (closeTimer !== undefined) window.clearTimeout(closeTimer);
    };
  }, [result, message]);

  const ok = result === "connected";
  const Icon = ok ? CheckCircle2 : AlertTriangle;

  return (
    <div className="w-full max-w-md rounded-lg border border-line bg-surface p-6 text-center shadow-sm">
      <div
        className={`mx-auto flex h-12 w-12 items-center justify-center rounded-full ${
          ok ? "bg-success-soft text-success" : "bg-danger-soft text-danger"
        }`}
      >
        <Icon size={24} aria-hidden="true" />
      </div>

      <h1 className="mt-4 font-serif text-xl text-fg">
        {ok ? "Google account connected" : "Couldn’t connect Google"}
      </h1>

      <div role="status" aria-live="polite">
        <p className="mt-2 text-sm text-ink-soft">
          {ok
            ? "Your Google account is linked. Meeting invites will be sent from it."
            : message || DEFAULT_ERROR}
        </p>

        {hadOpener === null ? (
          <p className="mt-4 inline-flex items-center gap-2 text-xs text-ink-soft">
            <Spinner size="sm" /> Finishing up…
          </p>
        ) : hadOpener ? (
          <p className="mt-4 text-xs text-ink-soft">
            This window should close on its own. If it doesn&apos;t, you can close it.
          </p>
        ) : (
          <p className="mt-4 text-xs text-ink-soft">You can close this window.</p>
        )}
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
        {hadOpener === null ? null : hadOpener ? (
          <button
            type="button"
            onClick={() => window.close()}
            className="rounded-md border border-line px-4 py-2 text-sm font-medium text-fg hover:bg-paper"
          >
            Close window
          </button>
        ) : (
          <Link
            href="/dashboard/meetings"
            className="rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white transition hover:bg-ink-2"
          >
            Back to Meetings
          </Link>
        )}
      </div>
    </div>
  );
}

export default function GoogleCallbackPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-paper px-4 py-10 text-fg">
      <Suspense
        fallback={
          <div className="flex items-center gap-2 text-sm text-ink-soft">
            <Spinner size="sm" /> Loading…
          </div>
        }
      >
        <CallbackContent />
      </Suspense>
    </main>
  );
}
