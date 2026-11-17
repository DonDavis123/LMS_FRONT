"use client";

import { useMemo, useState, type ReactNode } from "react";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  ChevronDown,
  Copy,
  Languages,
  ListChecks,
  RefreshCw,
  Search,
  Sparkles,
} from "lucide-react";
import TranscriptStatusBadge from "@/features/calls/components/TranscriptStatusBadge";
import { useRecordingTranscript } from "@/features/calls/hooks/useRecordingTranscript";
import { isTranscriptActive, type RecordingTranscript as Transcript } from "@/features/calls/types/callTranscript.types";
import { isTranscriptStale, speakerStyle, summaryAsText } from "@/features/calls/utils/transcriptFormat";
import { formatDateTime } from "@/shared/utils/formatDate";

interface RecordingTranscriptProps {
  callId: string;
  recordingId: string;
}

type View = "summary" | "transcript";

/** Transcripts longer than this get a search box. */
const SEARCH_FROM_SEGMENTS = 8;

/**
 * Collapsible "Transcript & summary" section of one recording. Everything the
 * backend produced from the audio (summary, key points, action items and the
 * speaker-labelled transcript) lives here; the status badge stays visible when
 * it is collapsed. Backed by `/calls/{id}/recordings/{id}/transcript/`.
 */
