/**
 * Single source of truth for the facts the legal pages state.
 *
 * Keep these accurate: Google's OAuth verification reviewers compare the
 * privacy policy against what the app actually requests and stores.
 */
export const LEGAL = {
  appName: "LeadPulse CRM",
  /** Shown as "LeadPulse" in running text. */
  shortName: "LeadPulse",
  /**
   * Public contact address for privacy questions and data requests.
   * Set NEXT_PUBLIC_PRIVACY_EMAIL in the deployment environment to
   * override; the fallback is the address LeadPulse already sends mail from.
   */
  contactEmail: process.env.NEXT_PUBLIC_PRIVACY_EMAIL || "leadpulse123@gmail.com",
  /** Update whenever the policy text changes in a meaningful way. */
  privacyUpdated: "16 November 2026",
  termsUpdated: "16 November 2026",
  privacyPath: "/privacy",
  termsPath: "/terms",
} as const;

/** Scopes requested by the backend (google_integration/application/constants.py). */
export const GOOGLE_SCOPES: ReadonlyArray<{ scope: string; purpose: string }> = [
  {
    scope: "openid",
    purpose: "Identifies which Google account is being linked.",
  },
  {
    scope: "email",
    purpose: "Reads the email address of the Google account you connect, to show it back to you.",
  },
  {
    scope: "https://www.googleapis.com/auth/calendar.events",
    purpose:
      "Creates, updates and cancels the Google Calendar events (and Google Meet links) for meetings you schedule in LeadPulse.",
  },
];
