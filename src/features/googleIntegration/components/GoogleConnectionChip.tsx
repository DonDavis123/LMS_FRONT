"use client";

import { useState } from "react";
import { AlertTriangle, CheckCircle2, Link2 } from "lucide-react";
import Spinner from "@/shared/components/Spinner";
import { useGoogleConnection } from "@/features/googleIntegration/hooks/useGoogleConnection";

const buttonClass =
  "inline-flex items-center gap-1.5 whitespace-nowrap rounded-md border border-line bg-surface px-2.5 py-1.5 text-xs font-semibold text-fg transition hover:bg-paper disabled:cursor-not-allowed disabled:opacity-60";

/**
 * Status chip for the user's Google connection, with Connect / Reconnect and
 * Disconnect (with an inline confirm step). Handles loading, "not configured
 * on the server", not connected, connected and revoked.
 */
export default function GoogleConnectionChip() {
  const google = useGoogleConnection();
  const { status, loading, error, connecting, disconnecting } = google;
  const [confirming, setConfirming] = useState(false);

  let body: React.ReactNode;

  if (loading && !status) {
    body = (
      <span className="inline-flex items-center gap-2 text-xs text-ink-soft">
        <Spinner size="sm" /> Checking Google…
      </span>
    );
  } else if (!status) {
    body = (
      <span className="inline-flex items-center gap-2 text-xs text-ink-soft">
        Google status unavailable
        <button type="button" onClick={() => void google.refresh()} className={buttonClass}>
          Retry
        </button>
      </span>
    );
  } else if (!status.configured) {
    body = (
      <span
        className="text-xs text-ink-soft"
        title="An administrator needs to set up the Google integration on the server."
      >
        Google isn&apos;t set up on the server
      </span>
    );
  } else if (status.connected && status.status !== "revoked") {
    body = confirming ? (
      <span className="inline-flex flex-wrap items-center gap-2 text-xs text-fg">
        Disconnect Google?
        <button
          type="button"
          disabled={disconnecting}
          onClick={async () => {
            const done = await google.disconnect();
            if (done) setConfirming(false);
          }}
          className="inline-flex items-center gap-1.5 rounded-md bg-danger px-2.5 py-1.5 text-xs font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
        >
          {disconnecting && <Spinner size="sm" className="border-white/30 border-t-white" />}
          Disconnect
        </button>
        <button
          type="button"
          disabled={disconnecting}
          onClick={() => setConfirming(false)}
          className={buttonClass}
        >
          Cancel
        </button>
      </span>
    ) : (
      <span className="inline-flex min-w-0 items-center gap-2">
        <span
          className="inline-flex min-w-0 items-center gap-1.5 rounded-full bg-success-soft px-2.5 py-1 text-xs font-medium text-success"
          title={status.google_email ?? undefined}
        >
          <CheckCircle2 size={13} className="shrink-0" />
          <span className="truncate sm:max-w-[200px]">
            {status.google_email ? `Google: ${status.google_email}` : "Google connected"}
          </span>
        </span>
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="whitespace-nowrap text-xs text-ink-soft underline-offset-2 hover:text-fg hover:underline"
        >
          Disconnect
        </button>
      </span>
    );
  } else {
    const revoked = status.status === "revoked";
    body = (
      <span className="inline-flex flex-wrap items-center gap-2">
        {revoked && (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-danger">
            <AlertTriangle size={13} className="shrink-0" />
            Google access expired
          </span>
        )}
        <button
          type="button"
          onClick={() => void google.connect()}
          disabled={connecting}
          className={buttonClass}
        >
          {connecting ? <Spinner size="sm" /> : <Link2 size={13} />}
          {connecting ? "Waiting for Google…" : revoked ? "Reconnect Google" : "Connect Google"}
        </button>
      </span>
    );
  }

  return (
    <div className="flex min-w-0 flex-col items-end gap-1">
      {body}
      <p
        role="status"
        aria-live="polite"
        className={error ? "max-w-xs text-right text-xs text-danger" : "sr-only"}
      >
        {error ?? ""}
      </p>
    </div>
  );
}
