"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, MoreVertical } from "lucide-react";
import { ContactService } from "@/features/contacts/services/ContactService";
import type { Contact } from "@/features/contacts/types/contact.types";
import RecordTimeline from "@/shared/components/RecordTimeline";
import InlineEditRow from "@/shared/components/InlineEditRow";
import { Tabs } from "@/shared/components/Tabs";
import { RecordSection } from "@/shared/components/RecordSection";
import { formatDateTime } from "@/shared/utils/formatDate";

import CreateTaskFromRecord from "@/shared/components/CreateTaskFromRecord";
import { confirmDelete } from "@/shared/utils/confirmDelete";

interface ContactDetailProps { contact: Contact; onContactChange?: (contact: Contact) => void; }
type DetailTab = "overview" | "timeline";

export default function ContactDetail({ contact, onContactChange }: ContactDetailProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<DetailTab>("overview");
  const [showDetails, setShowDetails] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  async function updateField(field: string, raw: string) {
    if (!onContactChange) return;
    let value: unknown = raw.trim() ? raw : null;
    if (field === "email_opt_out") value = raw === "true";
    await ContactService.updateContact(contact.id, { [field]: value } as never);
    onContactChange(await ContactService.getContact(contact.id));
  }

  async function handleDelete() {
    setIsMenuOpen(false);
    if (!await confirmDelete(`Delete ${contact.name}?`)) return;
    try {
      await ContactService.deleteContact(contact.id);
      router.push("/dashboard/contacts");
    } catch {
      window.alert("Couldn't delete this contact. Try again.");
    }
  }

  return (
    <div className="mx-auto max-w-5xl">
      <Link href="/dashboard/contacts" className="text-sm text-slate hover:text-fg">← Back to Contacts</Link>

      <div className="mt-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-light text-lg font-semibold text-slate">
            {(contact.name || contact.email || "?").slice(0, 1).toUpperCase()}
          </div>
          <div>
            <h1 className="font-serif text-2xl text-fg">{contact.name || "Unnamed Contact"}</h1>
            <p className="text-sm text-ink-soft">{contact.account_name || contact.title || "Contact"}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <CreateTaskFromRecord related={{ personType: "contact", personId: contact.id, personLabel: contact.name || contact.email || "Contact", accountId: contact.account_id || "", accountLabel: contact.account_name || "" }} />
          <Link href={`/dashboard/contacts/${contact.id}?edit=1`} className="rounded-md border border-line px-4 py-2 text-sm font-medium text-fg hover:bg-paper">Edit</Link>
          <div className="relative">
            <button type="button" onClick={() => setIsMenuOpen((v) => !v)} className="rounded-md border border-line p-2 text-ink-soft hover:bg-paper" aria-label="Contact actions">
              <MoreVertical size={16} />
            </button>
            {isMenuOpen && (
              <div className="absolute right-0 top-full z-20 mt-1 w-36 rounded-md border border-line bg-surface py-1 shadow-lg">
                <button type="button" onClick={() => router.push(`/dashboard/contacts/${contact.id}?edit=1`)} className="block w-full px-3 py-2 text-left text-sm text-fg hover:bg-paper">Edit</button>
                <button type="button" onClick={handleDelete} className="block w-full px-3 py-2 text-left text-sm text-danger hover:bg-danger-soft">Delete</button>
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
        <RecordTimeline module="contacts" recordId={contact.id} />
      ) : (
        <div className="animate-fade-in">
          <div className="mt-4 rounded-lg border border-line bg-surface p-6">
            <h2 className="mb-4 text-xs font-semibold uppercase tracking-wide text-ink-soft">Overview</h2>
            <div className="grid grid-cols-1 gap-y-3 sm:grid-cols-2">
              <Row label="Contact Owner" value={contact.contact_owner_name} editable={false} />
              <Row label="Account" value={contact.account_name} editable={false} />
              <Row label="Email" value={contact.email} onSave={(raw) => updateField("email", raw)} />
              <Row label="Phone" value={contact.phone} onSave={(raw) => updateField("phone", raw)} />
              <Row label="Mobile" value={contact.mobile} onSave={(raw) => updateField("mobile", raw)} />
              <Row label="Title" value={contact.title} onSave={(raw) => updateField("title", raw)} />
            </div>
          </div>

          <button type="button" onClick={() => setShowDetails((v) => !v)} className="mt-4 flex items-center gap-1 text-sm font-medium text-slate hover:text-fg">
            {showDetails ? "Hide Details" : "Show Details"}
            <ChevronDown size={14} className={`transition ${showDetails ? "rotate-180" : ""}`} />
          </button>

          <div className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${showDetails ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
            <div className="overflow-hidden">
              <div className="mt-4 space-y-4">
                <RecordSection title="Contact Information">
                  <Row label="Contact Owner" value={contact.contact_owner_name} editable={false} />
                  <Row label="Account Name" value={contact.account_name} editable={false} />
                  <Row label="Name" value={contact.name} onSave={(raw) => updateField("name", raw)} />
                  <Row label="Title" value={contact.title} onSave={(raw) => updateField("title", raw)} />
                  <Row label="Email" value={contact.email} onSave={(raw) => updateField("email", raw)} />
                  <Row label="Secondary Email" value={contact.secondary_email} onSave={(raw) => updateField("secondary_email", raw)} />
                  <Row label="Phone" value={contact.phone} onSave={(raw) => updateField("phone", raw)} />
                  <Row label="Mobile" value={contact.mobile} onSave={(raw) => updateField("mobile", raw)} />
                  <Row label="Home Phone" value={contact.home_phone} onSave={(raw) => updateField("home_phone", raw)} />
                  <Row label="Other Phone" value={contact.other_phone} onSave={(raw) => updateField("other_phone", raw)} />
                  <Row label="Department" value={contact.department} onSave={(raw) => updateField("department", raw)} />
                  <Row label="Lead Source" value={contact.lead_source} onSave={(raw) => updateField("lead_source", raw)} />
                  <Row label="Vendor Name" value={contact.vendor_name} onSave={(raw) => updateField("vendor_name", raw)} />
                  <Row label="Date of Birth" value={contact.date_of_birth} type="date" onSave={(raw) => updateField("date_of_birth", raw)} />
                  <Row label="Assistant" value={contact.assistant} onSave={(raw) => updateField("assistant", raw)} />
                  <Row label="Assistant Phone" value={contact.assistant_phone} onSave={(raw) => updateField("assistant_phone", raw)} />
                  <Row label="Reporting To" value={contact.reporting_to_name} editable={false} />
                  <Row label="Email Opt Out" value={contact.email_opt_out ? "true" : "false"} displayValue={contact.email_opt_out ? "Yes" : "No"} type="select" options={[{value:"false",label:"No"},{value:"true",label:"Yes"}]} onSave={(raw) => updateField("email_opt_out", raw)} />
                </RecordSection>
                <RecordSection title="Address Information">
                  <Row label="Mailing Address" value={contact.mailing_address} onSave={(raw) => updateField("mailing_address", raw)} />
                  <Row label="Mailing City" value={contact.mailing_city} onSave={(raw) => updateField("mailing_city", raw)} />
                  <Row label="Mailing State" value={contact.mailing_state} onSave={(raw) => updateField("mailing_state", raw)} />
                  <Row label="Mailing Country" value={contact.mailing_country} onSave={(raw) => updateField("mailing_country", raw)} />
                  <Row label="Mailing Postal Code" value={contact.mailing_postal_code} onSave={(raw) => updateField("mailing_postal_code", raw)} />
                  <Row label="Other Address" value={contact.other_address} onSave={(raw) => updateField("other_address", raw)} />
                </RecordSection>
                <RecordSection title="Description Information"><Row label="Description" value={contact.description} type="textarea" onSave={(raw) => updateField("description", raw)} fullWidth /></RecordSection>
                <RecordSection title="System Information">
                  <Row label="Created At" value={formatDateTime(contact.created_at)} editable={false} />
                  <Row label="Updated At" value={formatDateTime(contact.updated_at)} editable={false} />
                </RecordSection>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, value, fullWidth = false, type = "text", options = [], editable = true, displayValue, onSave }: {
  label: string; value?: string | number | null; fullWidth?: boolean; type?: "text" | "date" | "number" | "textarea" | "select";
  options?: { value: string; label: string }[]; editable?: boolean; displayValue?: string; onSave?: (raw: string) => Promise<void>;
}) {
  return <InlineEditRow label={label} value={value} displayValue={displayValue} fullWidth={fullWidth} type={type} options={options} editable={editable} onSave={onSave} />;
}
