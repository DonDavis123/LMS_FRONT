/**
 * Rotating principles shown on the sign-in brand panel.
 *
 * These are original statements written for LeadPulse, not quotations from
 * real people, so they are attributed to the product. Do not add a real
 * person's words here unless the wording and source have been verified.
 */
export interface LoginQuote {
  id: string;
  text: string;
  attribution: string;
}

export const LOGIN_QUOTES: readonly LoginQuote[] = [
  {
    id: "follow-up",
    text: "Follow-up is where revenue lives.",
    attribution: "LeadPulse principle",
  },
  {
    id: "focus",
    text: "Focus on the next conversation, not the whole quarter.",
    attribution: "LeadPulse principle",
  },
  {
    id: "relationships",
    text: "Deals are closed by people who stay in touch.",
    attribution: "LeadPulse principle",
  },
  {
    id: "discipline",
    text: "Discipline is a reminder answered on time.",
    attribution: "LeadPulse principle",
  },
];

/** Milliseconds each quote stays on screen before cross-fading. */
export const QUOTE_INTERVAL_MS = 7500;
