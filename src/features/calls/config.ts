/**
 * Feature switch for the Calls activity.
 *
 * While `false`, Calls is hidden from the UI: no sidebar link and
 * /dashboard/calls redirects to /dashboard. Calls now run on the real
 * `/calls/` backend API, so the switch is on.
 */
export const CALLS_ENABLED: boolean = true;
