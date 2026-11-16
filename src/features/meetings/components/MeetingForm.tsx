"use client";

import FormWarning from "@/shared/components/FormWarning";
import { useNoChangeGuard } from "@/shared/hooks/useNoChangeGuard";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { ChevronDown, ChevronRight, Link2 } from "lucide-react";
import { userService } from "@/features/users/services/userService";
import type { LeadOwnerOption } from "@/features/auth/types/auth.types";
import { authService } from "@/features/auth/services/authService";
import Spinner from "@/shared/components/Spinner";
import Time12hPicker from "@/shared/components/Time12hPicker";
import DateInput from "@/shared/components/DateInput";
import {
  type Meeting,
  type CreateMeetingPayload,
  type RelatedToPayload,
} from "@/features/meetings/types/meeting.types";
import RecordSelectionDialog, { type SelectionCategory } from "@/features/meetings/components/RecordSelectionDialog";
import SelectedRecordsField, { recordKey, type SelectedRecord } from "@/features/meetings/components/SelectedRecordsField";
import Switch from "@/shared/components/Switch";
import { useFormError } from "@/shared/hooks/useFormError";
import { MeetingApiError } from "@/features/meetings/services/meetingErrors";
import { useGoogleConnection } from "@/features/googleIntegration/hooks/useGoogleConnection";
import { isGoogleUsable } from "@/features/googleIntegration/types/google.types";

interface Props {
  mode: "create" | "edit";
  initialMeeting?: Meeting;
  onSubmit: (payload: CreateMeetingPayload) => Promise<void>;
  onCancel: () => void;
  /** Pre-selects the day (YYYY-MM-DD), e.g. when adding from the calendar. */
  initialDate?: string;
}

const PARTICIPANT_CATEGORIES: SelectionCategory[] = [
  { type: "user", label: "Users" },
  { type: "lead", label: "Leads" },
  { type: "contact", label: "Contacts" },
];

const RELATED_CATEGORIES: SelectionCategory[] = [
  { type: "lead", label: "Leads" },
  { type: "contact", label: "Contacts" },
];

interface FormState {
  title: string;
  owner_id: string;
  ownerLabel: string;
  location: string;
  all_day: boolean;
  from_date: string;
  from_time: string;
  to_date: string;
  to_time: string;
  participants: SelectedRecord[];
  /** Any number of leads and contacts the meeting is about. */
  related: SelectedRecord[];
  description: string;
  add_google_meet: boolean;
}

function splitDateTime(value?: string | null) {
  if (!value) return ["", ""];
  const d = new Date(value);
  const pad = (n: number) => String(n).padStart(2, "0");
  return [
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  ];
}

function emptyForm(day?: string): FormState {
  let now = new Date();
  // A picked day other than today starts at 9:00 AM.
  if (day && /^\d{4}-\d{2}-\d{2}$/.test(day) && day !== splitDateTime(now.toISOString())[0]) {
    const [y, m, d] = day.split("-").map(Number);
    now = new Date(y, m - 1, d, 9, 0);
  }
  const [date, time] = splitDateTime(now.toISOString());
  const end = new Date(now.getTime() + 60 * 60 * 1000);
  const [toDate, toTime] = splitDateTime(end.toISOString());

  return {
    title: "New Meeting",
    owner_id: "",
    ownerLabel: "",
    location: "",
    all_day: false,
    from_date: date,
    from_time: time,
    to_date: toDate,
    to_time: toTime,
    participants: [],
    related: [],
    description: "",
    add_google_meet: false,
  };
}

function fromMeeting(m: Meeting): FormState {
  const [fd, ft] = splitDateTime(m.start_at);
  const [td, tt] = splitDateTime(m.end_at);
  return {
    title: m.title ?? "",
    owner_id: m.host_id ?? "",
    ownerLabel: m.host_name ?? "",
    location: m.location ?? "",
    all_day: m.is_all_day ?? false,
    from_date: fd,
    from_time: ft,
    to_date: td || fd,
    to_time: tt,
    participants: m.participants ?? [],
    related: (m.related_to ?? []).map((record) => ({
      id: record.id,
      name: record.name,
      email: null,
      type: record.type === "LEAD" ? "lead" : "contact",
    })),
    description: m.description ?? "",
    add_google_meet: false,
  };
}

