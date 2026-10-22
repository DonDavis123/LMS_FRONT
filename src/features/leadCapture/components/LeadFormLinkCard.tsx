"use client";

import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { AlertTriangle, Check, Copy, Download, RefreshCw } from "lucide-react";
import Modal from "@/shared/components/Modal";
import Spinner from "@/shared/components/Spinner";
import { extractApiError } from "@/shared/utils/apiError";
import type { LeadForm } from "@/features/leadCapture/types/leadCapture.types";

interface LeadFormLinkCardProps {
  form: LeadForm;
  /** Resolves when the link was regenerated; rejects with the API error. */
  onRegenerate: () => Promise<void>;
}

const TITLE_ID = "regenerate-lead-link-title";

export default function LeadFormLinkCard({ form, onRegenerate }: LeadFormLinkCardProps) {
  const url = form.public_url;
  const inputRef = useRef<HTMLInputElement>(null);
  const copiedTimer = useRef<number | null>(null);

  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);
  const [qr, setQr] = useState<{ url: string; dataUrl: string } | null>(null);
  const [qrError, setQrError] = useState<string | null>(null);

  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [regenerateError, setRegenerateError] = useState<string | null>(null);

  // The QR is drawn in the browser from the link — no online QR service. It
  // is redrawn whenever the link changes (e.g. after regenerating it).
  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(url, { width: 320, margin: 2 })
      .then((dataUrl) => {
        if (cancelled) return;
        setQr({ url, dataUrl });
        setQrError(null);
      })
      .catch(() => {
        if (!cancelled) setQrError("Couldn't draw the QR code. The link above still works.");
      });
    return () => {
      cancelled = true;
    };
  }, [url]);

  useEffect(() => {
    return () => {
      if (copiedTimer.current !== null) window.clearTimeout(copiedTimer.current);
    };
  }, []);

  // Never show a QR that belongs to a previous link.
  const qrDataUrl = qr && qr.url === url ? qr.dataUrl : null;

  async function handleCopy() {
    let ok = false;
    try {
      await navigator.clipboard.writeText(url);
      ok = true;
    } catch {
      // Clipboard API unavailable (e.g. insecure context): select + copy.
      const input = inputRef.current;
      if (input) {
        input.focus();
        input.select();
        try {
          ok = document.execCommand("copy");
        } catch {
          ok = false;
        }
      }
    }
    setCopyFailed(!ok);
    setCopied(ok);
    if (copiedTimer.current !== null) window.clearTimeout(copiedTimer.current);
    copiedTimer.current = window.setTimeout(() => {
      setCopied(false);
      setCopyFailed(false);
    }, 2000);
  }

  function handleDownload() {
    if (!qrDataUrl) return;
    const anchor = document.createElement("a");
    anchor.href = qrDataUrl;
    anchor.download = "lead-form-qr.png";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  }

  function closeConfirm() {
    if (isRegenerating) return;
    setIsConfirmOpen(false);
    setRegenerateError(null);
  }

  async function confirmRegenerate() {
    setIsRegenerating(true);
    setRegenerateError(null);
    try {
      await onRegenerate();
      setIsConfirmOpen(false);
    } catch (error) {
      setRegenerateError(extractApiError(error, "Couldn't generate a new link. Try again."));
    } finally {
      setIsRegenerating(false);
    }
  }

  return (
    <section aria-labelledby="lead-form-link-title" className="lp-card overflow-hidden">
      <div className="border-b border-line px-4 py-3">
        <h2 id="lead-form-link-title" className="text-base font-semibold text-fg">
          Share your form
        </h2>
        <p className="text-sm text-ink-soft">Send the link or print the QR code. Both open the same public form.</p>
      </div>

      <div className="grid gap-5 p-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-start">
        <div className="min-w-0 space-y-4">
          <div>
            <label htmlFor="lead-form-public-url" className="mb-1.5 block text-sm font-medium text-fg">
              Public link
            </label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                id="lead-form-public-url"
                ref={inputRef}
                readOnly
                value={url}
                onFocus={(event) => event.currentTarget.select()}
                className="min-w-0 flex-1 rounded-md border border-line bg-paper px-3 py-2 text-base text-fg outline-none transition focus:border-slate focus:ring-2 focus:ring-slate-light sm:text-sm"
              />
              <button
                type="button"
                onClick={() => void handleCopy()}
                className="flex shrink-0 items-center justify-center gap-1.5 rounded-md bg-ink px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-ink-2 active:scale-[0.98]"
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <p role="status" className="mt-1.5 min-h-4 text-xs text-ink-soft">
              {copyFailed ? "Couldn't copy automatically — select the link and copy it." : ""}
            </p>
          </div>

          {!form.is_active && (
            <p className="rounded-md border border-line bg-paper/60 px-3 py-2 text-xs text-ink-soft">
              The form is blocked right now, so this link shows a &ldquo;no longer accepting responses&rdquo; message
              until you unblock it.
            </p>
          )}

          <div className="border-t border-line pt-4">
            <button
              type="button"
              onClick={() => setIsConfirmOpen(true)}
              className="flex items-center gap-1.5 rounded-md border border-line px-3.5 py-2 text-sm font-medium text-fg transition hover:bg-paper"
            >
              <RefreshCw size={15} />
              Regenerate link
            </button>
            <p className="mt-1.5 text-xs text-ink-soft">
              Use this if the link was shared by mistake. The current link and every printed QR code stop working.
            </p>
          </div>
        </div>

        <div className="mx-auto flex w-full max-w-[16rem] flex-col items-center gap-3 md:mx-0">
          {/* Always on white: a QR code must stay dark-on-light, also in dark mode. */}
          <div className="grid aspect-square w-full place-items-center overflow-hidden rounded-lg border border-line bg-white p-1">
            {qrDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={qrDataUrl} alt="QR code of the public lead form link" className="h-full w-full" />
            ) : qrError ? (
              <p className="px-3 text-center text-xs text-danger">{qrError}</p>
            ) : (
              <Spinner size="md" />
            )}
          </div>
          <button
            type="button"
            onClick={handleDownload}
            disabled={!qrDataUrl}
            className="flex w-full items-center justify-center gap-1.5 rounded-md border border-line px-3.5 py-2 text-sm font-medium text-fg transition hover:bg-paper disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Download size={15} />
            Download PNG
          </button>
        </div>
      </div>

      <Modal isOpen={isConfirmOpen} onClose={closeConfirm} maxWidthClass="max-w-md" ariaLabelledBy={TITLE_ID}>
        <div className="p-5">
          <div className="flex items-start gap-3 pr-6">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-danger-soft text-danger">
              <AlertTriangle size={18} />
            </span>
            <div className="min-w-0">
              <h2 id={TITLE_ID} className="text-base font-semibold text-fg">
                Regenerate the link?
              </h2>
              <p className="mt-1 text-sm text-ink-soft">
                A new link and QR code are created. The <span className="font-semibold text-fg">old link and every
                printed QR code stop working immediately</span> — anyone who opens them will see that the form
                doesn&apos;t exist. You&apos;ll need to share the new link again.
              </p>
            </div>
          </div>

          {regenerateError && (
            <p role="alert" className="mt-4 rounded-md border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger">
              {regenerateError}
            </p>
          )}

          <div className="mt-5 flex justify-end gap-2">
            <button
              type="button"
              onClick={closeConfirm}
              disabled={isRegenerating}
              className="rounded-md border border-line px-4 py-2 text-sm font-medium text-fg hover:bg-paper disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void confirmRegenerate()}
              disabled={isRegenerating}
              className="flex items-center gap-2 rounded-md bg-danger px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 active:scale-[0.98] disabled:opacity-60"
            >
              {isRegenerating && <Spinner size="sm" className="border-white/30 border-t-white" />}
              Regenerate link
            </button>
          </div>
        </div>
      </Modal>
    </section>
  );
}
