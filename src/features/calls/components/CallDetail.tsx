"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Clock3, FileEdit, MoreVertical, PhoneCall } from "lucide-react";
import Modal from "@/shared/components/Modal";
import InlineEditRow from "@/shared/components/InlineEditRow";
import { Tabs } from "@/shared/components/Tabs";
import CallForm from "@/features/calls/components/CallForm";
import CallOutcomeBadge from "@/features/calls/components/CallOutcomeBadge";
import CallDirectionIcon from "@/features/calls/components/CallDirectionIcon";
import { CallService } from "@/features/calls/services/CallService";
import {
  CALL_OUTCOMES,
  CALL_TYPES,
  type CallDetail as CallDetailData,
  type CallHistoryEvent,
  type UpdateCallPayload,
} from "@/features/calls/types/call.types";
import {
  formatCallDateTime,
  formatDuration,
  recordHref,
  recordLabel,
} from "@/features/calls/utils/callFormat";
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

/** Labels for the fields a call update can change (keys match the backend's change history). */
const FIELD_LABELS: Record<string, string> = {
  call_start_time: "Start Time",
  duration_seconds: "Duration",
  call_type: "Call Type",
  outcome: "Outcome",
  description: "Notes",
};

function backLabel(returnTo: string | null | undefined): string {
  if (!returnTo) return "← Back to Calls";
  if (returnTo.startsWith("/dashboard/leads/")) return "← Back to Lead";
  if (returnTo.startsWith("/dashboard/contacts/")) return "← Back to Contact";
  return "← Back";
}

function formatChangeValue(field: string, value: unknown): string {
  if (value === null || value === undefined || value === "") return "Empty";
  if (field === "call_start_time" && typeof value === "string") return formatCallDateTime(value);
  if (field === "duration_seconds" && typeof value === "number") return formatDuration(value);
  return String(value);
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

  async function refresh() {
    onCallChange(await CallService.getCall(call.id));
  }

  async function updateField(field: keyof UpdateCallPayload, raw: string) {
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
              className="rounded-md border border-line px-4 py-2 text-sm font-medium text-fg hover:bg-paper"
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
                    onSave={(raw) => updateField("call_type", raw)}
                  />
                  <InlineEditRow
                    label="Outcome"
                    value={call.outcome}
                    type="select"
                    options={CALL_OUTCOMES.map((outcome) => ({ value: outcome, label: outcome }))}
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
            <CallHistory events={call.change_history} />
          )}
        </div>
      </div>

      <Modal isOpen={editing} onClose={() => setEditing(false)}>
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

/** Newest-first log of when the call was logged and every edit made to it. */
function CallHistory({ events }: { events: CallHistoryEvent[] }) {
  return (
    <div className="mt-4 rounded-lg border border-line bg-surface">
      <div className="border-b border-line px-5">
        <span className="-mb-px inline-block border-b-2 border-indigo-600 px-1 py-3 text-sm font-medium text-indigo-600">
          History
        </span>
      </div>

      <div className="px-5 py-5">
        {events.length === 0 ? (
          <div className="py-12 text-center animate-scale-in">
            <Clock3 size={22} className="mx-auto mb-2 text-ink-soft" />
            <p className="text-sm font-medium text-fg">No history yet</p>
            <p className="mt-1 text-xs text-ink-soft">When this call is logged or edited, it will appear here.</p>
          </div>
        ) : (
          <ol className="relative">
            {events.map((event, index) => {
              const isLast = index === events.length - 1;
              const isUpdate = event.event_type === "CALL_UPDATED";
              const Icon = isUpdate ? FileEdit : PhoneCall;
              const changes = Object.entries(event.changes ?? {});
              return (
                <li key={event.id} className="relative flex gap-3">
                  <div className="relative flex w-8 shrink-0 justify-center">
                    {!isLast && (
                      <span aria-hidden="true" className="absolute bottom-0 left-1/2 top-8 w-0.5 -translate-x-1/2 bg-slate-light" />
                    )}
                    <span
                      className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full border border-line bg-surface ${
                        isUpdate ? "text-slate" : "text-success"
                      }`}
                    >
                      <Icon size={15} />
                    </span>
                  </div>

                  <div className={`min-w-0 flex-1 pt-1 ${isLast ? "" : "pb-7"}`}>
                    <p className="text-sm font-medium leading-snug text-fg">
                      {isUpdate ? "Call updated" : event.event_type === "CALL_LOGGED" ? "Call logged" : event.message}
                    </p>
                    <p className="mt-0.5 text-xs text-ink-soft">
                      {event.actor?.name ? `by ${event.actor.name} · ` : ""}
                      {formatDateTime(event.created_at)}
                    </p>

                    {!isUpdate && event.event_type === "CALL_LOGGED" && event.message && (
                      <p className="mt-1 text-sm text-ink-soft">{event.message}</p>
                    )}

                    {changes.length > 0 && (
                      <ul className="mt-2 space-y-2">
                        {changes.map(([field, change]) => (
                          <li key={field} className="rounded-md border border-line bg-paper/50 px-3 py-2 text-sm">
                            <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
                              {FIELD_LABELS[field] ?? field.replace(/_/g, " ")}
                            </p>
                            <div className="mt-1 flex flex-wrap items-start gap-x-2 gap-y-1">
                              <span className="max-w-full whitespace-pre-wrap break-words text-ink-soft line-through decoration-ink-soft/50">
                                {formatChangeValue(field, change.old_value)}
                              </span>
                              <ArrowRight size={14} className="mt-0.5 shrink-0 text-ink-soft" />
                              <span className="max-w-full whitespace-pre-wrap break-words font-medium text-fg">
                                {formatChangeValue(field, change.new_value)}
                              </span>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </div>
  );
}
