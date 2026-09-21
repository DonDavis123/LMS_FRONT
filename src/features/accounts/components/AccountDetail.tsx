"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, MoreVertical } from "lucide-react";
import { AccountService } from "@/features/accounts/services/AccountService";
import type { Account } from "@/features/accounts/types/account.types";
import RecordTimeline from "@/shared/components/RecordTimeline";
import InlineEditRow from "@/shared/components/InlineEditRow";
import { Tabs } from "@/shared/components/Tabs";
import { RecordSection } from "@/shared/components/RecordSection";
import { formatDateTime } from "@/shared/utils/formatDate";
import { ACCOUNT_OWNERSHIP_OPTIONS, type AccountContactSummary } from "@/features/accounts/types/account.types";
import { ContactService } from "@/features/contacts/services/ContactService";
import CreateTaskFromRecord from "@/shared/components/CreateTaskFromRecord";

import { confirmDelete } from "@/shared/utils/confirmDelete";

interface AccountDetailProps {
  account: Account;
  onAccountChange?: (account: Account) => void;
}

type DetailTab = "overview" | "timeline";

export default function AccountDetail({ account, onAccountChange }: AccountDetailProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<DetailTab>("overview");
  const [showDetails, setShowDetails] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [associatedContacts, setAssociatedContacts] = useState<AccountContactSummary[]>(account.contacts ?? []);

  useEffect(() => {
    if (account.contacts?.length) { setAssociatedContacts(account.contacts); return; }
    ContactService.getContacts().then((rows) => {
      setAssociatedContacts(rows.filter((contact) => contact.account_id === account.id).map((contact) => ({ id: contact.id, name: contact.name, email: contact.email, phone: contact.phone, mobile: contact.mobile })));
    }).catch(() => setAssociatedContacts([]));
  }, [account.contacts, account.id]);

  async function updateField(field: string, raw: string) {
    if (!onAccountChange) return;

    const numeric = field === "annual_revenue" || field === "employees";
    const value = numeric
      ? raw.trim()
        ? Number(raw)
        : null
      : raw.trim()
        ? raw
        : null;

    if (numeric && raw.trim() && Number.isNaN(value)) {
      throw new Error("Invalid number");
    }

    // The Accounts update endpoint uses PUT and expects the complete
    // account payload. Inline editing sends only one changed field, so
    // merge that field with the current record before sending it.
    const payload = {
      owner_id: account.account_owner_id,
      account_name: account.account_name,
      account_site: account.account_site,
      account_number: account.account_number,
      account_type: account.account_type,
      industry: account.industry,
      annual_revenue: account.annual_revenue,
      rating: account.rating,
      phone: account.phone,
      website: account.website,
      ticker_symbol: account.ticker_symbol,
      ownership: account.ownership,
      employees: account.employees,
      sic_code: account.sic_code,
      billing_address: account.billing_address,
      billing_city: account.billing_city,
      billing_state: account.billing_state,
      billing_country: account.billing_country,
      billing_postal_code: account.billing_postal_code,
      description: account.description,
      [field]: value,
    };

    await AccountService.updateAccount(account.id, payload);
    onAccountChange(await AccountService.getAccount(account.id));
  }

  async function handleDelete() {
    setIsMenuOpen(false);
    if (!await confirmDelete(`Delete ${account.account_name}?`)) return;
    try {
      await AccountService.deleteAccount(account.id);
      router.push("/dashboard/accounts");
    } catch {
      window.alert("Couldn't delete this account. Try again.");
    }
  }

  return (
    <div className="mx-auto max-w-5xl">
      <Link href="/dashboard/accounts" className="text-sm text-slate hover:text-fg">
        ← Back to Accounts
      </Link>

      <div className="mt-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-light text-lg font-semibold text-slate">
            {account.account_name?.trim()?.charAt(0).toUpperCase() || "?"}
          </div>
          <div>
            <h1 className="font-serif text-2xl text-fg">{account.account_name || "Unnamed Account"}</h1>
            <p className="text-sm text-ink-soft">{account.industry || "Account"}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <CreateTaskFromRecord related={{ personType: "", personId: "", personLabel: "", accountId: account.id, accountLabel: account.account_name }} />
          <Link
            href={`/dashboard/accounts/${account.id}?edit=1`}
            className="rounded-md border border-line px-4 py-2 text-sm font-medium text-fg hover:bg-paper"
          >
            Edit
          </Link>
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsMenuOpen((v) => !v)}
              className="rounded-md border border-line p-2 text-ink-soft hover:bg-paper"
              aria-label="Account actions"
            >
              <MoreVertical size={16} />
            </button>
            {isMenuOpen && (
              <div className="absolute right-0 top-full z-20 mt-1 w-36 rounded-md border border-line bg-surface py-1 shadow-lg">
                <button
                  type="button"
                  onClick={() => router.push(`/dashboard/accounts/${account.id}?edit=1`)}
                  className="block w-full px-3 py-2 text-left text-sm text-fg hover:bg-paper"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  className="block w-full px-3 py-2 text-left text-sm text-danger hover:bg-danger-soft"
                >
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <Tabs
        tabs={[
          { value: "overview", label: "Overview" },
          { value: "timeline", label: "Timeline" },
        ]}
        active={activeTab}
        onChange={setActiveTab}
      />

      {activeTab === "timeline" ? (
        <RecordTimeline module="accounts" recordId={account.id} />
      ) : (
        <div className="animate-fade-in">
          <div className="mt-4 rounded-lg border border-line bg-surface p-6">
            <h2 className="mb-4 text-xs font-semibold uppercase tracking-wide text-ink-soft">Overview</h2>
            <div className="grid grid-cols-1 gap-y-3 sm:grid-cols-2">
              <Row label="Account Owner" value={account.account_owner_name} editable={false} />
              <Row label="Website" value={account.website} onSave={(raw) => updateField("website", raw)} />
              <Row label="Phone" value={account.phone} onSave={(raw) => updateField("phone", raw)} />
              <Row label="Industry" value={account.industry} onSave={(raw) => updateField("industry", raw)} />
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowDetails((v) => !v)}
            className="mt-4 flex items-center gap-1 text-sm font-medium text-slate hover:text-fg"
          >
            {showDetails ? "Hide Details" : "Show Details"}
            <ChevronDown size={14} className={`transition ${showDetails ? "rotate-180" : ""}`} />
          </button>

          <div className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${showDetails ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
            <div className="overflow-hidden">
              <div className="mt-4 space-y-4">
                <RecordSection title="Account Information">
                  <Row label="Account Owner" value={account.account_owner_name} editable={false} />
                  <Row label="Account Name" value={account.account_name} onSave={(raw) => updateField("account_name", raw)} />
                  <Row label="Account Site" value={account.account_site} onSave={(raw) => updateField("account_site", raw)} />
                  <Row label="Account Number" value={account.account_number} onSave={(raw) => updateField("account_number", raw)} />
                  <Row label="Account Type" value={account.account_type} onSave={(raw) => updateField("account_type", raw)} />
                  <Row label="Ownership" value={account.ownership} type="select" options={ACCOUNT_OWNERSHIP_OPTIONS.map(value => ({value,label:value}))} onSave={(raw) => updateField("ownership", raw)} />
                  <Row label="Website" value={account.website} onSave={(raw) => updateField("website", raw)} />
                  <Row label="Phone" value={account.phone} onSave={(raw) => updateField("phone", raw)} />
                  <Row label="Industry" value={account.industry} onSave={(raw) => updateField("industry", raw)} />
                  <Row label="Rating" value={account.rating} onSave={(raw) => updateField("rating", raw)} />
                  <Row label="No. of Employees" value={account.employees} type="number" onSave={(raw) => updateField("employees", raw)} />
                  <Row label="Annual Revenue" value={account.annual_revenue} type="number" onSave={(raw) => updateField("annual_revenue", raw)} />
                  <Row label="Ticker Symbol" value={account.ticker_symbol} onSave={(raw) => updateField("ticker_symbol", raw)} />
                  <Row label="SIC Code" value={account.sic_code} onSave={(raw) => updateField("sic_code", raw)} />
                </RecordSection>

                <RecordSection title="Billing Address">
                  <Row label="Billing Address" value={account.billing_address} onSave={(raw) => updateField("billing_address", raw)} />
                  <Row label="Billing City" value={account.billing_city} onSave={(raw) => updateField("billing_city", raw)} />
                  <Row label="Billing State" value={account.billing_state} onSave={(raw) => updateField("billing_state", raw)} />
                  <Row label="Billing Country" value={account.billing_country} onSave={(raw) => updateField("billing_country", raw)} />
                  <Row label="Billing Postal Code" value={account.billing_postal_code} onSave={(raw) => updateField("billing_postal_code", raw)} />
                </RecordSection>

                <RecordSection title="Description Information">
                  <Row label="Description" value={account.description} type="textarea" onSave={(raw) => updateField("description", raw)} fullWidth />
                </RecordSection>

          <div className="mt-4 rounded-lg border border-line bg-surface p-6">
            <h3 className="mb-4 text-xs font-semibold uppercase tracking-wide text-ink-soft">Associated Contacts</h3>
            {associatedContacts.length === 0 ? (
              <p className="text-sm text-ink-soft">No contacts are associated with this account.</p>
            ) : (
              <div className="divide-y divide-line">
                {associatedContacts.map((contact) => (
                  <Link key={contact.id} href={`/dashboard/contacts/${contact.id}`} className="flex items-center justify-between gap-4 py-3 hover:bg-paper">
                    <div><p className="text-sm font-medium text-slate">{contact.name}</p><p className="text-xs text-ink-soft">{contact.email || contact.phone || contact.mobile || "No contact details"}</p></div>
                    <span className="text-xs text-ink-soft">View</span>
                  </Link>
                ))}
              </div>
            )}
          </div>

                <RecordSection title="System Information">
                  <Row label="Created At" value={formatDateTime(account.created_at)} editable={false} />
                  <Row label="Updated At" value={formatDateTime(account.updated_at)} editable={false} />
                </RecordSection>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, value, fullWidth = false, type = "text", options = [], editable = true, onSave }: {
  label: string; value?: string | number | null; fullWidth?: boolean; type?: "text" | "date" | "number" | "textarea" | "select";
  options?: { value: string; label: string }[]; editable?: boolean; onSave?: (raw: string) => Promise<void>;
}) {
  return <InlineEditRow label={label} value={value} fullWidth={fullWidth} type={type} options={options} editable={editable} onSave={onSave} />;
}
