"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, CheckCircle2, Contact2, Search, UserRound } from "lucide-react";
import { LeadService } from "@/features/leads/services/LeadService";
import Spinner from "@/shared/components/Spinner";
import type {
  ConversionAction,
  ConversionCheckResponse,
  Lead,
  MatchingAccount,
  MatchingContact,
} from "@/features/leads/types/lead.types";

interface LeadConvertProps { lead: Lead; }

export default function LeadConvert({ lead }: LeadConvertProps) {
  const router = useRouter();
  const [checkResult, setCheckResult] = useState<ConversionCheckResponse | null>(null);
  const [isChecking, setIsChecking] = useState(true);
  const [accountAction, setAccountAction] = useState<ConversionAction>("create_new");
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [newAccountName, setNewAccountName] = useState(lead.company_name || "");
  const [contactAction, setContactAction] = useState<ConversionAction>("create_new");
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [newContactName, setNewContactName] = useState(lead.name || "");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    LeadService.checkConversion(lead.id)
      .then((result) => {
        if (cancelled) return;
        setCheckResult(result);
        if (result.accounts.length > 0) {
          setAccountAction("use_existing");
          setSelectedAccountId(result.accounts[0].id);
        }
        if (result.contacts.length > 0) {
          setContactAction("use_existing");
          setSelectedContactId(result.contacts[0].id);
        }
      })
      .catch(() => {
        if (!cancelled) setCheckResult({ lead_id: lead.id, accounts: [], contacts: [] });
      })
      .finally(() => {
        if (!cancelled) setIsChecking(false);
      });
    return () => { cancelled = true; };
  }, [lead.id]);

  async function handleConvert() {
    if (accountAction === "use_existing" && !selectedAccountId) {
      setError("Select an existing account or choose Create New Account.");
      return;
    }
    if (contactAction === "use_existing" && !selectedContactId) {
      setError("Select an existing contact or choose Create New Contact.");
      return;
    }
    if (accountAction === "create_new" && !newAccountName.trim()) {
      setError("Account name is required.");
      return;
    }
    if (contactAction === "create_new" && !newContactName.trim()) {
      setError("Contact name is required.");
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      await LeadService.convertLead(lead.id, {
        account_action: accountAction,
        ...(accountAction === "use_existing"
          ? { account_id: selectedAccountId! }
          : { account_name: newAccountName.trim() }),
        contact_action: contactAction,
        ...(contactAction === "use_existing"
          ? { contact_id: selectedContactId! }
          : { contact_name: newContactName.trim() }),
      });
      router.push(`/dashboard/leads/${lead.id}?converted=1`);
    } catch {
      setError("Couldn't convert this lead. Try again.");
      setIsSubmitting(false);
    }
  }

  const accounts = checkResult?.accounts ?? [];
  const contacts = checkResult?.contacts ?? [];

  return (
    <div className="mx-auto max-w-4xl">
      <button onClick={() => router.back()} className="text-sm text-slate hover:text-fg">← Back to Lead</button>

      <div className="mt-3 rounded-lg border border-line bg-surface">
        <div className="border-b border-line px-6 py-5">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-light text-slate">
              <UserRound size={19} />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">Lead Conversion</p>
              <h1 className="mt-1 font-serif text-2xl text-fg">Convert {lead.name || "Lead"}</h1>
              <p className="mt-1 text-sm text-ink-soft">Review the matching records before creating or linking the Account and Contact.</p>
            </div>
          </div>
        </div>

        {error && <p className="mx-6 mt-5 rounded-md border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p>}

        {isChecking ? (
          <div className="space-y-4 p-6">
            <div className="h-36 animate-shimmer rounded-lg" />
            <div className="h-36 animate-shimmer rounded-lg" />
          </div>
        ) : (
          <div className="space-y-5 p-6">
            <ConversionSection
              icon={<Building2 size={18} />}
              label="Account"
              matches={accounts}
              action={accountAction}
              selectedId={selectedAccountId}
              newName={newAccountName}
              newPlaceholder={lead.company_name || "Company name"}
              onActionChange={setAccountAction}
              onSelect={setSelectedAccountId}
              onNewNameChange={setNewAccountName}
              renderMatch={(account) => (
                <>
                  <span className="font-medium text-fg">{account.account_name}</span>
                  <span className="text-xs text-ink-soft">{account.website || "No website"} · {account.phone || "No phone"}</span>
                </>
              )}
            />

            <ConversionSection
              icon={<Contact2 size={18} />}
              label="Contact"
              matches={contacts}
              action={contactAction}
              selectedId={selectedContactId}
              newName={newContactName}
              newPlaceholder={lead.name || "Contact name"}
              onActionChange={setContactAction}
              onSelect={setSelectedContactId}
              onNewNameChange={setNewContactName}
              renderMatch={(contact) => (
                <>
                  <span className="font-medium text-fg">{contact.name}</span>
                  <span className="text-xs text-ink-soft">{contact.email || "No email"} · {contact.mobile || contact.phone || "No phone"}</span>
                </>
              )}
            />

            <div className="rounded-md bg-paper px-4 py-3 text-xs text-ink-soft">
              <span className="font-medium text-fg">What happens next?</span> The selected Account and Contact will be linked to the converted lead according to your choices above.
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3 border-t border-line px-6 py-4">
          <button type="button" onClick={() => router.back()} className="rounded-md border border-line px-4 py-2 text-sm font-medium text-fg hover:bg-paper">Cancel</button>
          <button type="button" onClick={handleConvert} disabled={isSubmitting || isChecking} className="flex items-center gap-2 rounded-md bg-ink px-5 py-2 text-sm font-semibold text-white hover:bg-ink-2 disabled:opacity-60">
            {isSubmitting && <Spinner size="sm" className="border-white/30 border-t-white" />}
            {isSubmitting ? "Converting…" : "Convert"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ConversionSection<T extends MatchingAccount | MatchingContact>({
  icon,
  label,
  matches,
  action,
  selectedId,
  newName,
  newPlaceholder,
  onActionChange,
  onSelect,
  onNewNameChange,
  renderMatch,
}: {
  icon: React.ReactNode;
  label: string;
  matches: T[];
  action: ConversionAction;
  selectedId: string | null;
  newName: string;
  newPlaceholder: string;
  onActionChange: (action: ConversionAction) => void;
  onSelect: (id: string) => void;
  onNewNameChange: (value: string) => void;
  renderMatch: (match: T) => React.ReactNode;
}) {
  const [query, setQuery] = useState("");
  const filteredMatches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return matches;
    return matches.filter((match) => JSON.stringify(match).toLowerCase().includes(q));
  }, [matches, query]);

  return (
    <section className="rounded-lg border border-line bg-surface">
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-fg">{icon}{label}</div>
        {matches.length > 0 && <span className="text-xs text-ink-soft">{matches.length} possible match{matches.length === 1 ? "" : "es"}</span>}
      </div>

      <div className="space-y-3 p-4">
        {matches.length > 0 && (
          <label className={`block cursor-pointer rounded-md border p-3 ${action === "use_existing" ? "border-slate bg-slate-light/40" : "border-line hover:bg-paper"}`}>
            <div className="flex items-start gap-3">
              <input type="radio" checked={action === "use_existing"} onChange={() => onActionChange("use_existing")} className="mt-1 h-4 w-4 accent-ink" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-fg">Use an existing {label}</p>
                <p className="mt-0.5 text-xs text-ink-soft">Select the record that should receive this converted lead.</p>
              </div>
            </div>
          </label>
        )}

        {matches.length > 0 && action === "use_existing" && (
          <div className="space-y-2 pl-7">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-2.5 text-ink-soft" />
              <input value={query} onChange={(event) => setQuery(event.target.value)} className="w-full rounded-md border border-line bg-surface py-2 pl-9 pr-3 text-sm outline-none focus:border-slate" placeholder={`Search ${label.toLowerCase()} matches…`} />
            </div>
            <div className="max-h-48 space-y-1 overflow-y-auto rounded-md border border-line p-1">
              {filteredMatches.map((match) => (
                <button key={match.id} type="button" onClick={() => onSelect(match.id)} className={`flex w-full items-start gap-3 rounded-md px-3 py-2 text-left ${selectedId === match.id ? "bg-slate-light" : "hover:bg-paper"}`}>
                  <span className={`mt-1 h-3.5 w-3.5 shrink-0 rounded-full border ${selectedId === match.id ? "border-4 border-slate" : "border-line"}`} />
                  <span className="flex min-w-0 flex-col">{renderMatch(match)}</span>
                </button>
              ))}
              {filteredMatches.length === 0 && <p className="px-3 py-2 text-sm text-ink-soft">No matching records.</p>}
            </div>
          </div>
        )}

        <label className={`block cursor-pointer rounded-md border p-3 ${action === "create_new" ? "border-slate bg-slate-light/40" : "border-line hover:bg-paper"}`}>
          <div className="flex items-start gap-3">
            <input type="radio" checked={action === "create_new"} onChange={() => onActionChange("create_new")} className="mt-1 h-4 w-4 accent-ink" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-fg">Create a new {label}</p>
              <p className="mt-0.5 text-xs text-ink-soft">Use the lead details as the starting values.</p>
            </div>
          </div>
          {action === "create_new" && (
            <input value={newName} onChange={(event) => onNewNameChange(event.target.value)} onClick={(event) => event.stopPropagation()} className="mt-3 w-full rounded-md border border-line bg-surface px-3 py-2.5 text-sm outline-none focus:border-slate" placeholder={newPlaceholder} />
          )}
        </label>
      </div>
    </section>
  );
}
