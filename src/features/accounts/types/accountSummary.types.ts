/**
 * `GET` / `POST /accounts/<account_id>/summary/` — a short briefing of an account's
 * history (see docs/account-summary-api.md in the backend).
 *
 * The latest summary is stored by the backend: `GET` returns it (or `204`
 * when none was written yet) without calling the model, and every `POST`
 * permanently replaces it with a newly written one.
 */
export interface AccountSummary {
  account_id: string;
  /** One or two sentences: who the account is and where it stands. */
  headline: string;
  key_points: string[];
  next_steps: string[];
  /** ISO timestamp of when this summary was written (not when it was loaded). */
  generated_at: string;
  model_name: string | null;
  /** How much history it is based on. */
  timeline_events_used: number;
  calls_used: number;
  /** How many of the account's contacts were read. */
  contacts_used: number;
}