export default function RecordingTranscript({ callId, recordingId }: RecordingTranscriptProps) {
  const { transcript, error, requesting, actionError, reload, request } = useRecordingTranscript(callId, recordingId);
  const [open, setOpen] = useState(false);

  const panelId = `transcript-${recordingId}`;

  return (
    <div className="mt-3 border-t border-line pt-3">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls={panelId}
        className="-mx-1 flex w-[calc(100%+0.5rem)] flex-wrap items-center gap-x-3 gap-y-1.5 rounded-md px-1 py-1 text-left transition hover:bg-paper"
      >
        <span className="flex min-w-0 flex-1 items-center gap-2 text-sm font-medium text-fg">
          <Sparkles size={15} className="shrink-0 text-amber-dark" aria-hidden="true" />
          <span className="truncate">Transcript &amp; summary</span>
        </span>
        {transcript && <TranscriptStatusBadge status={transcript.status} />}
        <ChevronDown
          size={16}
          aria-hidden="true"
          className={`shrink-0 text-ink-soft transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      <div id={panelId} hidden={!open} className="pt-3">
        {open && (
          <Body
            transcript={transcript}
            error={error}
            requesting={requesting}
            actionError={actionError}
            onReload={() => void reload()}
            onRequest={(regenerate) => void request(regenerate)}
          />
        )}
      </div>
    </div>
  );
}

interface BodyProps {
  transcript: Transcript | null;
  error: string | null;
  requesting: boolean;
  actionError: string | null;
  onReload: () => void;
  onRequest: (regenerate?: boolean) => void;
}

function Body({ transcript, error, requesting, actionError, onReload, onRequest }: BodyProps) {
  if (error && !transcript) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-surface px-4 py-3">
        <p className="text-sm text-danger">{error}</p>
        <button
          type="button"
          onClick={onReload}
          className="rounded-md border border-line px-3 py-1.5 text-sm text-fg transition hover:bg-paper"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!transcript) {
    return (
      <div className="space-y-2" aria-label="Loading transcript">
        <div className="h-4 w-1/3 animate-shimmer rounded" />
        <div className="h-16 animate-shimmer rounded-lg" />
      </div>
    );
  }

  const actionAlert = actionError && (
    <p className="mt-3 flex items-start gap-1.5 text-xs text-danger" role="alert">
      <AlertCircle size={13} className="mt-0.5 shrink-0" />
      {actionError}
    </p>
  );

  if (transcript.status === "NOT_REQUESTED") {
    return (
      <>
        <div className="rounded-lg border border-dashed border-line px-4 py-6 text-center">
          <Sparkles size={20} className="mx-auto mb-2 text-ink-soft" aria-hidden="true" />
          <p className="text-sm font-medium text-fg">No transcript yet</p>
          <p className="mx-auto mt-1 max-w-sm text-xs text-ink-soft">
            Turn this recording into a speaker-labelled transcript with a short summary, key points and action items.
          </p>
          <button
            type="button"
            onClick={() => onRequest()}
            disabled={requesting}
            className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white transition hover:bg-ink-2 active:scale-[0.98] disabled:opacity-60"
          >
            <Sparkles size={14} />
            {requesting ? "Starting…" : "Generate transcript"}
          </button>
        </div>
        {actionAlert}
      </>
    );
  }

  if (isTranscriptActive(transcript.status)) {
    const stale = isTranscriptStale(transcript);
    return (
      <>
        <div className="rounded-lg border border-line bg-surface p-4" role="status" aria-live="polite">
          <p className="text-sm font-medium text-fg">
            {stale
              ? "This is taking longer than expected"
              : transcript.status === "PENDING"
                ? "Waiting in the queue…"
                : "Listening to the call and writing it down…"}
          </p>
          <p className="mt-0.5 text-xs text-ink-soft">
            {stale
              ? "The server may have restarted while it was working. Start it again."
              : "This usually takes under a minute. You can leave this page; it will be ready when you come back."}
          </p>
          {stale ? (
            <button
              type="button"
              onClick={() => onRequest()}
              disabled={requesting}
              className="mt-3 inline-flex items-center gap-1.5 rounded-md border border-line px-3 py-1.5 text-sm font-medium text-fg transition hover:bg-paper disabled:opacity-60"
            >
              <RefreshCw size={13} />
              Try again
            </button>
          ) : (
            <div className="mt-3 space-y-2" aria-hidden="true">
              <div className="h-3 w-11/12 animate-shimmer rounded" />
              <div className="h-3 w-4/5 animate-shimmer rounded" />
              <div className="h-3 w-2/3 animate-shimmer rounded" />
            </div>
          )}
        </div>
        {actionAlert}
      </>
    );
  }

  if (transcript.status === "FAILED") {
    return (
      <>
        <div className="flex flex-wrap items-start justify-between gap-3 rounded-lg bg-danger-soft px-4 py-3">
          <div className="flex min-w-0 flex-1 items-start gap-2">
            <AlertCircle size={16} className="mt-0.5 shrink-0 text-danger" aria-hidden="true" />
            <div className="min-w-0">
              <p className="text-sm font-medium text-danger">Transcription failed</p>
              <p className="mt-0.5 break-words text-xs text-danger">
                {transcript.error_message ?? "Something went wrong. Try again."}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onRequest()}
            disabled={requesting}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-danger/40 bg-surface px-3 py-1.5 text-sm font-medium text-danger transition hover:bg-danger-soft disabled:opacity-60"
          >
            <RefreshCw size={13} className={requesting ? "animate-spin" : ""} />
            Retry
          </button>
        </div>
        {actionAlert}
      </>
    );
  }

  return <Completed transcript={transcript} requesting={requesting} actionAlert={actionAlert} onRequest={onRequest} />;
}

function Completed({
  transcript,
  requesting,
  actionAlert,
  onRequest,
}: {
  transcript: Transcript;
  requesting: boolean;
  actionAlert: ReactNode;
  onRequest: (regenerate?: boolean) => void;
}) {
  const [view, setView] = useState<View>("summary");
  const [query, setQuery] = useState("");
  const [copied, setCopied] = useState(false);
  const [confirmRegenerate, setConfirmRegenerate] = useState(false);

  const hasSegments = transcript.segments.length > 0;
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return transcript.segments;
    return transcript.segments.filter(
      (segment) => segment.text.toLowerCase().includes(needle) || segment.speaker.toLowerCase().includes(needle),
    );
  }, [transcript.segments, query]);

  async function copy() {
    const text = view === "summary" ? summaryAsText(transcript) : transcript.transcript;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      /* Clipboard blocked (insecure context / permissions): nothing to do. */
    }
  }

  return (
    <div>
      {/* Toolbar: view switch left, actions right; wraps on narrow screens. */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div role="tablist" className="inline-flex rounded-full border border-line bg-surface p-0.5">
          {(["summary", "transcript"] as const).map((value) => {
            const active = view === value;
            return (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setView(value)}
                className={`rounded-full px-4 py-1 text-sm font-medium capitalize transition-colors ${
                  active ? "border border-slate bg-slate-light text-fg" : "border border-transparent text-ink-soft hover:text-fg"
                }`}
              >
                {value}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-1.5">
          {transcript.language && (
            <span className="mr-1 inline-flex items-center gap-1 rounded-full bg-slate-light px-2.5 py-1 text-xs font-medium text-slate">
              <Languages size={12} aria-hidden="true" />
              {transcript.language}
            </span>
          )}
          <button
            type="button"
            onClick={() => void copy()}
            title={view === "summary" ? "Copy summary" : "Copy transcript"}
            aria-label={view === "summary" ? "Copy summary" : "Copy transcript"}
            className="rounded-md p-2 text-ink-soft transition hover:bg-paper hover:text-fg"
          >
            {copied ? <Check size={16} className="text-success" /> : <Copy size={16} />}
          </button>
          <button
            type="button"
            onClick={() => setConfirmRegenerate((value) => !value)}
            disabled={requesting}
            title="Regenerate"
            aria-label="Regenerate transcript and summary"
            className="rounded-md p-2 text-ink-soft transition hover:bg-paper hover:text-fg disabled:opacity-50"
          >
            <RefreshCw size={16} className={requesting ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {confirmRegenerate && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line bg-paper px-3 py-2">
          <p className="text-xs text-ink-soft">Run the transcription again? The current text is replaced.</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setConfirmRegenerate(false)}
              className="rounded-md border border-line px-3 py-1 text-xs font-medium text-fg transition hover:bg-surface"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                setConfirmRegenerate(false);
                onRequest(true);
              }}
              className="rounded-md bg-ink px-3 py-1 text-xs font-semibold text-white transition hover:bg-ink-2"
            >
              Regenerate
            </button>
          </div>
        </div>
      )}

      {actionAlert}

      <div className="mt-3">
        {view === "summary" ? (
          <SummaryView transcript={transcript} />
        ) : !hasSegments ? (
          <p className="rounded-lg border border-dashed border-line px-4 py-6 text-center text-sm text-ink-soft">
            No speech was recognised in this recording.
          </p>
        ) : (
          <div>
            {transcript.segments.length > SEARCH_FROM_SEGMENTS && (
              <div className="relative mb-3">
                <Search
                  size={14}
                  aria-hidden="true"
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft"
                />
                <input
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search the transcript"
                  aria-label="Search the transcript"
                  className="w-full rounded-md border border-line bg-surface py-2 pl-9 pr-3 text-sm text-fg outline-none transition placeholder:text-ink-soft focus:border-slate"
                />
              </div>
            )}

            {filtered.length === 0 ? (
              <p className="py-4 text-center text-sm text-ink-soft">Nothing matches “{query}”.</p>
            ) : (
              <ol className="max-h-80 space-y-3 overflow-y-auto rounded-lg border border-line bg-surface p-3 sm:p-4">
                {filtered.map((segment, index) => {
                  const style = speakerStyle(segment.speaker);
                  return (
                    <li key={`${segment.timestamp ?? "-"}-${index}`} className="grid grid-cols-[2.75rem_1fr] gap-x-3">
                      <span className="pt-0.5 text-xs tabular-nums text-ink-soft">{segment.timestamp ?? ""}</span>
                      <div className="min-w-0">
                        <p className={`flex items-center gap-1.5 text-xs font-semibold ${style.label}`}>
                          <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
                          {segment.speaker}
                        </p>
                        <p className="mt-0.5 whitespace-pre-wrap break-words text-sm leading-relaxed text-fg">
                          {segment.text}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </div>
        )}
      </div>

      <p className="mt-3 text-[11px] text-ink-soft">
        AI-generated{transcript.completed_at ? ` · ${formatDateTime(transcript.completed_at)}` : ""}. It can contain
        mistakes, so check anything important against the recording.
      </p>
    </div>
  );
}

function SummaryView({ transcript }: { transcript: Transcript }) {
  return (
    <div className="space-y-4">
      {transcript.summary && (
        <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-fg">{transcript.summary}</p>
      )}

      {transcript.key_points.length > 0 && (
        <section>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-soft">Key points</h3>
          <ul className="space-y-1.5">
            {transcript.key_points.map((point, index) => (
              <li key={index} className="flex gap-2 text-sm text-fg">
                <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-slate" />
                <span className="min-w-0 break-words">{point}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {transcript.action_items.length > 0 && (
        <section className="rounded-lg border border-line bg-surface p-3 sm:p-4">
          <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-ink-soft">
            <ListChecks size={14} aria-hidden="true" />
            Action items
          </h3>
          <ul className="space-y-2">
            {transcript.action_items.map((item, index) => (
              <li key={index} className="flex gap-2 text-sm text-fg">
                <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-success" aria-hidden="true" />
                <span className="min-w-0 break-words">{item}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {!transcript.summary && transcript.key_points.length === 0 && transcript.action_items.length === 0 && (
        <p className="text-sm text-ink-soft">No summary was produced for this recording.</p>
      )}
    </div>
  );
}
