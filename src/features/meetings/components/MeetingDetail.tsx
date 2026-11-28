"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, MoreVertical, Pencil, X } from "lucide-react";
import Spinner from "@/shared/components/Spinner";
import { useRouter } from "next/navigation";
import Modal from "@/shared/components/Modal";
import InlineEditRow from "@/shared/components/InlineEditRow";
import MeetingForm from "@/features/meetings/components/MeetingForm";
import MeetingConference from "@/features/meetings/components/MeetingConference";
import { MeetingService, emailSkippedMessage } from "@/features/meetings/services/MeetingService";
import type {
  CreateMeetingPayload,
  Meeting,
  UpdateMeetingPayload,
} from "@/features/meetings/types/meeting.types";
import { confirmDelete } from "@/shared/utils/confirmDelete";
import { notifyError } from "@/shared/utils/notify";
import { formatDateTime } from "@/shared/utils/formatDate";
import RecordTimeline from "@/shared/components/RecordTimeline";
import { Tabs } from "@/shared/components/Tabs";
import { RecordChip, type SelectedRecord } from "@/features/meetings/components/SelectedRecordsField";
import { backLabelFor } from "@/shared/utils/returnTo";
import { RecordSectionTitle, recordCardClass, recordGridClass } from "@/shared/components/RecordSection";

interface Props {
  meeting: Meeting;
  onMeetingChange: (meeting: Meeting) => void;
  /** Where "Back" goes when the meeting was opened from another page (e.g. the calendar). */
  returnTo?: string | null;
}

type EditableField = "title" | "location" | "description";

