"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, MoreVertical } from "lucide-react";
import Modal from "@/shared/components/Modal";
import InlineEditRow from "@/shared/components/InlineEditRow";
import { Tabs } from "@/shared/components/Tabs";
import CallForm from "@/features/calls/components/CallForm";
import CallHistory from "@/features/calls/components/CallHistory";
import CallOutcomeBadge from "@/features/calls/components/CallOutcomeBadge";
import CallDirectionIcon from "@/features/calls/components/CallDirectionIcon";
import { CallService } from "@/features/calls/services/CallService";
import {
  CALL_OUTCOMES,
  CALL_TYPES,
  type CallDetail as CallDetailData,
  type UpdateCallPayload,
} from "@/features/calls/types/call.types";
import { formatCallDateTime, recordHref, recordLabel } from "@/features/calls/utils/callFormat";
import { confirmDelete } from "@/shared/utils/confirmDelete";
import { formatDateTime } from "@/shared/utils/formatDate";
import { withReturnTo } from "@/shared/utils/returnTo";

interface CallDetailProps {
  call: CallDetailData;
  onCallChange: (call: CallDetailData) => void;
  /** Safe in-app path the user came from (e.g. the lead page); drives the back link. */
  returnTo?: string | null;
}

type DetailTab = "overview" | "history";

function backLabel(returnTo: string | null | undefined): string {
  if (!returnTo) return "← Back to Calls";
  if (returnTo.startsWith("/dashboard/leads/")) return "← Back to Lead";
  if (returnTo.startsWith("/dashboard/contacts/")) return "← Back to Contact";
  return "← Back";
}

