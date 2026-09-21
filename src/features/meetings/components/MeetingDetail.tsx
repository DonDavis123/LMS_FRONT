"use client";

import { useState } from "react";
import Link from "next/link";
import { MoreVertical } from "lucide-react";
import { useRouter } from "next/navigation";
import Modal from "@/shared/components/Modal";
import InlineEditRow from "@/shared/components/InlineEditRow";
import MeetingForm from "@/features/meetings/components/MeetingForm";
import { MeetingService } from "@/features/meetings/services/MeetingService";
import type {
  CreateMeetingPayload,
  Meeting,
  UpdateMeetingPayload,
} from "@/features/meetings/types/meeting.types";
import { confirmDelete } from "@/shared/utils/confirmDelete";

interface Props {
  meeting: Meeting;
  onMeetingChange: (meeting: Meeting) => void;
}

type EditableField = "title" | "location" | "description";

export default function MeetingDetail({ meeting, onMeetingChange }: Props) {
  const router = useRouter();
  const [menu, setMenu] = useState(false);
  const [editing, setEditing] = useState(false);

  async function updateField(field: EditableField, raw: string) {
    if (field === "title" && !raw.trim()) {
      window.alert("Title is required.");
      return;
    }

    const value = raw.trim() ? raw : null;
    const updated = await MeetingService.updateMeeting(meeting.id, {
      [field]: value,
    } as UpdateMeetingPayload);

    onMeetingChange(updated);
  }

  async function saveEdit(payload: CreateMeetingPayload) {
    const updated = await MeetingService.updateMeeting(meeting.id, payload);
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
      router.push("/dashboard/meetings");
    } catch {
      window.alert("Couldn't delete this meeting. Try again.");
    }
  }

  const related =
    meeting.related_to.length > 0
      ? meeting.related_to
          .map((record) => {
            const label = record.type === "LEAD" ? "Lead" : "Contact";
            return `${label}: ${record.name}`;
          })
          .join(", ")
      : "—";

  const participants =
    meeting.participants.length > 0
      ? meeting.participants
          .map((participant) => {
            const label =
              participant.type === "user"
                ? "User"
                : participant.type === "lead"
                  ? "Lead"
                  : "Contact";
            return `${label}: ${participant.name}`;
          })
          .join(", ")
      : "—";

  return (
    <>
      <div className="mx-auto max-w-5xl">
        <Link
          href="/dashboard/meetings"
          className="text-sm text-slate hover:text-fg"
        >
          ← Back to Meetings
        </Link>

        <div className="mt-3 flex items-center justify-between gap-4">
          <div>
            <h1 className="font-serif text-2xl text-fg">
              {meeting.title || "Untitled Meeting"}
            </h1>
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
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-wide text-ink-soft">
            Overview
          </h2>

          <div className="grid grid-cols-1 gap-y-2 sm:grid-cols-2">
            <Row
              label="Title"
              value={meeting.title}
              onSave={(value) => updateField("title", value)}
            />

            <Row label="Host" value={meeting.host_name} editable={false} />

            <Row
              label="Location"
              value={meeting.location}
              onSave={(value) => updateField("location", value)}
            />

            <Row
              label="From"
              value={new Date(meeting.start_at).toLocaleString()}
              editable={false}
            />

            <Row
              label="To"
              value={new Date(meeting.end_at).toLocaleString()}
              editable={false}
            />

            <Row
              label="All Day"
              value={meeting.is_all_day ? "Yes" : "No"}
              editable={false}
            />

            <Row label="Related To" value={related} editable={false} />

            <Row label="Participants" value={participants} editable={false} />
          </div>
        </div>

        <div className="mt-4 rounded-lg border border-line bg-surface p-6">
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-wide text-ink-soft">
            Description
          </h2>

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
