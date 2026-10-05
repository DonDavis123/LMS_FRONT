"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowRightCircle, Lock } from "lucide-react";
import RecordTimeline from "@/shared/components/RecordTimeline";
import type { Lead } from "@/features/leads/types/lead.types";

interface ConvertedLeadHistoryProps {
  lead: Lead;
}

type Origin = { kind: "contacts" | "accounts"; id: string };

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Reads where the user came from. RecordTimeline's "View Lead History"
 * link adds `?from=contacts|accounts&fromId=<record id>`. Anything else
 * (typed URL, post-conversion redirect) falls back to the list pages.
 */
function readOrigin(searchParams: URLSearchParams): Origin | null {
  const from = searchParams.get("from");
  const id = searchParams.get("fromId");
  if ((from === "contacts" || from === "accounts") && id && UUID_PATTERN.test(id)) {
    return { kind: from, id };
  }
  return null;
}

/**
 * Read-only view of a lead that has already been converted into a Contact
 * and/or Account. A converted lead is a historical record: it can't be
 * edited, converted again, or given new tasks. This screen shows only its
 * timeline, and sends the user back to the Contact/Account where changes
 * should now be made.
 */
export default function ConvertedLeadHistory({ lead }: ConvertedLeadHistoryProps) {
  const searchParams = useSearchParams();
  const origin = readOrigin(searchParams);
  const originLabel = origin?.kind === "accounts" ? "Account" : "Contact";
  const backHref = origin ? `/dashboard/${origin.kind}/${origin.id}` : null;

  return (
    <div className="mx-auto max-w-5xl">
      {backHref ? (
        <Link href={backHref} className="text-sm text-slate hover:text-fg">
          ← Back to {originLabel}
        </Link>
      ) : (
        <Link href="/dashboard/contacts" className="text-sm text-slate hover:text-fg">
          ← Back to Contacts
        </Link>
      )}

      <div className="mt-3 flex items-center gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-light text-lg font-semibold text-slate">
          {(lead.name || lead.email || "?").slice(0, 1).toUpperCase()}
        </div>
        <div className="min-w-0">
          <h1 className="font-serif text-xl text-fg sm:text-2xl">
            {lead.name || "(No name)"}
            {lead.company_name && (
              <span className="ml-2 text-base text-ink-soft sm:text-lg">- {lead.company_name}</span>
            )}
          </h1>
          <span className="mt-0.5 inline-flex items-center gap-1 rounded-full bg-slate-light px-2.5 py-0.5 text-xs font-medium text-slate">
            <ArrowRightCircle size={12} /> Converted lead
          </span>
        </div>
      </div>

      <div
        role="status"
        className="mt-4 flex flex-col gap-3 rounded-lg border border-line bg-surface p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4"
      >
        <p className="flex items-start gap-2 text-sm text-ink-soft">
          <Lock size={16} className="mt-0.5 shrink-0 text-slate" />
          <span>
            This lead has been converted, so it&apos;s history only and can&apos;t be edited.
            {backHref
              ? ` To make changes, update the ${originLabel.toLowerCase()}.`
              : " To make changes, update its Contact or Account."}
          </span>
        </p>
        <div className="flex shrink-0 flex-wrap gap-2">
          {backHref ? (
            <Link
              href={backHref}
              className="rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white transition hover:bg-ink-2 active:scale-[0.98]"
            >
              Go to {originLabel}
            </Link>
          ) : (
            <>
              <Link
                href="/dashboard/contacts"
                className="rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white transition hover:bg-ink-2 active:scale-[0.98]"
              >
                Go to Contacts
              </Link>
              <Link
                href="/dashboard/accounts"
                className="rounded-md border border-line px-4 py-2 text-sm font-medium text-fg hover:bg-paper"
              >
                Go to Accounts
              </Link>
            </>
          )}
        </div>
      </div>

      <RecordTimeline module="leads" recordId={lead.id} />
    </div>
  );
}
