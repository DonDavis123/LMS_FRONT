/**
 * `GET` / `POST /leads/<lead_id>/summary/` — a short briefing of a lead's
 * history (see docs/lead-summary-api.md in the backend).
 *
 * The latest summary is stored by the backend: `GET` returns it (or `204`
 * when none was written yet) without calling the model, and every `POST`
 * permanently replaces it with a newly written one.
 */
export interface LeadSummary {
  lead_id: string;
  /** One or two sentences: who the lead is and where it stands. */
  headline: string;
  key_points: string[];
  next_steps: string[];
  /** ISO timestamp of when this summary was written (not when it was loaded). */
  generated_at: string;
  model_name: string | null;
  /** How much history it is based on. */
  timeline_events_used: number;
  calls_used: number;
}
