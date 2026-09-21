"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Calendar, Check, ChevronDown, Pencil, Plus, Search, X } from "lucide-react";
import { userService } from "@/features/users/services/userService";
import type { LeadOwnerOption } from "@/features/auth/types/auth.types";
import { authService } from "@/features/auth/services/authService";
import { LeadService } from "@/features/leads/services/LeadService";
import { ContactService } from "@/features/contacts/services/ContactService";
import { AccountService } from "@/features/accounts/services/AccountService";
import Spinner from "@/shared/components/Spinner";
import Time12hPicker from "@/shared/components/Time12hPicker";
import {
  MEETING_REPEAT_TYPES,
  MEETING_VENUES,
  type Meeting,
  type MeetingParticipant,
  type MeetingParticipantType,
  type CreateMeetingPayload,
  type MeetingRepeatType,
  type MeetingVenue,
} from "@/features/meetings/types/meeting.types";

interface Props {
  mode: "create" | "edit";
  initialMeeting?: Meeting;
  onSubmit: (payload: CreateMeetingPayload) => Promise<void>;
  onCancel: () => void;
}

interface RelatedRecord {
  id: string;
  label: string;
  sublabel?: string;
}

type RelatedType = "" | "lead" | "contact" | "account";
type ParticipantCategory = Exclude<MeetingParticipantType, "email">;

interface ParticipantCandidate {
  id: string;
  name: string;
  email: string | null;
  type: MeetingParticipantType;
}

