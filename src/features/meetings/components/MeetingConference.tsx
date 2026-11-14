"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Check, Copy, Link2, Video } from "lucide-react";
import FormWarning from "@/shared/components/FormWarning";
import Spinner from "@/shared/components/Spinner";
import { authService } from "@/features/auth/services/authService";
import { MeetingService } from "@/features/meetings/services/MeetingService";
import { MeetingApiError } from "@/features/meetings/services/meetingErrors";
import { useGoogleConnection } from "@/features/googleIntegration/hooks/useGoogleConnection";
import { isGoogleUsable } from "@/features/googleIntegration/types/google.types";
import type {
  Meeting,
  MeetingConferenceFields,
} from "@/features/meetings/types/meeting.types";

interface Props {
  meeting: Meeting;
  onMeetingChange: (meeting: Meeting) => void;
}

const secondaryButton =
  "inline-flex items-center gap-1.5 rounded-md border border-line bg-surface px-3 py-1.5 text-sm font-medium text-fg hover:bg-paper disabled:cursor-not-allowed disabled:opacity-60";
const primaryButton =
  "inline-flex items-center gap-1.5 rounded-md bg-ink px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-ink-2 disabled:cursor-not-allowed disabled:opacity-60";

function applyConference(meeting: Meeting, fields: MeetingConferenceFields): Meeting {
  return {
    ...meeting,
    meet_link: fields.meet_link,
    conference_provider: fields.conference_provider,
    conference_status: fields.conference_status,
    conference_error: fields.conference_error,
  };
}

/** Google Meet section of the meeting detail: join/copy, retry and "add Meet". */
export default function MeetingConference({ meeting, onMeetingChange }: Props) {
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [notConnectedMessage, setNotConnectedMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const copyTimer = useRef<number | null>(null);
  const meetingRef = useRef(meeting);

  // Not fetched up front; only used for the "connect Google" recovery path.
  const google = useGoogleConnection({ enabled: false });
  const [currentUserId] = useState(() => authService.getSessionUser()?.id ?? null);
  const hostIsMe = Boolean(currentUserId) && meeting.host_id === currentUserId;
  const googleReady = isGoogleUsable(google.status);

  useEffect(() => {
    meetingRef.current = meeting;
  }, [meeting]);

  useEffect(
    () => () => {
      if (copyTimer.current !== null) window.clearTimeout(copyTimer.current);
    },
    [],
  );

  async function run() {
    setBusy(true);
    setActionError(null);
    setNotice(null);
    setNotConnectedMessage(null);

    try {
      const result = await MeetingService.addConference(meeting.id);
      onMeetingChange(applyConference(meetingRef.current, result));
      if (result.conference_status === "created" && !result.conference_error) {
        setNotice(result.message ?? "Google Meet is set up for this meeting.");
      }
    } catch (caught) {
      const failure =
        caught instanceof MeetingApiError
          ? caught
          : new MeetingApiError("Couldn't set up Google Meet. Try again.");

      // 502: the server saved the failed state on the meeting, so show it.
      if (failure.conference) {
        onMeetingChange(applyConference(meetingRef.current, failure.conference));
      }

      if (failure.isGoogleNotConnected) {
        setNotConnectedMessage(failure.message);
      } else if (!failure.conference) {
        setActionError(failure.message);
      }
    } finally {
      setBusy(false);
    }
  }

  async function copyLink() {
    if (!meeting.meet_link) return;
    try {
      await navigator.clipboard.writeText(meeting.meet_link);
      setCopied(true);
      if (copyTimer.current !== null) window.clearTimeout(copyTimer.current);
      copyTimer.current = window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setActionError("Couldn't copy the link. Select it and copy it manually.");
    }
  }

  const status = meeting.conference_status;
  if (status === "none" && meeting.is_all_day) return null;

  const retryButton = (label: string) => (
    <button type="button" onClick={() => void run()} disabled={busy} className={secondaryButton}>
      {busy && <Spinner size="sm" />}
      {busy ? "Working…" : label}
    </button>
  );

  return (
    <div className="mt-4 rounded-lg border border-line bg-surface p-6">
      <h2 className="mb-4 text-xs font-semibold uppercase tracking-wide text-ink-soft">
        Google Meet
      </h2>

      {status === "created" && meeting.meet_link ? (
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <a
              href={meeting.meet_link}
              target="_blank"
              rel="noopener noreferrer"
              className={primaryButton}
            >
              <Video size={14} /> Join
            </a>
            <button type="button" onClick={() => void copyLink()} className={secondaryButton}>
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? "Copied" : "Copy link"}
            </button>
            <span role="status" aria-live="polite" className="sr-only">
              {copied ? "Link copied" : ""}
            </span>
          </div>
          <a
            href={meeting.meet_link}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 block break-all text-sm text-slate hover:underline"
          >
            {meeting.meet_link}
          </a>
          {meeting.conference_error && (
            <div className="mt-3">
              <FormWarning
                className=""
                message={`Google Calendar couldn’t be updated: ${meeting.conference_error}`}
              />
              <div className="mt-2">{retryButton("Retry sync")}</div>
            </div>
          )}
        </div>
      ) : status === "failed" ? (
        <div>
          <p className="inline-flex items-center gap-1.5 rounded-full bg-danger-soft px-2.5 py-1 text-xs font-semibold text-danger">
            <AlertTriangle size={13} /> Google Meet failed
          </p>
          <p className="mt-2 text-sm text-ink-soft">
            {meeting.conference_error ?? "Google Meet could not be created for this meeting."}
          </p>
          <div className="mt-3">{retryButton("Retry")}</div>
        </div>
      ) : (
        <div>
          <p className="text-sm text-ink-soft">
            No Google Meet link yet. Participants will receive a Google Calendar invite by email.
          </p>
          <div className="mt-3">
            <button
              type="button"
              onClick={() => void run()}
              disabled={busy}
              className={primaryButton}
            >
              {busy ? <Spinner size="sm" className="border-white/30 border-t-white" /> : <Video size={14} />}
              {busy ? "Adding…" : "Add Google Meet"}
            </button>
          </div>
        </div>
      )}

      <div aria-live="polite">
        {notConnectedMessage && !googleReady && (
          <div className="mt-3 rounded-md border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger">
            <p>{notConnectedMessage}</p>
            {hostIsMe ? (
              <button
                type="button"
                onClick={() => void google.connect()}
                disabled={google.connecting}
                className={`${secondaryButton} mt-2`}
              >
                {google.connecting ? <Spinner size="sm" /> : <Link2 size={14} />}
                {google.connecting ? "Waiting for Google…" : "Connect Google"}
              </button>
            ) : (
              <p className="mt-1 text-xs">
                Ask {meeting.host_name || "the host"} to connect their Google account, then try again.
              </p>
            )}
          </div>
        )}
        {notConnectedMessage && googleReady && (
          <p className="mt-3 text-sm text-success">
            Google is connected. Try again to set up Meet.
          </p>
        )}
        {google.error && <p className="mt-3 text-sm text-danger">{google.error}</p>}
        {actionError && <p className="mt-3 text-sm text-danger">{actionError}</p>}
        {notice && <p className="mt-3 text-sm text-success">{notice}</p>}
      </div>
    </div>
  );
}
