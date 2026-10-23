"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronDown, MoreVertical } from "lucide-react";
import { LeadService } from "@/features/leads/services/LeadService";
import LeadStatusPipeline from "@/features/leads/components/LeadStatusPipeline";
import RecordTimeline from "@/shared/components/RecordTimeline";
import InlineEditRow from "@/shared/components/InlineEditRow";
import { Tabs } from "@/shared/components/Tabs";
import { RecordSection } from "@/shared/components/RecordSection";
import { formatDateTime } from "@/shared/utils/formatDate";
import { useLeadPicklists } from "@/features/picklists/hooks/useLeadPicklists";
import { toSelectOptions } from "@/features/picklists/utils/optionHelpers";
import type { Lead, LeadStatus } from "@/features/leads/types/lead.types";

import CreateTaskFromRecord from "@/shared/components/CreateTaskFromRecord";
import { confirmDelete } from "@/shared/utils/confirmDelete";
import { CALLS_ENABLED } from "@/features/calls/config";
import LogCallFromRecord from "@/features/calls/components/LogCallFromRecord";
import RecordCalls from "@/features/calls/components/RecordCalls";

interface LeadDetailProps {
  lead: Lead;
  onLeadChange: (lead: Lead) => void;
}

type DetailTab = "overview" | "calls" | "timeline";

