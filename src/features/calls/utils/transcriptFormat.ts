import { TRANSCRIPT_STALE_MINUTES, type RecordingTranscript } from "@/features/calls/types/callTranscript.types";

/** Polling pace: quick at first, slower for a long run. */
export function transcriptPollDelay(elapsedMs: number): number {
  return elapsedMs < 30_000 ? 3000 : 6000;
}

/** An unfinished run nobody is working on any more (see `TRANSCRIPT_STALE_MINUTES`). */
export function isTranscriptStale(transcript: RecordingTranscript, now = Date.now()): boolean {
  const since = Date.parse(transcript.updated_at ?? transcript.started_at ?? "");
  return Number.isFinite(since) && now - since > TRANSCRIPT_STALE_MINUTES * 60_000;
}

/** Agent / Customer get fixed colours; any other label ("Speaker 1") is neutral. */
export function speakerStyle(speaker: string): { label: string; dot: string } {
  const name = speaker.trim().toLowerCase();
  if (name === "agent") return { label: "text-slate", dot: "bg-slate" };
  if (name === "customer" || name === "client") return { label: "text-amber-dark", dot: "bg-amber" };
  return { label: "text-ink-soft", dot: "bg-ink-soft" };
}

/** Text block for "Copy": summary, key points and action items, or just the transcript. */
export function summaryAsText(transcript: RecordingTranscript): string {
  const parts = [transcript.summary.trim()];
  if (transcript.key_points.length) parts.push(`Key points:\n${transcript.key_points.map((p) => `- ${p}`).join("\n")}`);
  if (transcript.action_items.length) parts.push(`Action items:\n${transcript.action_items.map((p) => `- ${p}`).join("\n")}`);
  return parts.filter(Boolean).join("\n\n");
}