interface FormState {
  title: string;
  owner_id: string;
  ownerLabel: string;
  meeting_venue: MeetingVenue;
  location: string;
  all_day: boolean;
  from_date: string;
  from_time: string;
  to_date: string;
  to_time: string;
  participants: MeetingParticipant[];
  relatedType: RelatedType;
  relatedId: string;
  relatedLabel: string;
  repeat_type: MeetingRepeatType;
  description: string;
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

function emptyForm(): FormState {
  const now = new Date();
  const [date, time] = splitDateTime(now.toISOString());
  const end = new Date(now.getTime() + 60 * 60 * 1000);
  const [toDate, toTime] = splitDateTime(end.toISOString());

  return {
    title: "New Meeting",
    owner_id: "",
    ownerLabel: "",
    meeting_venue: "Client location",
    location: "",
    all_day: false,
    from_date: date,
    from_time: time,
    to_date: toDate,
    to_time: toTime,
    participants: [],
    relatedType: "",
    relatedId: "",
    relatedLabel: "",
    repeat_type: "None",
    description: "",
  };
}

function fromMeeting(m: Meeting): FormState {
  const [fd, ft] = splitDateTime(m.from_datetime);
  const [td, tt] = splitDateTime(m.to_datetime);
  const relatedType: RelatedType = m.lead_id
    ? "lead"
    : m.contact_id
      ? "contact"
      : m.account_id
        ? "account"
        : "";

  return {
    title: m.title ?? "",
    owner_id: m.owner_id ?? "",
    ownerLabel: m.owner_name ?? "",
    meeting_venue: m.meeting_venue ?? "Client location",
    location: m.location ?? "",
    all_day: m.all_day ?? false,
    from_date: fd,
    from_time: ft,
    to_date: td || fd,
    to_time: tt,
    participants: (m.participants ?? []).map((participant) => ({
      ...participant,
      // Meetings created before participant types were introduced stored
      // user participants without a type.
      type: participant.type ?? "user",
    })),
    relatedType,
    relatedId: m.lead_id ?? m.contact_id ?? m.account_id ?? "",
    relatedLabel: m.lead_name ?? m.contact_name ?? m.account_name ?? "",
    repeat_type: m.repeat_type ?? "None",
    description: m.description ?? "",
  };
}

const fieldClass =
  "w-full border-0 border-b border-line bg-transparent px-0 py-2 text-sm text-fg outline-none focus:border-slate focus:ring-0";

export default function MeetingForm({ mode, initialMeeting, onSubmit, onCancel }: Props) {
  const [form, setForm] = useState<FormState>(() =>
    initialMeeting ? fromMeeting(initialMeeting) : emptyForm(),
  );
  const [owners, setOwners] = useState<LeadOwnerOption[]>([]);
  const [participantUsers, setParticipantUsers] = useState<ParticipantCandidate[]>([]);
  const [leadOptions, setLeadOptions] = useState<RelatedRecord[]>([]);
  const [contactOptions, setContactOptions] = useState<RelatedRecord[]>([]);
  const [accountOptions, setAccountOptions] = useState<RelatedRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showParticipants, setShowParticipants] = useState(false);
  const [participantSearch, setParticipantSearch] = useState("");
  const [participantCategory, setParticipantCategory] = useState<ParticipantCategory>("user");
  const [participantTab, setParticipantTab] = useState<"all" | "selected">("all");
  const [inviteEmails, setInviteEmails] = useState("");
  const [showMore, setShowMore] = useState(false);
  const [showVenueMenu, setShowVenueMenu] = useState(false);
  const [showRelatedMenu, setShowRelatedMenu] = useState(false);
  const [showRepeat, setShowRepeat] = useState(false);
  const [repeatDraft, setRepeatDraft] = useState({
    all_day: false,
    from_date: "",
    from_time: "",
    to_date: "",
    to_time: "",
    repeat_type: "None" as MeetingRepeatType,
  });

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      userService.getLeadOwners().catch(() => [] as LeadOwnerOption[]),
      userService.getUsers().catch(() => []),
      LeadService.getLeads().catch(() => []),
      ContactService.getContacts().catch(() => []),
      AccountService.getAccounts().catch(() => []),
    ]).then(([ownerRows, users, leads, contacts, accounts]) => {
      if (cancelled) return;
      setOwners(ownerRows);
      setParticipantUsers(
        users.map((user) => ({
          id: user.id,
          name: user.name,
          email: user.email ?? null,
          type: "user",
        })),
      );
      setLeadOptions(
        leads.map((row) => ({
          id: row.id,
          label: row.name || row.company_name || "Unnamed Lead",
          sublabel: row.company_name || row.email || undefined,
        })),
      );
      setContactOptions(
        contacts.map((row) => ({
          id: row.id,
          label: row.name || "Unnamed Contact",
          sublabel: row.email || row.account_name || undefined,
        })),
      );
      setAccountOptions(
        accounts.map((row) => ({
          id: row.id,
          label: row.account_name || "Unnamed Account",
          sublabel: row.website || row.phone || undefined,
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

  const participantCandidates = useMemo(() => {
    const query = participantSearch.trim().toLowerCase();

    const allCandidates: ParticipantCandidate[] = [
      ...participantUsers,
      ...leadOptions.map((lead) => ({
        id: lead.id,
        name: lead.label,
        email: lead.sublabel ?? null,
        type: "lead" as const,
      })),
      ...contactOptions.map((contact) => ({
        id: contact.id,
        name: contact.label,
        email: contact.sublabel ?? null,
        type: "contact" as const,
      })),
    ];

    const matchesSearch = (participant: ParticipantCandidate | MeetingParticipant) =>
      `${participant.name} ${participant.email ?? ""}`.toLowerCase().includes(query);

    if (participantTab === "selected") {
      // "Selected" is intentionally category-independent: it shows every
      // selected user, lead, contact, and invited email.
      return form.participants
        .filter(matchesSearch)
        .map((participant) => ({
          id: participant.id,
          name: participant.name,
          email: participant.email ?? null,
          type: participant.type ?? "user",
        }));
    }

    return allCandidates
      .filter((candidate) => candidate.type === participantCategory)
      .filter(matchesSearch);
  }, [
    participantUsers,
    leadOptions,
    contactOptions,
    participantCategory,
    participantSearch,
    participantTab,
    form.participants,
  ]);

  const relatedOptions =
    form.relatedType === "lead"
      ? leadOptions
      : form.relatedType === "contact"
        ? contactOptions
        : form.relatedType === "account"
          ? accountOptions
          : [];

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function chooseRelatedType(type: RelatedType) {
    setForm((current) => ({
      ...current,
      relatedType: type,
      relatedId: "",
      relatedLabel: "",
    }));
    setShowRelatedMenu(false);
  }

  function participantIdentity(participant: Pick<MeetingParticipant, "id" | "type">) {
    return `${participant.type ?? "user"}:${participant.id}`;
  }

  function toggleParticipant(candidate: ParticipantCandidate) {
    setForm((current) => {
      const candidateIdentity = participantIdentity(candidate);
      const exists = current.participants.some(
        (participant) => participantIdentity(participant) === candidateIdentity,
      );

      return {
        ...current,
        participants: exists
          ? current.participants.filter(
              (participant) => participantIdentity(participant) !== candidateIdentity,
            )
          : [
              ...current.participants,
              {
                id: candidate.id,
                name: candidate.name,
                email: candidate.email,
                type: candidate.type,
              },
            ],
      };
    });
  }

  function removeParticipant(participant: MeetingParticipant) {
    const identity = participantIdentity(participant);
    setForm((current) => ({
      ...current,
      participants: current.participants.filter(
        (candidate) => participantIdentity(candidate) !== identity,
      ),
    }));
  }

  function openRepeat() {
    setRepeatDraft({
      all_day: form.all_day,
      from_date: form.from_date,
      from_time: form.from_time,
      to_date: form.to_date,
      to_time: form.to_time,
      repeat_type: form.repeat_type,
    });
    setShowRepeat(true);
  }

  function saveRepeat() {
    setForm((current) => ({
      ...current,
      all_day: repeatDraft.all_day,
      from_date: repeatDraft.from_date,
      from_time: repeatDraft.from_time,
      to_date: repeatDraft.to_date,
      to_time: repeatDraft.to_time,
      repeat_type: repeatDraft.repeat_type,
    }));
    setShowRepeat(false);
  }

  function addInviteEmails() {
    const emails = inviteEmails
      .split(/[;,\s]+/)
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean);

    if (!emails.length) return;

    setForm((current) => {
      const additions = emails
        .filter((email) => !current.participants.some((p) => p.email?.toLowerCase() === email))
        .map((email) => ({
          id: `email:${email}`,
          name: email,
          email,
          type: "email" as const,
        }));
      return { ...current, participants: [...current.participants, ...additions] };
    });
    setInviteEmails("");
  }

  async function submit(e: FormEvent) {
    e.preventDefault();

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

      await onSubmit({
        title: form.title.trim(),
        owner_id: form.owner_id,
        owner_name: form.ownerLabel || null,
        meeting_venue: form.meeting_venue,
        location: form.location.trim() || null,
        from_datetime: from.toISOString(),
        to_datetime: to?.toISOString() ?? null,
        all_day: form.all_day,
        participants: form.participants,
        repeat_type: form.repeat_type,
        description: form.description.trim() || null,
        lead_id: form.relatedType === "lead" ? form.relatedId || null : null,
        lead_name: form.relatedType === "lead" ? form.relatedLabel || null : null,
        contact_id: form.relatedType === "contact" ? form.relatedId || null : null,
        contact_name: form.relatedType === "contact" ? form.relatedLabel || null : null,
        account_id:
          form.relatedType === "account" ? form.relatedId || null : null,
        account_name:
          form.relatedType === "account" ? form.relatedLabel || null : null,
      });
    } catch {
      setError("Couldn't save this meeting. Check the fields and try again.");
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="bg-surface text-fg">
      <div className="border-b border-line px-6 py-5">
        <h2 className="font-serif text-xl font-semibold">Meeting Information</h2>
      </div>

      <div className="max-h-[72vh] overflow-y-auto px-6 py-2">
        {error && (
          <div className="my-3 rounded-md border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger">
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

        <ZohoRow label="Meeting Venue">
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowVenueMenu((v) => !v)}
              className="flex w-full items-center justify-between border-0 border-b border-line bg-transparent py-2 text-left text-sm text-fg outline-none"
            >
              <span>{form.meeting_venue}</span>
              <ChevronDown size={14} className="text-ink-soft" />
            </button>
            {showVenueMenu && (
              <div className="absolute left-0 top-full z-30 mt-1 w-48 overflow-hidden rounded-md border border-line bg-surface shadow-xl">
                {MEETING_VENUES.map((venue) => (
                  <button
                    type="button"
                    key={venue}
                    onClick={() => {
                      update("meeting_venue", venue);
                      setShowVenueMenu(false);
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-paper"
                  >
                    <span className="w-3 text-slate">{form.meeting_venue === venue ? "✓" : ""}</span>
                    {venue}
                  </button>
                ))}
              </div>
            )}
          </div>
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
            onChange={(e) => update("all_day", e.target.checked)}
            className="h-3.5 w-3.5 rounded border-line accent-indigo-500"
          />
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

        <ZohoRow label="Participants">
          <div className="flex min-h-9 items-center gap-2">
            <div className="flex min-w-0 flex-wrap gap-1.5">
              {form.participants.length ? (
                form.participants.map((p) => (
                  <span
                    key={p.id}
                    className="inline-flex items-center gap-1 rounded-full bg-slate-light px-2 py-1 text-xs text-slate"
                  >
                    {p.name}
                    <button type="button" onClick={() => removeParticipant(p)} aria-label={`Remove ${p.name}`}>
                      <X size={11} />
                    </button>
                  </span>
                ))
              ) : (
                <span className="text-sm text-ink-soft">None</span>
              )}
            </div>
            <button
              type="button"
              onClick={() => setShowParticipants(true)}
              className="ml-auto inline-flex shrink-0 items-center gap-1 text-sm text-indigo-400 hover:text-indigo-300"
            >
              <Plus size={14} /> Add
            </button>
          </div>
        </ZohoRow>

        <ZohoRow label="Related To">
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowRelatedMenu((v) => !v)}
              className="flex w-full items-center justify-between border-0 border-b border-line bg-transparent py-2 text-left text-sm outline-none"
            >
              <span className={form.relatedType ? "text-fg" : "text-ink-soft"}>
                {form.relatedType === "lead"
                  ? "Lead"
                  : form.relatedType === "contact"
                    ? "Contact"
                    : form.relatedType === "account"
                      ? "Others"
                      : "None"}
              </span>
              <ChevronDown size={14} className="text-ink-soft" />
            </button>

            {showRelatedMenu && (
              <div className="absolute left-0 top-full z-30 mt-1 w-36 overflow-hidden rounded-md border border-line bg-surface shadow-xl">
                {([
                  ["", "None"],
                  ["lead", "Lead"],
                  ["contact", "Contact"],
                  ["account", "Others"],
                ] as const).map(([value, label]) => (
                  <button
                    type="button"
                    key={label}
                    onClick={() => chooseRelatedType(value)}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-paper"
                  >
                    <span className="w-3 text-slate">{form.relatedType === value ? "✓" : ""}</span>
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {form.relatedType && (
            <div className="relative mt-1 flex items-center border-b border-line">
              <Search size={14} className="mr-2 shrink-0 text-ink-soft" />
              <RelatedSelect
                options={relatedOptions}
                value={form.relatedId}
                label={form.relatedLabel}
                onChange={(id, label) => {
                  update("relatedId", id);
                  update("relatedLabel", label);
                }}
                placeholder={`Search ${form.relatedType === "account" ? "account" : form.relatedType}…`}
              />
            </div>
          )}
        </ZohoRow>

        <ZohoRow label="Repeat">
          <button
            type="button"
            onClick={openRepeat}
            className="group flex w-full items-center justify-between py-2 text-left text-sm"
          >
            <span className={form.repeat_type === "None" ? "text-ink-soft" : "text-fg"}>
              {form.repeat_type}
            </span>
            <Pencil size={13} className="text-indigo-400 opacity-0 transition group-hover:opacity-100" />
          </button>
        </ZohoRow>

        <button
          type="button"
          onClick={() => setShowMore((v) => !v)}
          className="py-3 text-sm text-indigo-400 hover:text-indigo-300"
        >
          {showMore ? "Hide details" : "Add more details"}
        </button>

        {showMore && (
          <div className="pb-4">
            <ZohoRow label="Description">
              <textarea
                value={form.description}
                onChange={(e) => update("description", e.target.value)}
                className={`${fieldClass} min-h-24 resize-y`}
                placeholder="Meeting notes…"
              />
            </ZohoRow>
          </div>
        )}
      </div>

      <div className="flex justify-end gap-2 border-t border-line px-6 py-4">
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

      {showParticipants && (
        <OverlayPanel title="Add Participants" onClose={() => setShowParticipants(false)} wide>
          <div className="flex items-center gap-2">
            <select
              value={participantCategory}
              onChange={(event) => {
                setParticipantCategory(event.target.value as ParticipantCategory);
                setParticipantSearch("");
              }}
              className="h-9 rounded-md border border-line bg-surface px-2 text-sm"
              aria-label="Participant type"
            >
              <option value="user">Users</option>
              <option value="lead">Leads</option>
              <option value="contact">Contacts</option>
            </select>
            <div className="flex flex-1 items-center rounded-md border border-line px-2">
              <Search size={14} className="text-ink-soft" />
              <input
                autoFocus
                value={participantSearch}
                onChange={(e) => setParticipantSearch(e.target.value)}
                placeholder="Search"
                className="w-full bg-transparent px-2 py-2 text-sm outline-none"
              />
            </div>
            <button
              type="button"
              onClick={() => setParticipantTab("all")}
              className={`text-sm ${participantTab === "all" ? "font-semibold text-fg" : "text-ink-soft"}`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setParticipantTab("selected")}
              className={`text-sm ${participantTab === "selected" ? "font-semibold text-indigo-400" : "text-ink-soft"}`}
            >
              Selected({form.participants.length})
            </button>
          </div>

          <div className="mt-3 max-h-48 overflow-y-auto border-y border-line">
            {participantCandidates.length === 0 ? (
              <div className="px-2 py-8 text-center text-sm text-ink-soft">
                {participantTab === "selected"
                  ? "No selected participants found."
                  : `No ${participantCategory === "user" ? "users" : `${participantCategory}s`} found.`}
              </div>
            ) : (
              participantCandidates.map((participant) => {
                const checked = form.participants.some(
                  (selected) =>
                    participantIdentity(selected) === participantIdentity(participant),
                );

                return (
                  <button
                    type="button"
                    key={participantIdentity(participant)}
                    onClick={() => toggleParticipant(participant)}
                    className={`flex w-full items-center gap-3 px-2 py-3 text-left ${checked ? "bg-slate-light" : "hover:bg-paper"}`}
                  >
                    <span
                      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${checked ? "border-indigo-500 bg-indigo-500 text-white" : "border-line"}`}
                    >
                      {checked && <Check size={11} />}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm text-fg">{participant.name}</span>
                      {participant.email && (
                        <span className="block text-xs text-ink-soft">{participant.email}</span>
                      )}
                    </span>
                  </button>
                );
              })
            )}
          </div>

          <div className="mt-5">
            <p className="mb-2 text-xs font-semibold text-fg">
              Invite by Email Address
              <span className="ml-1 font-normal text-ink-soft">: Use commas to separate email addresses.</span>
            </p>
            <input
              value={inviteEmails}
              onChange={(e) => setInviteEmails(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addInviteEmails();
                }
              }}
              placeholder="Add Emails"
              className="w-full rounded-none border border-line bg-transparent px-2 py-2 text-sm outline-none focus:border-slate"
            />
          </div>

          <div className="mt-5 flex justify-end">
            <button
              type="button"
              onClick={() => {
                addInviteEmails();
                setShowParticipants(false);
              }}
              className="rounded-md bg-indigo-500 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-400"
            >
              Done
            </button>
          </div>
        </OverlayPanel>
      )}

      {showRepeat && (
        <OverlayPanel title="Repeat" onClose={() => setShowRepeat(false)}>
          <RepeatField label="All day">
            <input
              type="checkbox"
              checked={repeatDraft.all_day}
              onChange={(e) => setRepeatDraft((d) => ({ ...d, all_day: e.target.checked }))}
              className="h-3.5 w-3.5 rounded border-line accent-indigo-500"
            />
          </RepeatField>
          <DateLine
            label="From"
            date={repeatDraft.from_date}
            time={repeatDraft.from_time}
            allDay={repeatDraft.all_day}
            onDate={(v) => setRepeatDraft((d) => ({ ...d, from_date: v }))}
            onTime={(v) => setRepeatDraft((d) => ({ ...d, from_time: v }))}
          />
          <DateLine
            label="To"
            date={repeatDraft.to_date}
            time={repeatDraft.to_time}
            allDay={repeatDraft.all_day}
            onDate={(v) => setRepeatDraft((d) => ({ ...d, to_date: v }))}
            onTime={(v) => setRepeatDraft((d) => ({ ...d, to_time: v }))}
          />
          <RepeatField label="Repeat type">
            <div className="relative w-full">
              <select
                value={repeatDraft.repeat_type}
                onChange={(e) =>
                  setRepeatDraft((d) => ({ ...d, repeat_type: e.target.value as MeetingRepeatType }))
                }
                className={fieldClass}
              >
                {MEETING_REPEAT_TYPES.map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
            </div>
          </RepeatField>
          <div className="mt-8 flex justify-end">
            <button
              type="button"
              onClick={saveRepeat}
              className="rounded-md bg-indigo-500 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-400"
            >
              Done
            </button>
          </div>
        </OverlayPanel>
      )}
    </form>
  );
}

function ZohoRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[125px_1fr] items-center gap-4 border-b border-line/80 py-1.5">
      <label className="text-sm text-ink-soft">{label}</label>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

function RepeatField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[125px_1fr] items-center gap-4 border-b border-line/80 py-1.5">
      <label className="text-sm text-ink-soft">{label}</label>
      <div>{children}</div>
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

function DateInput({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const pickerRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState("");

  useEffect(() => {
    if (!value) {
      setText("");
      return;
    }
    const [year, month, day] = value.split("-");
    setText(year && month && day ? `${month}/${day}/${year}` : value);
  }, [value]);

  function parseAndCommit(raw: string) {
    const input = raw.trim();
    if (!input) {
      onChange("");
      return;
    }

    const match = input.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
    if (!match) {
      const iso = input.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
      if (!iso) {
        setText(value ? (() => { const [y,m,d] = value.split("-"); return y && m && d ? `${m}/${d}/${y}` : value; })() : "");
        return;
      }
      const [, y, m, d] = iso;
      const normalized = `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
      onChange(normalized);
      return;
    }

    const [, month, day, year] = match;
    const mm = month.padStart(2, "0");
    const dd = day.padStart(2, "0");
    const candidate = new Date(Number(year), Number(month) - 1, Number(day));
    if (candidate.getFullYear() !== Number(year) || candidate.getMonth() !== Number(month) - 1 || candidate.getDate() !== Number(day)) {
      setText(value ? (() => { const [y,m,d] = value.split("-"); return y && m && d ? `${m}/${d}/${y}` : value; })() : "");
      return;
    }
    onChange(`${year}-${mm}-${dd}`);
  }

  function openPicker() {
    const input = pickerRef.current;
    if (!input) return;
    const picker = input as HTMLInputElement & { showPicker?: () => void };
    if (typeof picker.showPicker === "function") picker.showPicker();
    else picker.click();
  }

  return (
    <div className="relative flex min-w-0 items-center">
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={(e) => parseAndCommit(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); parseAndCommit(e.currentTarget.value); e.currentTarget.blur(); } }}
        placeholder="MM/DD/YYYY"
        inputMode="numeric"
        className="min-w-0 border-0 bg-transparent px-0 py-2 pr-7 text-sm text-fg outline-none focus:ring-0"
        aria-label="Date"
      />
      <button
        type="button"
        onClick={openPicker}
        className="absolute right-0 rounded p-1 text-ink-soft hover:bg-paper hover:text-fg"
        aria-label="Choose date"
      >
        <Calendar size={15} />
      </button>
      <input
        ref={pickerRef}
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="pointer-events-none absolute h-px w-px opacity-0"
        tabIndex={-1}
        aria-hidden="true"
      />
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

function RelatedSelect({
  options,
  value,
  label,
  onChange,
  placeholder,
}: {
  options: RelatedRecord[];
  value: string;
  label: string;
  onChange: (id: string, label: string) => void;
  placeholder: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const filtered = options.filter((option) =>
    `${option.label} ${option.sublabel ?? ""}`.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <div className="relative w-full">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between py-2 text-left text-sm"
      >
        <span className={value ? "text-fg" : "text-ink-soft"}>{label || placeholder}</span>
        <ChevronDown size={14} className="text-ink-soft" />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-40 mt-1 w-full rounded-md border border-line bg-surface shadow-xl">
          <div className="border-b border-line p-2">
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search…"
              className="w-full rounded border border-line bg-transparent px-2 py-1.5 text-sm outline-none"
            />
          </div>
          <div className="max-h-48 overflow-y-auto py-1">
            {filtered.map((option) => (
              <button
                type="button"
                key={option.id}
                onClick={() => {
                  onChange(option.id, option.label);
                  setOpen(false);
                  setQuery("");
                }}
                className={`flex w-full flex-col px-3 py-2 text-left hover:bg-paper ${option.id === value ? "bg-slate-light" : ""}`}
              >
                <span className="text-sm">{option.label}</span>
                {option.sublabel && <span className="text-xs text-ink-soft">{option.sublabel}</span>}
              </button>
            ))}
            {filtered.length === 0 && <p className="px-3 py-3 text-sm text-ink-soft">No matches.</p>}
          </div>
        </div>
      )}
    </div>
  );
}

function OverlayPanel({
  title,
  children,
  onClose,
  wide = false,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-[80] flex items-start justify-center bg-black/50 px-4 pt-[12vh]" onClick={onClose}>
      <div
        onClick={(event) => event.stopPropagation()}
        className={`w-full ${wide ? "max-w-3xl" : "max-w-md"} rounded-lg border border-line bg-surface p-5 shadow-2xl`}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-fg">{title}</h3>
          <button type="button" onClick={onClose} className="rounded p-1 text-ink-soft hover:bg-paper hover:text-fg">
            <X size={16} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