export default function LeadDetail({ lead, onLeadChange }: LeadDetailProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  // "View Lead History" links from converted contacts/accounts open ?tab=timeline;
  // a call's "Back to Lead" link opens ?tab=calls.
  const requestedTab = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState<DetailTab>(
    requestedTab === "timeline" ? "timeline" : requestedTab === "calls" && CALLS_ENABLED ? "calls" : "overview",
  );
  // Bumped when a call is logged from the header so the Calls tab reloads.
  const [callsVersion, setCallsVersion] = useState(0);
  const [showDetails, setShowDetails] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<LeadStatus | null>(null);
  // The company's own Lead Source / Status / Industry / Rating options.
  const { options: picklists } = useLeadPicklists();

async function handleStatusClick(status: LeadStatus) {
  if (status === lead.lead_status || isUpdatingStatus) return;

  setIsUpdatingStatus(true);
  setPendingStatus(status);

  try {
    // Update the status in the backend
    await LeadService.updateLead(lead.id, {
      lead_status: status,
    });

    // Fetch the complete updated lead
    const updatedLead = await LeadService.getLead(lead.id);

    // Update the page
    onLeadChange(updatedLead);
  } catch (error) {
    console.error("Failed to update lead status:", error);
    window.alert("Couldn't update the lead status. Try again.");
  } finally {
    setIsUpdatingStatus(false);
    setPendingStatus(null);
  }
}

  async function updateField(field: string, raw: string) {
    const numeric = field === "number_of_employees" || field === "annual_revenue";
    const value = numeric ? (raw.trim() ? Number(raw) : null) : (raw.trim() ? raw : null);
    if (numeric && raw.trim() && Number.isNaN(value)) throw new Error("Invalid number");
    await LeadService.updateLead(lead.id, { [field]: value } as never);
    const updatedLead = await LeadService.getLead(lead.id);
    onLeadChange(updatedLead);
  }

  async function handleDelete() {
    setIsMenuOpen(false);
    if (!await confirmDelete(`Delete ${lead.name || lead.email}? This can't be undone.`)) return;
    try {
      const message = await LeadService.deleteLead(lead.id);
      router.push(`/dashboard/leads?deletedMessage=${encodeURIComponent(message)}`);
    } catch {
      window.alert("Couldn't delete this lead. Try again.");
    }
  }

  const callRelated = { personType: "lead" as const, personId: lead.id, personLabel: lead.name || lead.email || "Lead", accountId: "", accountLabel: "" };

  return (
    <div className="mx-auto max-w-5xl">
      <Link href="/dashboard/leads" className="text-sm text-slate hover:text-fg">
        ← Back to Leads
      </Link>

      <div className="mt-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-light text-lg font-semibold text-slate">
            {(lead.name || lead.email || "?").slice(0, 1).toUpperCase()}
          </div>
          <div>
            <h1 className="font-serif text-2xl text-fg">
              {lead.name || "(No name)"}
              {lead.company_name && (
                <span className="ml-2 text-lg text-ink-soft">- {lead.company_name}</span>
              )}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={`/dashboard/leads/${lead.id}/convert`}
            className="rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white hover:bg-ink-2"
          >
            Convert
          </Link>
          {CALLS_ENABLED && <LogCallFromRecord related={callRelated} onLogged={() => setCallsVersion((v) => v + 1)} />}
          <CreateTaskFromRecord related={{ personType: "lead", personId: lead.id, personLabel: lead.name || lead.email || "Lead", accountId: "", accountLabel: "" }} />
          <Link
            href={`/dashboard/leads/${lead.id}/edit`}
            className="rounded-md border border-line px-4 py-2 text-sm font-medium text-fg hover:bg-paper"
          >
            Edit
          </Link>
          <div className="relative">
            <button
              onClick={() => setIsMenuOpen((v) => !v)}
              className="rounded-md border border-line p-2 text-ink-soft hover:bg-paper"
            >
              <MoreVertical size={16} />
            </button>
            {isMenuOpen && (
              <div className="absolute right-0 top-full z-20 mt-1 w-36 rounded-md border border-line bg-surface py-1 shadow-lg">
                <button
                  onClick={handleDelete}
                  className="block w-full px-3 py-1.5 text-left text-sm text-danger hover:bg-danger-soft"
                >
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Overview / Calls / Timeline tabs */}
      <Tabs
        tabs={[
          { value: "overview", label: "Overview" },
          ...(CALLS_ENABLED ? [{ value: "calls" as const, label: "Calls" }] : []),
          { value: "timeline", label: "Timeline" },
        ]}
        active={activeTab}
        onChange={setActiveTab}
      />

      <div key={activeTab} className="animate-fade-in">
      {activeTab === "overview" ? (
        <>
          {/* Status pipeline */}
          <LeadStatusPipeline
            statuses={picklists.lead_status}
            current={lead.lead_status}
            pending={pendingStatus}
            onSelect={handleStatusClick}
          />

          {/* Overview */}
          <div className="mt-4 rounded-lg border border-line bg-surface p-6">
            <h2 className="mb-4 text-xs font-semibold uppercase tracking-wide text-ink-soft">
              Overview
            </h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Row label="Lead Owner" value={lead.owner?.name} editable={false} />
              <Row label="Email" value={lead.email} onSave={(raw) => updateField("email", raw)} />
              <Row label="Phone" value={lead.phone} onSave={(raw) => updateField("phone", raw)} />
              <Row label="Lead Status" value={lead.lead_status} onSave={(raw) => updateField("lead_status", raw)} type="select" options={toSelectOptions(picklists.lead_status, lead.lead_status)} />
              <Row label="Description" value={lead.description} onSave={(raw) => updateField("description", raw)} type="textarea" fullWidth />
            </div>
          </div>

          {/* Hide / show full details */}
          <button
            onClick={() => setShowDetails((v) => !v)}
            className="mt-4 flex items-center gap-1 text-sm font-medium text-slate hover:text-fg"
          >
            {showDetails ? "Hide Details" : "Show Details"}
            <ChevronDown size={14} className={`transition ${showDetails ? "rotate-180" : ""}`} />
          </button>

          {/*
            CSS Grid's 0fr -> 1fr trick animates to the content's natural
            height without guessing a max-height value or measuring with JS.
          */}
          <div
            className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${
              showDetails ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
            }`}
          >
            <div className="overflow-hidden">
              <div className="mt-4 space-y-4">
              <RecordSection title="Lead Information">
                <Row label="Lead Owner" value={lead.owner?.name} editable={false} />
                <Row label="Company" value={lead.company_name} onSave={(raw) => updateField("company_name", raw)} />
                <Row label="Name" value={lead.name} onSave={(raw) => updateField("name", raw)} />
                <Row label="Email" value={lead.email} onSave={(raw) => updateField("email", raw)} />
                <Row label="Title" value={lead.title} onSave={(raw) => updateField("title", raw)} />
                <Row label="Fax" value={lead.fax} onSave={(raw) => updateField("fax", raw)} />
                <Row label="Phone" value={lead.phone} onSave={(raw) => updateField("phone", raw)} />
                <Row label="Website" value={lead.website} onSave={(raw) => updateField("website", raw)} />
                <Row label="Mobile" value={lead.mobile_number} onSave={(raw) => updateField("mobile_number", raw)} />
                <Row label="Lead Status" value={lead.lead_status} onSave={(raw) => updateField("lead_status", raw)} type="select" options={toSelectOptions(picklists.lead_status, lead.lead_status)} />
                <Row label="Lead Source" value={lead.lead_source} onSave={(raw) => updateField("lead_source", raw)} type="select" options={toSelectOptions(picklists.lead_source, lead.lead_source)} />
                <Row label="Rating" value={lead.rating} onSave={(raw) => updateField("rating", raw)} type="select" options={toSelectOptions(picklists.rating, lead.rating)} />
                <Row label="Industry" value={lead.industry} onSave={(raw) => updateField("industry", raw)} type="select" options={toSelectOptions(picklists.industry, lead.industry)} />
                <Row label="No. of Employees" value={lead.number_of_employees} onSave={(raw) => updateField("number_of_employees", raw)} type="number" />
                <Row label="Annual Revenue" value={lead.annual_revenue} onSave={(raw) => updateField("annual_revenue", raw)} type="number" />
              </RecordSection>

              <RecordSection title="Address Information">
                <Row label="Address" value={lead.address} onSave={(raw) => updateField("address", raw)} />
                <Row label="City" value={lead.city} onSave={(raw) => updateField("city", raw)} />
                <Row label="State" value={lead.state} onSave={(raw) => updateField("state", raw)} />
                <Row label="Country" value={lead.country} onSave={(raw) => updateField("country", raw)} />
                <Row label="Zip Code" value={lead.postal_code} onSave={(raw) => updateField("postal_code", raw)} />
              </RecordSection>

              <RecordSection title="System Information">
                <Row label="Created At" value={formatDateTime(lead.created_at)} editable={false} />
                <Row label="Updated At" value={formatDateTime(lead.updated_at)} editable={false} />
              </RecordSection>
              </div>
            </div>
          </div>
        </>
      ) : activeTab === "calls" ? (
        <RecordCalls
          kind="lead"
          recordId={lead.id}
          recordName={lead.name || lead.email || "this lead"}
          related={callRelated}
          returnTo={`/dashboard/leads/${lead.id}?tab=calls`}
          refreshKey={callsVersion}
        />
      ) : (
        <Timeline lead={lead} />
      )}
      </div>
    </div>
  );
}

function Timeline({ lead }: { lead: Lead }) {
  return <RecordTimeline module="leads" recordId={lead.id} />;
}

function Row({
  label, value, fullWidth = false, type = "text", options = [], editable = true, onSave,
}: {
  label: string; value?: string | number | null; fullWidth?: boolean; field?: string;
  type?: "text" | "date" | "number" | "textarea" | "select";
  options?: { value: string; label: string }[]; editable?: boolean;
  onSave?: (raw: string) => Promise<void>;
}) {
  return <InlineEditRow label={label} value={value} fullWidth={fullWidth} type={type} options={options} editable={editable} onSave={onSave} />;
}

