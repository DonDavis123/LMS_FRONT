/**
 * Feature switch for the Calls activity.
 *
 * While `false`, Calls is hidden from the UI: no sidebar link, no calls in the
 * dashboard "Upcoming" widget, and /dashboard/calls redirects to /dashboard.
 * The calls module itself (components, service, types, pages) is left intact —
 * set this to `true` to bring the feature back exactly as it was.
 */
export const CALLS_ENABLED: boolean = false;
