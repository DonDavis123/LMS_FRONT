"use client";

import { useEffect, useRef, useState } from "react";

export const NO_CHANGES_MESSAGE = "No changes to update. Edit at least one field before saving.";

/**
 * Blocks a pointless "update" request when an edit form is submitted without
 * any change. The form's first-render value is the baseline; `isUnchanged()`
 * compares the current value against it and, if equal, raises a warning
 * (instead of calling the API).
 *
 * The warning clears itself when the form changes or after a few seconds.
 *
 * Usage:
 *   const { warning, isUnchanged } = useNoChangeGuard(form, mode === "edit");
 *   ...
 *   if (isUnchanged()) return;   // at the top of the submit handler
 *   {warning && <FormWarning message={warning} />}
 */
export function useNoChangeGuard<T>(form: T, enabled: boolean) {
  const [warning, setWarning] = useState<string | null>(null);
  const baseline = useRef<string>(JSON.stringify(form));

  useEffect(() => {
    setWarning(null);
  }, [form]);

  useEffect(() => {
    if (!warning) return;
    const timer = window.setTimeout(() => setWarning(null), 4000);
    return () => window.clearTimeout(timer);
  }, [warning]);

  function isUnchanged(): boolean {
    if (!enabled) return false;
    if (JSON.stringify(form) !== baseline.current) return false;
    setWarning(NO_CHANGES_MESSAGE);
    return true;
  }

  return { warning, isUnchanged };
}
