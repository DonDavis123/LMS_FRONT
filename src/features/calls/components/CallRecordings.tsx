"use client";

import { useCallback, useEffect, useState } from "react";
import { AudioLines, Plus } from "lucide-react";
import RecordingItem from "@/features/calls/components/RecordingItem";
import RecordingUploadDialog from "@/features/calls/components/RecordingUploadDialog";
import { CallRecordingService } from "@/features/calls/services/CallRecordingService";
import { MAX_RECORDINGS_PER_CALL, type CallRecording } from "@/features/calls/types/callRecording.types";
import { extractApiError } from "@/shared/utils/apiError";
import { confirmDelete } from "@/shared/utils/confirmDelete";

interface CallRecordingsProps {
  callId: string;
  /** Recordings can only be attached to a completed call. */
  completed: boolean;
  /** Called after a recording was added or deleted, with a message for the toast. */
  onChanged?: (message: string) => void;
}

/**
 * "Call Recordings" card of the call detail page: list with inline players,
 * add (upload or record in the browser), download and delete.
 * Backed by `/calls/{id}/recordings/`.
 */
export default function CallRecordings({ callId, completed, onChanged }: CallRecordingsProps) {
  const [recordings, setRecordings] = useState<CallRecording[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      setRecordings(await CallRecordingService.getRecordings(callId));
    } catch (err) {
      setRecordings(null);
      setError(extractApiError(err, "Couldn't load the recordings."));
    }
  }, [callId]);

  useEffect(() => {
    setRecordings(null);
    void load();
  }, [load]);

  const count = recordings?.length ?? 0;
  const slotsLeft = MAX_RECORDINGS_PER_CALL - count;

  function handleUploaded(recording: CallRecording) {
    setRecordings((list) => [recording, ...(list ?? [])]);
    setAdding(false);
    setActionError(null);
    onChanged?.("Recording uploaded successfully");
  }

  async function handleDelete(recording: CallRecording) {
    if (!(await confirmDelete(`Delete "${recording.file_name}"? The audio will be removed permanently.`))) return;
    setActionError(null);
    try {
      const message = await CallRecordingService.deleteRecording(callId, recording.id);
      setRecordings((list) => (list ?? []).filter((item) => item.id !== recording.id));
      onChanged?.(message);
    } catch (err) {
      setActionError(extractApiError(err, "Couldn't delete this recording. Try again."));
    }
  }

  return (
    <div className="mt-4 rounded-lg border border-line bg-surface p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-ink-soft">
          Call Recordings
          {recordings && recordings.length > 0 && (
            <span className="rounded-full bg-slate-light px-2 py-0.5 text-[10px] font-semibold text-slate">{recordings.length}</span>
          )}
        </h2>
        {completed && recordings && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            disabled={slotsLeft <= 0}
            title={slotsLeft <= 0 ? `A call can hold up to ${MAX_RECORDINGS_PER_CALL} recordings` : undefined}
            className="flex items-center gap-1.5 rounded-md border border-line px-3 py-1.5 text-sm font-medium text-fg transition hover:bg-paper disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent"
          >
            <Plus size={14} />
            Add recording
          </button>
        )}
      </div>

      {error ? (
        <div className="flex items-center justify-between gap-3 py-2">
          <p className="text-sm text-danger">{error}</p>
          <button
            type="button"
            onClick={() => void load()}
            className="rounded-md border border-line px-3 py-1.5 text-sm text-fg hover:bg-paper"
          >
            Retry
          </button>
        </div>
      ) : !recordings ? (
        <div className="space-y-3" aria-label="Loading recordings">
          {[0, 1].map((i) => (
            <div key={i} className="h-24 animate-shimmer rounded-lg" />
          ))}
        </div>
      ) : recordings.length === 0 ? (
        <div className="rounded-lg border border-dashed border-line px-4 py-8 text-center">
          <AudioLines size={22} className="mx-auto mb-2 text-ink-soft" />
          <p className="text-sm font-medium text-fg">No recordings yet</p>
          <p className="mx-auto mt-1 max-w-sm text-xs text-ink-soft">
            {completed
              ? "Upload the voice recording of this call, or record it here, to play it back later."
              : "Recordings can be added once the call is completed."}
          </p>
          {completed && (
            <button
              type="button"
              onClick={() => setAdding(true)}
              className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white transition hover:bg-ink-2 active:scale-[0.98]"
            >
              <Plus size={14} />
              Add recording
            </button>
          )}
        </div>
      ) : (
        <ul className="space-y-3">
          {recordings.map((recording) => (
            <RecordingItem key={recording.id} recording={recording} onDelete={handleDelete} onError={setActionError} />
          ))}
        </ul>
      )}

      {actionError && (
        <p className="mt-3 text-sm text-danger" role="alert">
          {actionError}
        </p>
      )}

      <RecordingUploadDialog
        isOpen={adding}
        callId={callId}
        slotsLeft={slotsLeft}
        onClose={() => setAdding(false)}
        onUploaded={handleUploaded}
      />
    </div>
  );
}