const fieldClass =
  "w-full border-0 border-b border-line bg-transparent px-0 py-2 text-sm text-fg outline-none focus:border-slate focus:ring-0";

export default function MeetingForm({ mode, initialMeeting, onSubmit, onCancel, initialDate }: Props) {
  const [form, setForm] = useState<FormState>(() =>
    initialMeeting ? fromMeeting(initialMeeting) : emptyForm(initialDate),
  );
  const { warning, isUnchanged } = useNoChangeGuard(form, mode === "edit");
  const [owners, setOwners] = useState<LeadOwnerOption[]>([]);
  const [participantUsers, setParticipantUsers] = useState<SelectedRecord[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [error, setError, errorRef] = useFormError();
  const [saving, setSaving] = useState(false);
  const [picker, setPicker] = useState<"participants" | "related" | null>(null);
  // Open straight away when there is already a description to show.
  const [showMore, setShowMore] = useState(() => Boolean(initialMeeting?.description?.trim()));

  // Google Meet is only offered when creating. The status request is skipped
  // while editing. The popup connect flow never touches `form`, so a
  // half-filled form survives it.
  const google = useGoogleConnection({ enabled: mode === "create" });
  const [currentUserId] = useState(() => authService.getSessionUser()?.id ?? null);
  const hostIsMe = Boolean(currentUserId) && form.owner_id === currentUserId;
  const meetAvailable = mode === "create" && google.status?.configured !== false;
  const needsConnect =
    meetAvailable &&
    hostIsMe &&
    google.status !== null &&
    !isGoogleUsable(google.status);
  const googleRevoked = google.status?.status === "revoked";
  const sendMeet =
    meetAvailable && form.add_google_meet && !form.all_day && !needsConnect;
  // Participants the server will silently skip for lack of an email address.
  const participantsWithoutEmail = form.participants.filter(
    (participant) => !participant.email || !participant.email.includes("@"),
  );
  const meetLockedByExisting =
    mode === "edit" && initialMeeting?.conference_status === "created";

  useEffect(() => {
    let cancelled = false;
    // One request feeds both the host picker and the participant list.
    userService
      .getLeadOwners()
      .catch(() => [] as LeadOwnerOption[])
      .then((ownerRows) => {
        if (cancelled) return;
        setUsersLoading(false);
        setOwners(ownerRows);
        setParticipantUsers(
          ownerRows.map((user) => ({
            id: user.id,
            name: user.name,
            email: user.email ?? null,
            type: "user",
          })),
        );
      });

    if (mode === "create") {
      const currentUser = authService.getSessionUser();
      if (currentUser) {
        setForm((current) => ({
          ...current,
          owner_id: currentUser.id,
          ownerLabel: currentUser.name,
        }));
      }
    }

    return () => {
      cancelled = true;
    };
  }, [mode]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  /** Adds the record to the list, or removes it if it is already there. */
  function toggleIn(field: "participants" | "related", record: SelectedRecord) {
    setForm((current) => {
      const key = recordKey(record);
      const list = current[field];
      return {
        ...current,
        [field]: list.some((item) => recordKey(item) === key)
          ? list.filter((item) => recordKey(item) !== key)
          : [...list, record],
      };
    });
  }

  function removeFrom(field: "participants" | "related", record: SelectedRecord) {
    const key = recordKey(record);
    setForm((current) => ({
      ...current,
      [field]: current[field].filter((item) => recordKey(item) !== key),
    }));
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (isUnchanged()) return;

    if (!form.title.trim()) return setError("Title is required.");
    if (!form.owner_id) return setError("Host is required.");
    if (!form.from_date) return setError("Start date is required.");
    if (!form.all_day && !form.from_time) return setError("Start time is required.");

    setError(null);
    setSaving(true);

    try {
      const from = new Date(`${form.from_date}T${form.all_day ? "00:00" : form.from_time}`);
      const to = form.to_date
        ? new Date(`${form.to_date}T${form.all_day ? "00:00" : form.to_time || form.from_time}`)
        : null;

      if (!Number.isFinite(from.getTime()) || !to || !Number.isFinite(to.getTime())) {
        setError("Please provide valid start and end date/time values.");
        setSaving(false);
        return;
      }

      if (to < from) {
        setError("End time cannot be earlier than start time.");
        setSaving(false);
        return;
      }

      const participantPayload = {
        users: form.participants
          .filter((participant) => participant.type === "user")
          .map((participant) => participant.id),
        leads: form.participants
          .filter((participant) => participant.type === "lead")
          .map((participant) => participant.id),
        contacts: form.participants
          .filter((participant) => participant.type === "contact")
          .map((participant) => participant.id),
      };

      const relatedPayload: RelatedToPayload[] = (
        [
          ["LEAD", "lead"],
          ["CONTACT", "contact"],
        ] as const
      )
        .map(([type, kind]) => ({
          type,
          ids: form.related.filter((record) => record.type === kind).map((record) => record.id),
        }))
        .filter((group) => group.ids.length > 0);

      await onSubmit({
        title: form.title.trim(),
        host_id: form.owner_id,
        location: form.location.trim() || null,
        start_at: from.toISOString(),
        end_at: to.toISOString(),
        is_all_day: form.all_day,
        description: form.description.trim() || null,
        related_to: relatedPayload.length > 0 ? relatedPayload : null,
        participants: participantPayload,
        ...(sendMeet ? { add_google_meet: true } : {}),
      });
    } catch (caught) {
      // Keep the form filled so the user can fix the problem and save again.
      if (caught instanceof MeetingApiError) {
        setError(caught.message);
        if (caught.isGoogleNotConnected) void google.refresh();
      } else {
        setError("Couldn't save this meeting. Check the fields and try again.");
      }
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col bg-surface text-fg">
      <div className="shrink-0 border-b border-line px-5 py-4">
        <h2 className="font-serif text-xl font-semibold">Meeting Information</h2>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-2">
        {warning && <FormWarning message={warning} className="my-3" />}
        {error && (
          <div ref={errorRef as React.RefObject<HTMLDivElement>} className="my-3 rounded-md border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger">
            {error}
          </div>
        )}

        <ZohoRow label="Title">
          <input
            autoFocus
            value={form.title}
            onChange={(e) => update("title", e.target.value)}
            className={fieldClass}
          />
        </ZohoRow>


        <ZohoRow label="Location">
          <input
            value={form.location}
            onChange={(e) => update("location", e.target.value)}
            placeholder="Enter location or meeting link"
            className={fieldClass}
          />
        </ZohoRow>

        <ZohoRow label="All day">
          <input
            type="checkbox"
            checked={form.all_day}
            disabled={meetLockedByExisting}
            aria-describedby={meetLockedByExisting ? "all-day-meet-note" : undefined}
            onChange={(e) =>
              // Meet can't be added to all-day meetings, so switching to all-day turns it off.
              setForm((current) => ({
                ...current,
                all_day: e.target.checked,
                add_google_meet: e.target.checked ? false : current.add_google_meet,
              }))
            }
            className="h-3.5 w-3.5 rounded border-line accent-indigo-500 disabled:opacity-50"
          />
          {meetLockedByExisting && (
            <p id="all-day-meet-note" className="mt-1 text-xs text-ink-soft">
              A meeting with Google Meet can&apos;t be changed to all-day.
            </p>
          )}
        </ZohoRow>

        <DateLine
          label="From"
          date={form.from_date}
          time={form.from_time}
          allDay={form.all_day}
          onDate={(v) => update("from_date", v)}
          onTime={(v) => update("from_time", v)}
        />

        <DateLine
          label="To"
          date={form.to_date}
          time={form.to_time}
          allDay={form.all_day}
          onDate={(v) => update("to_date", v)}
          onTime={(v) => update("to_time", v)}
        />

        <ZohoRow label="Host">
          <HostPicker
            owners={owners}
            value={form.owner_id}
            label={form.ownerLabel}
            onChange={(id, label) => {
              update("owner_id", id);
              update("ownerLabel", label);
            }}
          />
        </ZohoRow>

        <ZohoRow label="Participants" align="top">
          <SelectedRecordsField
            ariaLabel="Selected participants"
            records={form.participants}
            showType
            onAdd={() => setPicker("participants")}
            onRemove={(record) => removeFrom("participants", record)}
          />
        </ZohoRow>

        {meetAvailable && (
          <ZohoRow label="Google Meet">
            <div className="py-1.5">
              {needsConnect ? (
                <div>
                  <button
                    type="button"
                    onClick={() => void google.connect()}
                    disabled={google.connecting || form.all_day}
                    className="inline-flex items-center gap-1.5 rounded-md border border-line bg-surface px-3 py-1.5 text-sm font-medium text-fg hover:bg-paper disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {google.connecting ? <Spinner size="sm" /> : <Link2 size={14} />}
                    {google.connecting
                      ? "Waiting for Google…"
                      : googleRevoked
                        ? "Reconnect Google"
                        : "Connect Google"}
                  </button>
                  <p className="mt-1 text-xs text-ink-soft">
                    {form.all_day
                      ? "Google Meet isn\u2019t available for all-day meetings."
                      : googleRevoked
                        ? "Your Google connection expired. Reconnect to add a Meet link and send invites. The form stays as it is."
                        : "Connect your Google account to add a Meet link and send calendar invites. The form stays as it is."}
                  </p>
                </div>
              ) : google.loading && google.status === null && hostIsMe ? (
                <span className="inline-flex items-center gap-2 text-xs text-ink-soft">
                  <Spinner size="sm" /> Checking Google connection…
                </span>
              ) : (
                <div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={sendMeet}
                      onChange={(next) => update("add_google_meet", next)}
                      ariaLabel="Add Google Meet"
                      disabled={form.all_day}
                    />
                    <span className="text-sm text-fg">Add Google Meet</span>
                  </div>
                  <p className="text-xs text-ink-soft">
                    {form.all_day
                      ? "Google Meet isn\u2019t available for all-day meetings."
                      : sendMeet
                        ? "A Meet link is created when you save. Participants get a Google Calendar invite by email, plus a reminder email with the link 15 minutes before the meeting."
                        : "Turn on to create a Meet link and email invites to participants."}
                  </p>
                  {!hostIsMe && form.owner_id && !form.all_day && (
                    <p className="mt-1 text-xs text-ink-soft">
                      The host ({form.ownerLabel || "selected user"}) must have connected their
                      Google account, otherwise the meeting can&apos;t be saved with Meet.
                    </p>
                  )}
                  {sendMeet && form.participants.length === 0 && (
                    <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">
                      No participants added yet. The Meet link will be created, but nobody will be
                      emailed. Use “Add” next to Participants to invite people.
                    </p>
                  )}
                  {sendMeet && participantsWithoutEmail.length > 0 && (
                    <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">
                      No email on file for {participantsWithoutEmail.map((p) => p.name).join(", ")}
                      {" "}— they won&apos;t receive the invite.
                    </p>
                  )}
                </div>
              )}
              <p
                role="status"
                aria-live="polite"
                className={google.error ? "mt-1 text-xs text-danger" : "sr-only"}
              >
                {google.error ?? ""}
              </p>
            </div>
          </ZohoRow>
        )}

        <ZohoRow label="Related To" align="top">
          <SelectedRecordsField
            ariaLabel="Related leads and contacts"
            records={form.related}
            showType
            onAdd={() => setPicker("related")}
            onRemove={(record) => removeFrom("related", record)}
          />
        </ZohoRow>

        <button
          type="button"
          onClick={() => setShowMore((v) => !v)}
          aria-expanded={showMore}
          aria-controls="meeting-more-details"
          className="my-2 inline-flex items-center gap-1 rounded-md py-1.5 text-sm font-medium text-indigo-500 hover:text-indigo-400 dark:text-indigo-400"
        >
          <ChevronRight size={14} className={`transition-transform duration-200 ${showMore ? "rotate-90" : ""}`} />
          {showMore ? "Hide details" : "Add more details"}
        </button>

        {showMore && (
          <div id="meeting-more-details" className="pb-4">
            <ZohoRow label="Description" align="top" last>
              <div className="py-1.5">
                <textarea
                  id="meeting-description"
                  value={form.description}
                  onChange={(e) => update("description", e.target.value)}
                  rows={5}
                  placeholder="Add an agenda, talking points or notes for this meeting…"
                  className="block min-h-28 w-full resize-y rounded-lg border border-line bg-surface px-3 py-2.5 text-sm leading-relaxed text-fg outline-none transition placeholder:text-ink-soft focus:border-slate focus:ring-2 focus:ring-slate-light"
                />
                {form.description.length > 0 && (
                  <p className="mt-1.5 text-right text-xs tabular-nums text-ink-soft">
                    {form.description.length.toLocaleString()} characters
                  </p>
                )}
              </div>
            </ZohoRow>
          </div>
        )}
      </div>

      <div className="flex shrink-0 justify-end gap-2 border-t border-line px-5 py-3">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md border border-line px-4 py-2 text-sm font-medium hover:bg-paper"
        >
          Cancel
        </button>
        <button
          disabled={saving}
          className="flex items-center gap-2 rounded-md bg-indigo-500 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-400 disabled:opacity-60"
        >
          {saving && <Spinner size="sm" className="border-white/30 border-t-white" />}
          {saving ? "Saving…" : "Save"}
        </button>
      </div>

      {picker === "participants" && (
        <RecordSelectionDialog
          title="Add participants"
          subtitle="Pick any mix of users, leads and contacts to invite."
          categories={PARTICIPANT_CATEGORIES}
          selected={form.participants}
          users={participantUsers}
          usersLoading={usersLoading}
          onToggle={(record) => toggleIn("participants", record)}
          onClear={() => update("participants", [])}
          onClose={() => setPicker(null)}
        />
      )}

      {picker === "related" && (
        <RecordSelectionDialog
          title="Related to"
          subtitle="Link this meeting to as many leads and contacts as you need."
          categories={RELATED_CATEGORIES}
          selected={form.related}
          onToggle={(record) => toggleIn("related", record)}
          onClear={() => update("related", [])}
          onClose={() => setPicker(null)}
        />
      )}
    </form>
  );
}

function ZohoRow({
  label,
  children,
  align = "center",
  last = false,
}: {
  label: string;
  children: ReactNode;
  /** `top` pins the label to the first line for tall content (chips, textareas). */
  align?: "center" | "top";
  last?: boolean;
}) {
  return (
    <div
      className={`grid grid-cols-[125px_1fr] gap-4 py-1.5 ${align === "top" ? "items-start" : "items-center"} ${
        last ? "" : "border-b border-line/80"
      }`}
    >
      <label className={`text-sm text-ink-soft ${align === "top" ? "pt-2.5" : ""}`}>{label}</label>
      <div className="min-w-0">{children}</div>
    </div>
  );
}


function DateLine({
  label,
  date,
  time,
  allDay,
  onDate,
  onTime,
}: {
  label: string;
  date: string;
  time: string;
  allDay: boolean;
  onDate: (v: string) => void;
  onTime: (v: string) => void;
}) {
  return (
    <div className="grid grid-cols-[125px_1fr] items-center gap-4 border-b border-line/80 py-1.5">
      <label className="text-sm text-ink-soft">{label}</label>
      <div className="flex min-w-0 items-center gap-4">
        <DateInput value={date} onChange={onDate} />
        {!allDay && (
          <Time12hPicker value={time} onChange={onTime} />
        )}
      </div>
    </div>
  );
}

function HostPicker({
  owners,
  value,
  label,
  onChange,
}: {
  owners: LeadOwnerOption[];
  value: string;
  label: string;
  onChange: (id: string, label: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const filtered = owners.filter((owner) =>
    `${owner.name} ${owner.email ?? ""}`.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between border-0 border-b border-line bg-transparent py-2 text-left text-sm"
      >
        <span className={value ? "text-fg" : "text-ink-soft"}>{label || "Select host…"}</span>
        <ChevronDown size={14} className="text-ink-soft" />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-30 w-full rounded-md border border-line bg-surface shadow-xl">
          <div className="border-b border-line p-2">
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name or email…"
              className="w-full rounded border border-line bg-transparent px-2 py-1.5 text-sm outline-none"
            />
          </div>
          <div className="max-h-48 overflow-y-auto py-1">
            {filtered.map((owner) => (
              <button
                type="button"
                key={owner.id}
                onClick={() => {
                  onChange(owner.id, owner.name);
                  setOpen(false);
                  setQuery("");
                }}
                className={`flex w-full flex-col px-3 py-2 text-left hover:bg-paper ${owner.id === value ? "bg-slate-light" : ""}`}
              >
                <span className="text-sm">{owner.name}</span>
                <span className="text-xs text-ink-soft">{owner.email}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