export default function CallDetail({ call, onCallChange, returnTo = null }: CallDetailProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<DetailTab>("overview");
  const [menu, setMenu] = useState(false);
  const [editing, setEditing] = useState(false);

  const record = call.related_record;
  const recordName = record.name || `Unnamed ${recordLabel(record.type).toLowerCase()}`;
  const recordLink = recordHref(record.type, record.id);
  const backHref = returnTo ?? "/dashboard/calls";
  // Where "back" should land again after opening another call from this page.
  const selfReturn = returnTo;
  // Only the newest call on a lead / contact can be edited; older calls are
  // read-only history (the backend enforces the same rule).
  const canEdit = call.is_latest !== false;

  async function refresh() {
    onCallChange(await CallService.getCall(call.id));
  }

  async function updateField(field: keyof UpdateCallPayload, raw: string) {
    if (!canEdit) return;
    const value = field === "description" ? (raw.trim() ? raw.trim() : null) : raw;
    await CallService.updateCall(call.id, { [field]: value } as UpdateCallPayload);
    await refresh();
  }

  async function saveEdit(payload: UpdateCallPayload) {
    if (Object.keys(payload).length > 0) await CallService.updateCall(call.id, payload);
    await refresh();
    setEditing(false);
  }

  async function handleDelete() {
    setMenu(false);
    if (!(await confirmDelete(`Delete the call with ${recordName}? This can't be undone.`))) return;
    try {
      await CallService.deleteCall(call.id);
      router.push(backHref);
    } catch {
      window.alert("Couldn't delete this call. Try again.");
    }
  }

  const otherCalls = call.related_calls;
  const hiddenOtherCalls = Math.max(0, call.total_calls_for_record - 1 - otherCalls.length);

  return (
    <>
      <div className="mx-auto max-w-5xl">
        <Link href={backHref} className="text-sm text-slate hover:text-fg">
          {backLabel(returnTo)}
        </Link>

        <div className="mt-3 flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <CallDirectionIcon callType={call.call_type} size={20} className="h-11 w-11" />
            <div className="min-w-0">
              <h1 className="truncate font-serif text-2xl text-fg">
                {call.call_type} call with {recordName}
              </h1>
              <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-ink-soft">
                <CallOutcomeBadge outcome={call.outcome} />
                <span>{formatCallDateTime(call.call_start_time)}</span>
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => setEditing(true)}
              disabled={!canEdit}
              title={canEdit ? undefined : "Only the latest call can be edited"}
              className="rounded-md border border-line px-4 py-2 text-sm font-medium text-fg hover:bg-paper disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent"
            >
              Edit
            </button>
            <div className="relative">
              <button
                type="button"
                onClick={() => setMenu((value) => !value)}
                className="rounded-md border border-line p-2 text-ink-soft hover:bg-paper"
                aria-label="Call actions"
              >
                <MoreVertical size={16} />
              </button>
              {menu && (
                <div className="absolute right-0 top-full z-20 mt-1 w-36 rounded-md border border-line bg-surface py-1 shadow-lg">
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

        {!canEdit && (
          <p className="mt-4 rounded-md border border-line bg-paper px-4 py-2.5 text-sm text-ink-soft">
            A newer call has been logged with {recordName}, so this call is now history and can no longer be edited.
          </p>
        )}

        {/* At-a-glance summary */}
        <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat label="Outcome">
            <CallOutcomeBadge outcome={call.outcome} />
          </Stat>
          <Stat label="Duration">{call.duration_label}</Stat>
          <Stat label="Started">{formatCallDateTime(call.call_start_time)}</Stat>
          <Stat label={`Calls with this ${recordLabel(record.type).toLowerCase()}`}>
            {call.total_calls_for_record} {call.total_calls_for_record === 1 ? "call" : "calls"}
          </Stat>
        </div>

        <Tabs
          tabs={[
            { value: "overview", label: "Overview" },
            { value: "history", label: "History" },
          ]}
          active={activeTab}
          onChange={setActiveTab}
        />

        <div key={activeTab} className="animate-fade-in">
          {activeTab === "overview" ? (
            <>
              <div className="mt-4 rounded-lg border border-line bg-surface p-6">
                <h2 className="mb-4 text-xs font-semibold uppercase tracking-wide text-ink-soft">Call Information</h2>
                <div className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
                  <div className="-mx-1.5 min-w-0 px-3 py-2.5">
                    <p className="text-xs text-ink-soft">{recordLabel(record.type)}</p>
                    <p className="flex min-h-7 items-center text-sm">
                      <Link href={recordLink} className="font-medium text-slate hover:underline">
                        {recordName}
                      </Link>
                    </p>
                  </div>
                  <InlineEditRow label="Account" value={call.account_name} editable={false} />
                  <InlineEditRow
                    label="Call Type"
                    value={call.call_type}
                    type="select"
                    options={CALL_TYPES.map((type) => ({ value: type, label: type }))}
                    editable={canEdit}
                    onSave={(raw) => updateField("call_type", raw)}
                  />
                  <InlineEditRow
                    label="Outcome"
                    value={call.outcome}
                    type="select"
                    options={CALL_OUTCOMES.map((outcome) => ({ value: outcome, label: outcome }))}
                    editable={canEdit}
                    onSave={(raw) => updateField("outcome", raw)}
                  />
                  <InlineEditRow label="Start Time" value={formatDateTime(call.call_start_time)} editable={false} />
                  <InlineEditRow label="Duration" value={call.duration_label} editable={false} />
                  <InlineEditRow label="Call Owner" value={call.owner_name} editable={false} />
                  <InlineEditRow
                    label="Logged Via"
                    value={call.entry_method === "TIMER" ? "Call timer" : "Manual entry"}
                    editable={false}
                  />
                </div>
              </div>

              <div className="mt-4 rounded-lg border border-line bg-surface p-6">
                <h2 className="mb-4 text-xs font-semibold uppercase tracking-wide text-ink-soft">Call Notes</h2>
                <InlineEditRow
                  label="Notes"
                  value={call.description}
                  type="textarea"
                  fullWidth
                  editable={canEdit}
                  onSave={(raw) => updateField("description", raw)}
                />
              </div>

              <div className="mt-4 rounded-lg border border-line bg-surface p-6">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h2 className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
                    Other calls with {recordName}
                  </h2>
                  <Link href={recordLink} className="text-xs font-medium text-slate hover:text-fg">
                    View {recordLabel(record.type).toLowerCase()} →
                  </Link>
                </div>

                {otherCalls.length === 0 ? (
                  <p className="text-sm text-ink-soft">This is the only call logged with {recordName}.</p>
                ) : (
                  <ul className="divide-y divide-line">
                    {otherCalls.map((other) => (
                      <li key={other.id}>
                        <Link
                          href={withReturnTo(`/dashboard/calls/${other.id}`, selfReturn)}
                          className="-mx-2 flex items-center gap-3 rounded-md px-2 py-3 transition hover:bg-paper"
                        >
                          <CallDirectionIcon callType={other.call_type} className="h-8 w-8" size={15} />
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                              <span className="text-sm font-medium text-fg">{formatCallDateTime(other.call_start_time)}</span>
                              <CallOutcomeBadge outcome={other.outcome} />
                              <span className="text-xs text-ink-soft">{other.duration_label}</span>
                            </div>
                            {other.description && (
                              <p className="mt-1 line-clamp-1 text-sm text-ink-soft">{other.description}</p>
                            )}
                          </div>
                          <ArrowRight size={14} className="shrink-0 text-ink-soft" />
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
                {hiddenOtherCalls > 0 && (
                  <p className="mt-3 text-xs text-ink-soft">
                    Showing the {otherCalls.length} most recent. {hiddenOtherCalls} older {hiddenOtherCalls === 1 ? "call is" : "calls are"} on the {recordLabel(record.type).toLowerCase()}&apos;s page.
                  </p>
                )}
              </div>

              <div className="mt-4 rounded-lg border border-line bg-surface p-6">
                <h2 className="mb-4 text-xs font-semibold uppercase tracking-wide text-ink-soft">System Information</h2>
                <div className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
                  <InlineEditRow label="Logged At" value={formatDateTime(call.created_at)} editable={false} />
                  <InlineEditRow label="Last Updated" value={formatDateTime(call.updated_at)} editable={false} />
                </div>
              </div>
            </>
          ) : (
            <CallHistory callId={call.id} updatedAt={call.updated_at} recordName={recordName} returnTo={selfReturn} />
          )}
        </div>
      </div>

      <Modal isOpen={editing && canEdit} onClose={() => setEditing(false)}>
        <CallForm mode="edit" initialCall={call} onSubmit={saveEdit} onCancel={() => setEditing(false)} />
      </Modal>
    </>
  );
}

function Stat({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="rounded-lg border border-line bg-surface px-4 py-3">
      <p className="text-xs uppercase tracking-wide text-ink-soft">{label}</p>
      <div className="mt-1.5 text-sm font-medium text-fg">{children}</div>
    </div>
  );
}
