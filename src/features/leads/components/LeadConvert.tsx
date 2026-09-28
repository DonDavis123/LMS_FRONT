"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Building2, CheckCircle2, Contact2, ExternalLink, Info, Minus, Plus, Search, UserRound } from "lucide-react";
import { LeadService } from "@/features/leads/services/LeadService";
import Spinner from "@/shared/components/Spinner";
import type {
  ConversionCheckResponse,
  ConvertLeadPayload,
  Lead,
  MatchingAccount,
  MatchingContact,
} from "@/features/leads/types/lead.types";

interface LeadConvertProps { lead: Lead; }

/** Sentinel choice meaning "create a new record". Any other non-null value is an existing record id. */
const NEW = "__new__";
type Choice = string | null;

const SEARCH_THRESHOLD = 5;

/**
 * Only the user's two decisions (ids / "new") are kept in sessionStorage so
 * they survive a round-trip to an Account/Contact detail page. No lead,
 * account or contact data is stored, and the entry is cleared on convert/cancel.
 */
const storageKey = (leadId: string) => `crm.leadConvert.${leadId}`;

function readSavedChoices(leadId: string): { account: Choice; contact: Choice } | null {
  try {
    const raw = window.sessionStorage.getItem(storageKey(leadId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { account?: unknown; contact?: unknown };
    return {
      account: typeof parsed.account === "string" ? parsed.account : null,
      contact: typeof parsed.contact === "string" ? parsed.contact : null,
    };
  } catch {
    return null;
  }
}

function writeSavedChoices(leadId: string, account: Choice, contact: Choice) {
  try {
    window.sessionStorage.setItem(storageKey(leadId), JSON.stringify({ account, contact }));
  } catch {
    /* storage unavailable — state simply won't survive navigation */
  }
}

function clearSavedChoices(leadId: string) {
  try {
    window.sessionStorage.removeItem(storageKey(leadId));
  } catch {
    /* ignore */
  }
}

/** Picks a readable message out of a DRF-style error body without ever surfacing raw exceptions. */
function extractErrorMessage(error: unknown, fallback: string): string {
  const data = (error as { response?: { data?: unknown } } | null)?.response?.data;
  if (typeof data === "string" && data.length < 200 && !data.includes("<")) return data;
  if (data && typeof data === "object") {
    for (const value of Object.values(data as Record<string, unknown>)) {
      if (typeof value === "string") return value;
      if (Array.isArray(value) && typeof value[0] === "string") return value[0];
    }
  }
  return fallback;
}

function initialChoice(matches: { id: string }[], saved: Choice | undefined): Choice {
  if (saved === NEW) return NEW;
  if (saved && matches.some((m) => m.id === saved)) return saved;
  if (matches.length === 0) return NEW;
  // A single match is preselected; with several the user must pick explicitly.
  return matches.length === 1 ? matches[0].id : null;
}

export default function LeadConvert({ lead }: LeadConvertProps) {
  const router = useRouter();
  const hasCompany = Boolean(lead.company_name && lead.company_name.trim());
  const leadHref = `/dashboard/leads/${lead.id}`;

  const [checkResult, setCheckResult] = useState<ConversionCheckResponse | null>(null);
  const [isChecking, setIsChecking] = useState(true);
  const [checkError, setCheckError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [accountChoice, setAccountChoice] = useState<Choice>(null);
  const [contactChoice, setContactChoice] = useState<Choice>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submittingRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    setIsChecking(true);
    setCheckError(null);
    LeadService.checkConversion(lead.id)
      .then((result) => {
        if (cancelled) return;
        const saved = readSavedChoices(lead.id);
        setCheckResult(result);
        setAccountChoice(hasCompany ? initialChoice(result.accounts, saved?.account) : null);
        setContactChoice(initialChoice(result.contacts, saved?.contact));
      })
      .catch((err) => {
        if (cancelled) return;
        setCheckResult(null);
        setCheckError(extractErrorMessage(err, "Couldn't check for matching records. Try again."));
      })
      .finally(() => {
        if (!cancelled) setIsChecking(false);
      });
    return () => { cancelled = true; };
  }, [lead.id, hasCompany, reloadKey]);

  // Persist only the two decisions once the check has loaded (see storageKey docs).
  useEffect(() => {
    if (isChecking || checkError) return;
    writeSavedChoices(lead.id, accountChoice, contactChoice);
  }, [lead.id, isChecking, checkError, accountChoice, contactChoice]);

  // Account and Contact decisions are independent: neither setter touches the other.
  function changeAccountChoice(value: Choice) {
    setAccountChoice(value);
    setError(null);
  }

  function changeContactChoice(value: Choice) {
    setContactChoice(value);
    setError(null);
  }

  const accounts = checkResult?.accounts ?? [];
  const contacts = checkResult?.contacts ?? [];
  const selectedAccount = accounts.find((a) => a.id === accountChoice) ?? null;
  const selectedContact = contacts.find((c) => c.id === contactChoice) ?? null;

  async function handleConvert() {
    if (submittingRef.current) return;

    if (hasCompany && accountChoice === null) {
      setError("Select an existing Account or choose Create a new Account.");
      return;
    }
    if (hasCompany && accountChoice === NEW && !lead.company_name.trim()) {
      setError("A company name is required to create a new Account.");
      return;
    }
    if (contactChoice === null) {
      setError("Select an existing Contact or choose Create a new Contact.");
      return;
    }
    if (contactChoice === NEW && !lead.name?.trim()) {
      setError("A lead name is required to create a new Contact.");
      return;
    }

    const accountPart: Pick<ConvertLeadPayload, "account_action" | "account_id"> = !hasCompany
      ? { account_action: "skip" }
      : accountChoice === NEW
        ? { account_action: "create_new" }
        : { account_action: "use_existing", account_id: accountChoice as string };
    const contactPart: Pick<ConvertLeadPayload, "contact_action" | "contact_id"> =
      contactChoice === NEW
        ? { contact_action: "create_new" }
        : { contact_action: "use_existing", contact_id: contactChoice as string };
    const payload: ConvertLeadPayload = { ...accountPart, ...contactPart };

    submittingRef.current = true;
    setError(null);
    setIsSubmitting(true);
    try {
      await LeadService.convertLead(lead.id, payload);
      clearSavedChoices(lead.id);
      router.push(`${leadHref}?converted=1`);
    } catch (err) {
      setError(extractErrorMessage(err, "Couldn't convert this lead. Try again."));
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  }

  const accountSummary = !hasCompany
    ? { icon: <Minus size={14} />, text: "None — converted as a Contact only" }
    : accountChoice === NEW
      ? { icon: <Plus size={14} />, text: `New: ${lead.company_name}` }
      : selectedAccount
        ? { icon: <CheckCircle2 size={14} />, text: `Existing: ${selectedAccount.account_name}` }
        : { icon: <Minus size={14} />, text: "Not selected yet" };

  const contactSummary =
    contactChoice === NEW
      ? { icon: <Plus size={14} />, text: `New: ${lead.name || "Contact"}` }
      : selectedContact
        ? { icon: <CheckCircle2 size={14} />, text: `Existing: ${selectedContact.name}` }
        : { icon: <Minus size={14} />, text: "Not selected yet" };

  return (
    <div className="mx-auto max-w-4xl">
      <Link href={leadHref} className="text-sm text-slate hover:text-fg">← Back to Lead</Link>

      <div className="mt-3 rounded-lg border border-line bg-surface">
        <div className="border-b border-line px-6 py-5">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-light text-slate">
              <UserRound size={19} />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">Lead Conversion</p>
              <h1 className="mt-1 font-serif text-2xl text-fg">Convert {lead.name || "Lead"}</h1>
              <p className="mt-1 text-sm text-ink-soft">
                {hasCompany ? <>Company: <span className="text-fg">{lead.company_name}</span> · </> : "No company · "}
                Choose what to do with the Account and the Contact. Each decision is independent.
              </p>
            </div>
          </div>
        </div>

        {error && (
          <p role="alert" className="mx-6 mt-5 rounded-md border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p>
        )}

        {isChecking ? (
          <div className="space-y-4 p-6" aria-busy="true">
            <div className="h-36 animate-shimmer rounded-lg" />
            <div className="h-36 animate-shimmer rounded-lg" />
          </div>
        ) : checkError ? (
          <div className="space-y-3 p-6">
            <p role="alert" className="rounded-md border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger">{checkError}</p>
            <button type="button" onClick={() => setReloadKey((k) => k + 1)} className="rounded-md border border-line px-4 py-2 text-sm font-medium text-fg hover:bg-paper">
              Retry
            </button>
          </div>
        ) : (
          <div className="space-y-5 p-6">
            <Step
              number={1}
              icon={<Building2 size={18} />}
              title="Account"
              count={hasCompany ? accounts.length : 0}
            >
              {hasCompany ? (
                <MatchGroup<MatchingAccount>
                  kind="Account"
                  groupName="account-choice"
                  matches={accounts}
                  choice={accountChoice}
                  onChoice={changeAccountChoice}
                  emptyText="No possible existing Account was found. You can create a new Account."
                  getViewHref={(a) => `/dashboard/accounts/${a.id}`}
                  getSearchText={(a) => `${a.account_name} ${a.website ?? ""} ${a.phone ?? ""}`}
                  renderMatch={(a) => (
                    <>
                      <span className="font-medium text-fg">{a.account_name}</span>
                      <span className="text-xs text-ink-soft">{a.website || "No website"} · {a.phone || "No phone"}</span>
                    </>
                  )}
                  newTitle="Create a new Account"
                  newDescription={`A new Account will be created from the lead's company: ${lead.company_name}.`}
                />
              ) : (
                <Notice>
                  <span className="font-medium text-fg">No Account is required for this Lead.</span>{" "}
                  This Lead has no company name, so it can be converted as a Contact only.
                </Notice>
              )}

              {hasCompany && selectedAccount && contacts.length === 0 && (
                <Notice tone="positive">
                  <span className="font-medium text-fg">This Account can be reused.</span>{" "}
                  You can create a new Contact for this Account.
                </Notice>
              )}
            </Step>

            <Step
              number={2}
              icon={<Contact2 size={18} />}
              title="Contact"
              count={contacts.length}
            >
              <MatchGroup<MatchingContact>
                kind="Contact"
                groupName="contact-choice"
                matches={contacts}
                choice={contactChoice}
                onChoice={changeContactChoice}
                emptyText="No possible existing Contact was found. You can create a new Contact."
                getViewHref={(c) => `/dashboard/contacts/${c.id}`}
                getSearchText={(c) => `${c.name} ${c.email ?? ""} ${c.phone ?? ""} ${c.mobile ?? ""}`}
                renderMatch={(c) => (
                  <>
                    <span className="font-medium text-fg">{c.name}</span>
                    <span className="text-xs text-ink-soft">{c.email || "No email"} · {c.mobile || c.phone || "No phone"}</span>
                  </>
                )}
                newTitle="Create a new Contact"
                newDescription={
                  hasCompany && accountChoice !== NEW && selectedAccount
                    ? `A new Contact (${lead.name || "from this lead"}) will be created under ${selectedAccount.account_name}.`
                    : `A new Contact will be created from the lead: ${lead.name || "this lead"}.`
                }
              />

              {hasCompany && selectedAccount && contacts.length === 0 && contactChoice === NEW && (
                <Notice>
                  Account selected. No matching Contact was found. A new Contact will be created under this Account.
                </Notice>
              )}
              {selectedContact && (
                <Notice>The selected Contact will be used for this conversion.</Notice>
              )}
            </Step>

            <section aria-label="Conversion summary" className="rounded-lg border border-line bg-paper px-4 py-4">
              <h2 className="text-sm font-semibold text-fg">Conversion Summary</h2>
              <dl className="mt-3 grid gap-3 sm:grid-cols-2">
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-ink-soft">Account</dt>
                  <dd className="mt-1 flex items-center gap-2 text-sm text-fg">{accountSummary.icon}{accountSummary.text}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-ink-soft">Contact</dt>
                  <dd className="mt-1 flex items-center gap-2 text-sm text-fg">{contactSummary.icon}{contactSummary.text}</dd>
                </div>
              </dl>
            </section>
          </div>
        )}

        <div className="flex justify-end gap-3 border-t border-line px-6 py-4">
          <Link
            href={leadHref}
            onClick={() => clearSavedChoices(lead.id)}
            className="rounded-md border border-line px-4 py-2 text-sm font-medium text-fg hover:bg-paper"
          >
            Cancel
          </Link>
          <button
            type="button"
            onClick={handleConvert}
            disabled={isSubmitting || isChecking || Boolean(checkError)}
            className="flex items-center gap-2 rounded-md bg-ink px-5 py-2 text-sm font-semibold text-white hover:bg-ink-2 disabled:opacity-60"
          >
            {isSubmitting && <Spinner size="sm" className="border-white/30 border-t-white" />}
            {isSubmitting ? "Converting…" : "Convert Lead"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Step({
  number,
  icon,
  title,
  count,
  children,
}: {
  number: number;
  icon: React.ReactNode;
  title: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-line bg-surface">
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-fg">
          {icon}
          {number}. {title}
        </h2>
        {count > 0 && <span className="text-xs text-ink-soft">{count} possible match{count === 1 ? "" : "es"}</span>}
      </div>
      <div className="space-y-3 p-4">{children}</div>
    </section>
  );
}

function Notice({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "positive" }) {
  return (
    <div className={`flex items-start gap-2 rounded-md px-3 py-2.5 text-sm text-ink-soft ${tone === "positive" ? "bg-slate-light/40 border border-slate/30" : "bg-paper"}`}>
      <Info size={15} className="mt-0.5 shrink-0 text-slate" aria-hidden="true" />
      <p>{children}</p>
    </div>
  );
}

/**
 * One radio group per section: each existing match is an option, plus a final
 * "Create a new …" option. Selecting (radio) and inspecting (View link) are
 * separate controls, so choosing a record never navigates away.
 */
function MatchGroup<T extends { id: string }>({
  kind,
  groupName,
  matches,
  choice,
  onChoice,
  emptyText,
  getViewHref,
  getSearchText,
  renderMatch,
  newTitle,
  newDescription,
}: {
  kind: "Account" | "Contact";
  groupName: string;
  matches: T[];
  choice: Choice;
  onChoice: (value: Choice) => void;
  emptyText: string;
  getViewHref: (match: T) => string;
  getSearchText: (match: T) => string;
  renderMatch: (match: T) => React.ReactNode;
  newTitle: string;
  newDescription: string;
}) {
  const [query, setQuery] = useState("");
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return matches;
    return matches.filter((m) => getSearchText(m).toLowerCase().includes(q));
  }, [matches, query, getSearchText]);

  const optionClass = (selected: boolean) =>
    `rounded-md border p-3 ${selected ? "border-slate bg-slate-light/40" : "border-line hover:bg-paper"}`;

  return (
    <div role="radiogroup" aria-label={`${kind} choice`} className="space-y-2">
      {matches.length === 0 && <p className="text-sm text-ink-soft">{emptyText}</p>}

      {matches.length > SEARCH_THRESHOLD && (
        <div className="relative">
          <Search size={14} className="absolute left-3 top-2.5 text-ink-soft" aria-hidden="true" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-label={`Search ${kind.toLowerCase()} matches`}
            className="w-full rounded-md border border-line bg-surface py-2 pl-9 pr-3 text-sm outline-none focus:border-slate"
            placeholder={`Search ${kind.toLowerCase()} matches…`}
          />
        </div>
      )}

      {visible.map((match) => {
        const selected = choice === match.id;
        return (
          <div key={match.id} className={`flex flex-wrap items-start justify-between gap-3 ${optionClass(selected)}`}>
            <label className="flex min-w-0 flex-1 cursor-pointer items-start gap-3">
              <input
                type="radio"
                name={groupName}
                checked={selected}
                onChange={() => onChoice(match.id)}
                className="mt-1 h-4 w-4 shrink-0 accent-ink"
              />
              <span className="flex min-w-0 flex-col">
                <span className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
                  {selected ? `✓ Selected ${kind}` : `Select this ${kind}`}
                </span>
                {renderMatch(match)}
              </span>
            </label>
            <Link
              href={getViewHref(match)}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-line px-3 py-1.5 text-xs font-medium text-fg hover:bg-paper"
            >
              View {kind}
              <ExternalLink size={12} aria-hidden="true" />
            </Link>
          </div>
        );
      })}
      {matches.length > 0 && visible.length === 0 && <p className="px-1 text-sm text-ink-soft">No matching records.</p>}

      <label className={`flex cursor-pointer items-start gap-3 ${optionClass(choice === NEW)}`}>
        <input
          type="radio"
          name={groupName}
          checked={choice === NEW}
          onChange={() => onChoice(NEW)}
          className="mt-1 h-4 w-4 shrink-0 accent-ink"
        />
        <span className="min-w-0">
          <span className="block text-sm font-medium text-fg">{newTitle}</span>
          <span className="mt-0.5 block text-xs text-ink-soft">{newDescription}</span>
        </span>
      </label>
    </div>
  );
}
