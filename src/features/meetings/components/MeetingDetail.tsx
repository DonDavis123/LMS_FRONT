"use client";

import { useState } from "react";
import Link from "next/link";
import { MoreVertical } from "lucide-react";
import { useRouter } from "next/navigation";
import Modal from "@/shared/components/Modal";
import InlineEditRow from "@/shared/components/InlineEditRow";
import MeetingForm from "@/features/meetings/components/MeetingForm";
import { MeetingService } from "@/features/meetings/services/MeetingService";
import {
  MEETING_REPEAT_TYPES,
  MEETING_VENUES,
  type CreateMeetingPayload,
  type Meeting,
  type MeetingRepeatType,
  type MeetingVenue,
} from "@/features/meetings/types/meeting.types";

import { confirmDelete } from "@/shared/utils/confirmDelete";

interface Props {
  meeting: Meeting;
  onMeetingChange: (meeting: Meeting) => void;
}

type EditableField = "title" | "meeting_venue" | "location" | "repeat_type" | "description";

export default function MeetingDetail({ meeting, onMeetingChange }: Props) {
  const router = useRouter();
  const [menu, setMenu] = useState(false);
  const [editing, setEditing] = useState(false);

  async function updateField(field: EditableField, raw: string) {
    let value: unknown = raw.trim() ? raw : null;
    if (field === "meeting_venue") value = raw as MeetingVenue;
    if (field === "repeat_type") value = raw as MeetingRepeatType;

    await MeetingService.updateMeeting(meeting.id, { [field]: value });
    onMeetingChange(await MeetingService.getMeeting(meeting.id));
  }

  async function saveEdit(payload: CreateMeetingPayload) {
    await MeetingService.updateMeeting(meeting.id, payload);
    onMeetingChange(await MeetingService.getMeeting(meeting.id));
    setEditing(false);
  }

  async function deleteMeeting() {
    setMenu(false);
    if (!await confirmDelete(`Delete "${meeting.title}"? This can't be undone.`)) return;

    try {
      await MeetingService.deleteMeeting(meeting.id);
      router.push("/dashboard/meetings");
    } catch {
      window.alert("Couldn't delete this meeting. Try again.");
    }
  }

  const related = meeting.lead_id
    ? `Lead: ${meeting.lead_name || meeting.lead_id}`
    : meeting.contact_id
      ? `Contact: ${meeting.contact_name || meeting.contact_id}`
      : meeting.account_id
        ? `Account: ${meeting.account_name || meeting.account_id}`
        : "—";

  return (
    <>
      <div className="mx-auto max-w-5xl">
        <Link href="/dashboard/meetings" className="text-sm text-slate hover:text-fg">
          ← Back to Meetings
        </Link>

        <div className="mt-3 flex items-center justify-between gap-4">
          <div>
            <h1 className="font-serif text-2xl text-fg">{meeting.title || "Untitled Meeting"}</h1>
            <p className="mt-1 text-sm text-ink-soft">{related}</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="rounded-md border border-line px-4 py-2 text-sm font-medium hover:bg-paper"
            >
              Edit
            </button>
            <div className="relative">
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

        <div className="mt-6 rounded-lg border border-line bg-surface p-6">
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-wide text-ink-soft">Overview</h2>
          <div className="grid grid-cols-1 gap-y-2 sm:grid-cols-2">
            <Row label="Title" value={meeting.title} onSave={(value) => updateField("title", value)} />
            <Row label="Host" value={meeting.owner_name} editable={false} />
            <Row
              label="Meeting Venue"
              value={meeting.meeting_venue}
              type="select"
              options={MEETING_VENUES.map((value) => ({ value, label: value }))}
              onSave={(value) => updateField("meeting_venue", value)}
            />
            <Row label="Location" value={meeting.location} onSave={(value) => updateField("location", value)} />
            <Row label="From" value={new Date(meeting.from_datetime).toLocaleString()} editable={false} />
            <Row
              label="To"
              value={meeting.to_datetime ? new Date(meeting.to_datetime).toLocaleString() : null}
              editable={false}
            />
            <Row label="All Day" value={meeting.all_day ? "Yes" : "No"} editable={false} />
            <Row label="Related To" value={related} editable={false} />
            <Row
              label="Repeat"
              value={meeting.repeat_type || "None"}
              type="select"
              options={MEETING_REPEAT_TYPES.map((value) => ({ value, label: value }))}
              onSave={(value) => updateField("repeat_type", value)}
            />
            <Row
              label="Participants"
              value={meeting.participants?.map((participant) => participant.name).join(", ") || "—"}
              editable={false}
            />
          </div>
        </div>

        <div className="mt-4 rounded-lg border border-line bg-surface p-6">
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-wide text-ink-soft">Description</h2>
          <Row
            label="Description"
            value={meeting.description}
            type="textarea"
            fullWidth
            onSave={(value) => updateField("description", value)}
          />
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
  options = [],
  editable = true,
  onSave,
}: {
  label: string;
  value?: string | number | null;
  fullWidth?: boolean;
  type?: "text" | "date" | "datetime-local" | "number" | "textarea" | "select";
  options?: { value: string; label: string }[];
  editable?: boolean;
  onSave?: (value: string) => Promise<void>;
}) {
  return (
    <InlineEditRow
      label={label}
      value={value}
      fullWidth={fullWidth}
      type={type}
      options={options}
      editable={editable}
      onSave={onSave}
    />
  );
}