export default function MeetingDetail({ meeting, onMeetingChange, returnTo = null }: Props) {
  const router = useRouter();
  const backHref = returnTo ?? "/dashboard/meetings";
  const [menu, setMenu] = useState(false);
  const [editing, setEditing] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "timeline">("overview");
  // Set after a save when some people could not be emailed (no address).
  const [emailNotice, setEmailNotice] = useState<string | null>(null);

  async function updateField(field: EditableField, raw: string) {
    if (field === "title" && !raw.trim()) {
      notifyError("Title is required.");
      return;
    }

    const value = raw.trim() ? raw : null;
    const updated = await MeetingService.updateMeeting(meeting.id, {
      [field]: value,
    } as UpdateMeetingPayload);

    setEmailNotice(emailSkippedMessage(updated.email_skipped));
    onMeetingChange(updated);
  }

  async function saveEdit(payload: CreateMeetingPayload) {
    const updated = await MeetingService.updateMeeting(meeting.id, payload);
    setEmailNotice(emailSkippedMessage(updated.email_skipped));
    onMeetingChange(updated);
    setEditing(false);
  }

  async function deleteMeeting() {
    setMenu(false);

    if (
      !(await confirmDelete(
        `Delete "${meeting.title}"? This can't be undone.`,
      ))
    ) {
      return;
    }

    try {
      await MeetingService.deleteMeeting(meeting.id);
      router.push(backHref);
    } catch {
      notifyError("Couldn't delete this meeting. Try again.");
    }
  }

  const relatedRecords: SelectedRecord[] = meeting.related_to.map((record) => ({
    id: record.id,
    name: record.name,
    type: record.type === "LEAD" ? "lead" : "contact",
  }));

  // Short summary for the page header; the full list is in the Overview card.
  const relatedSummary =
    relatedRecords.length === 0
      ? "No related leads or contacts"
      : relatedRecords.length <= 3
        ? relatedRecords.map((record) => record.name).join(", ")
        : `${relatedRecords
            .slice(0, 3)
            .map((record) => record.name)
            .join(", ")} +${relatedRecords.length - 3} more`;

  return (
    <>
      <div className="lp-detail mx-auto max-w-5xl">
        <Link
          href={backHref}
          className="text-sm text-slate hover:text-fg"
        >
          {backLabelFor(returnTo, "← Back to Meetings")}
        </Link>

        <div className="lp-detail-head mt-3 flex items-center justify-between gap-4">
          <div>
            <h1 className="font-serif text-2xl text-fg">
              {meeting.title || "Untitled Meeting"}
            </h1>
            <p className="mt-1 text-sm text-ink-soft">{relatedSummary}</p>
          </div>

          <div className="lp-actions flex items-center gap-2">
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="rounded-md border border-line px-4 py-2 text-sm font-medium hover:bg-paper"
            >
              Edit
            </button>

            <div className="lp-detail-menu relative">
              <button
                type="button"
                onClick={() => setMenu((value) => !value)}
                className="rounded-md border border-line p-2 text-ink-soft hover:bg-paper"
                aria-label="Meeting actions"
              >
                <MoreVertical size={16} />
              </button>

              {menu && (
                <div className="absolute right-0 top-full z-20 mt-1 w-36 rounded-md border border-line bg-surface py-1 shadow-lg">
                  <button
                    type="button"
                    onClick={deleteMeeting}
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

        <div key={activeTab} className="animate-tab-panel">
          {activeTab === "overview" ? (
            <>
              {emailNotice && (
                <div
                  role="status"
                  className="mb-4 flex items-start justify-between gap-3 rounded-md border border-amber-300/60 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-200"
                >
                  <span>{emailNotice}</span>
                  <button
                    type="button"
                    onClick={() => setEmailNotice(null)}
                    aria-label="Dismiss"
                    className="shrink-0 rounded p-0.5 hover:bg-black/5"
                  >
                    <X size={14} />
                  </button>
                </div>
              )}

              <MeetingConference meeting={meeting} onMeetingChange={onMeetingChange} />

              <div className={`mt-4 ${recordCardClass}`}>
                <RecordSectionTitle>Overview</RecordSectionTitle>
                <div className={recordGridClass}>
                  <Row label="Title" value={meeting.title} onSave={(value) => updateField("title", value)} />
                  <Row label="Host" value={meeting.host_name} editable={false} />
                  <Row label="Location" value={meeting.location} onSave={(value) => updateField("location", value)} />
                  <Row label="From" value={formatDateTime(meeting.start_at)} editable={false} />
                  <Row label="To" value={formatDateTime(meeting.end_at)} editable={false} />
                  <Row label="All Day" value={meeting.is_all_day ? "Yes" : "No"} editable={false} />
                  <Row
                    label="Email Notifications"
                    value={meeting.send_email_notifications ? "On" : "Off"}
                    editable={false}
                  />
                  <Row
                    label="Reminders"
                    value={reminderSummary(meeting.reminder_offsets)}
                    editable={false}
                  />
                  <RecordsRow label="Related To" records={relatedRecords} linked />
                  <RecordsRow label="Participants" records={meeting.participants} />
                </div>
              </div>

              <div className={`mt-4 ${recordCardClass}`}>
                <RecordSectionTitle>Description</RecordSectionTitle>
                <DescriptionBlock
                  value={meeting.description}
                  onSave={(value) => updateField("description", value)}
                />
              </div>
            </>
          ) : (
            <div className="mt-4">
              <RecordTimeline module="meetings" recordId={meeting.id} />
            </div>
          )}
        </div>
      </div>

      <Modal isOpen={editing} onClose={() => setEditing(false)}>
        <MeetingForm
          mode="edit"
          initialMeeting={meeting}
          onSubmit={saveEdit}
          onCancel={() => setEditing(false)}
        />
      </Modal>
    </>
  );
}

function Row({
  label,
  value,
  fullWidth = false,
  type = "text",
  editable = true,
  onSave,
}: {
  label: string;
  value?: string | number | null;
  fullWidth?: boolean;
  type?: "text" | "date" | "datetime-local" | "number" | "textarea";
  editable?: boolean;
  onSave?: (value: string) => Promise<void>;
}) {
  return (
    <InlineEditRow
      label={label}
      value={value}
      fullWidth={fullWidth}
      type={type}
      editable={editable}
      onSave={onSave}
    />
  );
}

/** Read-only row of chips (Related To / Participants), styled like the other overview rows. */
function RecordsRow({
  label,
  records,
  linked = false,
}: {
  label: string;
  records: SelectedRecord[];
  linked?: boolean;
}) {
  return (
    <div className="min-w-0 rounded-xl border border-transparent px-3 py-2.5 sm:col-span-2">
      <p className="text-xs text-ink-soft">
        {label}
        {records.length > 0 && <span className="ml-1.5 text-ink-soft/80">({records.length})</span>}
      </p>
      {records.length > 0 ? (
        <ul aria-label={label} className="mt-1.5 flex max-h-40 flex-wrap gap-1.5 overflow-y-auto pr-1">
          {records.map((record) => (
            <li key={`${record.type}:${record.id}`} className="max-w-full">
              <RecordChip record={record} showType linked={linked} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="min-h-7 pt-1 text-sm text-fg">—</p>
      )}
    </div>
  );
}

/** The meeting's agenda / notes: readable when viewing, a proper text box when editing. */
function DescriptionBlock({
  value,
  onSave,
}: {
  value: string | null;
  onSave: (value: string) => Promise<void>;
}) {
  const current = value ?? "";
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(current);
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!editing) setDraft(current);
  }, [current, editing]);

  async function save() {
    // Keep the reader's place: updating the meeting re-renders the page.
    const { scrollX, scrollY } = window;
    setSaving(true);
    setFailed(false);
    try {
      await onSave(draft);
      setEditing(false);
      requestAnimationFrame(() => requestAnimationFrame(() => window.scrollTo(scrollX, scrollY)));
    } catch {
      setFailed(true);
    } finally {
      setSaving(false);
    }
  }

  function cancel() {
    setDraft(current);
    setFailed(false);
    setEditing(false);
  }

  if (editing) {
    return (
      <div className="animate-inline-edit">
        <textarea
          autoFocus
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          rows={6}
          aria-label="Description"
          placeholder="Add an agenda, talking points or notes for this meeting…"
          className="block min-h-32 w-full resize-y rounded-lg border border-line bg-surface px-3 py-2.5 text-sm leading-relaxed text-fg outline-none transition placeholder:text-ink-soft focus:border-slate focus:ring-2 focus:ring-slate-light"
        />
        {failed && <p className="mt-2 text-xs text-danger">Couldn&apos;t save. Try again.</p>}
        <div className="mt-3 flex justify-end gap-2">
          <button
            type="button"
            onClick={cancel}
            disabled={saving}
            className="inline-flex items-center gap-1.5 rounded-md border border-line px-3 py-1.5 text-sm font-medium text-fg hover:bg-paper disabled:opacity-50"
          >
            <X size={14} /> Cancel
          </button>
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="inline-flex items-center gap-1.5 rounded-md bg-indigo-500 px-3 py-1.5 text-sm font-semibold text-white hover:bg-indigo-400 disabled:opacity-60"
          >
            {saving ? <Spinner size="sm" className="border-white/30 border-t-white" /> : <Check size={14} />}
            Save
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start justify-between gap-4">
      {current.trim() ? (
        <p className="min-w-0 flex-1 whitespace-pre-wrap break-words text-sm leading-relaxed text-fg">{current}</p>
      ) : (
        <p className="min-w-0 flex-1 text-sm text-ink-soft">
          No description yet. Add an agenda or notes so everyone knows what this meeting is about.
        </p>
      )}
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-line px-3 py-1.5 text-sm font-medium text-fg hover:bg-paper"
      >
        <Pencil size={13} /> {current.trim() ? "Edit" : "Add"}
      </button>
    </div>
  );
}

function reminderSummary(offsets: number[]): string {
  if (offsets.length === 0) return "None";
  const labels: Record<number, string> = {
    1440: "1 day before",
    60: "1 hour before",
    30: "30 minutes before",
    15: "15 minutes before",
  };
  return offsets.map((value) => labels[value] ?? `${value} minutes before`).join(", ");
}
