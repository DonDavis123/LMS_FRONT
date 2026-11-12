"use client";

import { useEffect, useRef, useState } from "react";
import { AlertCircle, Download, Loader2, Mic, Pause, Play, Trash2 } from "lucide-react";
import { CallRecordingService } from "@/features/calls/services/CallRecordingService";
import { useRecordingAudio } from "@/features/calls/hooks/useRecordingAudio";
import type { CallRecording } from "@/features/calls/types/callRecording.types";
import { formatFileSize, formatPlayerTime } from "@/features/calls/utils/recordingFormat";
import { extractApiError } from "@/shared/utils/apiError";
import { saveBlob, unwrapBlobError } from "@/shared/utils/download";
import { formatDateTime } from "@/shared/utils/formatDate";

interface RecordingItemProps {
  recording: CallRecording;
  /** Hides delete (e.g. while another action is running). */
  canDelete?: boolean;
  onDelete: (recording: CallRecording) => void;
  onError: (message: string) => void;
}

const SPEEDS = [1, 1.25, 1.5, 2, 0.75] as const;
/** Starting one player pauses the others. */
const PLAY_EVENT = "crm:call-recording-play";

/**
 * One recording: file details plus an inline player. The audio is only fetched
 * the first time Play is pressed (see `useRecordingAudio`).
 */
export default function RecordingItem({ recording, canDelete = true, onDelete, onError }: RecordingItemProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const { status, url, error, load } = useRecordingAudio(recording.call_id, recording.id);
  const [playing, setPlaying] = useState(false);
  const [wantPlay, setWantPlay] = useState(false);
  const [current, setCurrent] = useState(0);
  const [length, setLength] = useState(recording.duration_seconds ?? 0);
  const [speedIndex, setSpeedIndex] = useState(0);
  const [downloading, setDownloading] = useState(false);

  // Start playing once the audio finished loading after the first click.
  useEffect(() => {
    if (!wantPlay || !url || !audioRef.current) return;
    setWantPlay(false);
    window.dispatchEvent(new CustomEvent(PLAY_EVENT, { detail: recording.id }));
    audioRef.current.play().catch(() => setPlaying(false));
  }, [wantPlay, url, recording.id]);

  // Pause when another recording starts.
  useEffect(() => {
    function onOtherPlay(event: Event) {
      if ((event as CustomEvent<string>).detail !== recording.id) audioRef.current?.pause();
    }
    window.addEventListener(PLAY_EVENT, onOtherPlay);
    return () => window.removeEventListener(PLAY_EVENT, onOtherPlay);
  }, [recording.id]);

  async function togglePlay() {
    const audio = audioRef.current;
    if (!audio) return;
    if (!url) {
      setWantPlay(true);
      await load();
      return;
    }
    if (audio.paused) {
      window.dispatchEvent(new CustomEvent(PLAY_EVENT, { detail: recording.id }));
      await audio.play().catch(() => setPlaying(false));
    } else {
      audio.pause();
    }
  }

  function seek(value: number) {
    if (audioRef.current) audioRef.current.currentTime = value;
    setCurrent(value);
  }

  function cycleSpeed() {
    const next = (speedIndex + 1) % SPEEDS.length;
    setSpeedIndex(next);
    if (audioRef.current) audioRef.current.playbackRate = SPEEDS[next];
  }

  async function handleDownload() {
    setDownloading(true);
    try {
      const blob = await CallRecordingService.getRecordingBlob(recording.call_id, recording.id, true);
      saveBlob(blob, recording.file_name);
    } catch (err) {
      onError(extractApiError(await unwrapBlobError(err), "Couldn't download this recording."));
    } finally {
      setDownloading(false);
    }
  }

  const loading = status === "loading";
  const total = length > 0 ? length : 0;
  const progress = total > 0 ? Math.min(100, (current / total) * 100) : 0;

  return (
    <li className="rounded-lg border border-line bg-paper/40 p-4 transition hover:border-slate/40">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-light text-slate">
          <Mic size={16} />
        </span>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-fg" title={recording.file_name}>
            {recording.file_name}
          </p>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-ink-soft">
            <span>{formatFileSize(recording.size_bytes)}</span>
            <span aria-hidden="true">·</span>
            <span>{formatDateTime(recording.created_at)}</span>
            {recording.uploaded_by_name && (
              <>
                <span aria-hidden="true">·</span>
                <span>by {recording.uploaded_by_name}</span>
              </>
            )}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => void handleDownload()}
            disabled={downloading}
            aria-label={`Download ${recording.file_name}`}
            title="Download"
            className="rounded-md p-2 text-ink-soft transition hover:bg-paper hover:text-fg disabled:opacity-50"
          >
            {downloading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
          </button>
          {canDelete && (
            <button
              type="button"
              onClick={() => onDelete(recording)}
              aria-label={`Delete ${recording.file_name}`}
              title="Delete"
              className="rounded-md p-2 text-ink-soft transition hover:bg-danger-soft hover:text-danger"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Player */}
      <div className="mt-3 flex items-center gap-3">
        <button
          type="button"
          onClick={() => void togglePlay()}
          disabled={loading}
          aria-label={playing ? "Pause recording" : "Play recording"}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink text-white transition hover:bg-ink-2 active:scale-95 disabled:opacity-60"
        >
          {loading ? (
            <Loader2 size={16} className="animate-spin" />
          ) : playing ? (
            <Pause size={16} />
          ) : (
            <Play size={16} className="translate-x-px" />
          )}
        </button>

        <span className="w-10 shrink-0 text-right text-xs tabular-nums text-ink-soft">{formatPlayerTime(current)}</span>

        <input
          type="range"
          min={0}
          max={total || 1}
          step={0.1}
          value={Math.min(current, total || 1)}
          disabled={!url || total === 0}
          onChange={(event) => seek(Number(event.target.value))}
          aria-label="Seek"
          className="h-1.5 min-w-0 flex-1 cursor-pointer appearance-none rounded-full accent-slate disabled:cursor-default"
          style={{
            background: `linear-gradient(to right, var(--color-slate) ${progress}%, var(--color-line) ${progress}%)`,
          }}
        />

        <span className="w-10 shrink-0 text-xs tabular-nums text-ink-soft">{total > 0 ? formatPlayerTime(total) : "--:--"}</span>

        <button
          type="button"
          onClick={cycleSpeed}
          disabled={!url}
          aria-label="Playback speed"
          title="Playback speed"
          className="w-11 shrink-0 rounded-md border border-line py-1 text-xs font-medium tabular-nums text-ink-soft transition hover:bg-paper hover:text-fg disabled:opacity-50 disabled:hover:bg-transparent"
        >
          {SPEEDS[speedIndex]}x
        </button>
      </div>

      {status === "error" && error && (
        <p className="mt-2 flex items-center gap-1.5 text-xs text-danger" role="alert">
          <AlertCircle size={13} className="shrink-0" />
          {error}
        </p>
      )}

      <audio
        ref={audioRef}
        src={url ?? undefined}
        preload="metadata"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => {
          setPlaying(false);
          setCurrent(0);
        }}
        onTimeUpdate={(event) => setCurrent(event.currentTarget.currentTime)}
        onLoadedMetadata={(event) => {
          const duration = event.currentTarget.duration;
          if (Number.isFinite(duration) && duration > 0) setLength(duration);
          event.currentTarget.playbackRate = SPEEDS[speedIndex];
        }}
        className="hidden"
      />
    </li>
  );
}
