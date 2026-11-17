/**
 * `POST /leads/<lead_id>/summary/` — a short briefing of a lead's history,
 * written on demand by the backend (see docs/lead-summary-api.md there).
 * Nothing is stored, so there is no GET.
 */
export interface LeadSummary {
  lead_id: string;
  /** One or two sentences: who the lead is and where it stands. */
  headline: string;
  key_points: string[];
  next_steps: string[];
  /** ISO timestamp of the request that produced this summary. */
  generated_at: string;
  model_name: string | null;
  /** How much history it is based on. */
  timeline_events_used: number;
  calls_used: number;
}
