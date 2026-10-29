import { useCallback, useEffect, useState } from "react";
import type { LeadOwnerOption } from "@/features/auth/types/auth.types";
import { userService } from "@/features/users/services/userService";
import { getImportError, type ImportErrorInfo } from "@/features/leadImport/utils/importErrors";
import type { OwnersLoad } from "@/features/leadImport/utils/optionRules";

/**
 * Loads the eligible lead owners once. The list is kept in the wizard state
 * (`cached`), so going Back and forward does not ask again.
 */
export function useLeadOwners(cached: LeadOwnerOption[] | null, store: (owners: LeadOwnerOption[]) => void) {
  const [error, setError] = useState<ImportErrorInfo | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (cached) return;
    let active = true;
    userService
      .getLeadOwners()
      .then((owners) => {
        if (!active) return;
        setError(null);
        store(Array.isArray(owners) ? owners : []);
      })
      .catch((failure: unknown) => {
        if (active) setError(getImportError(failure, "We could not load your team members."));
      });
    return () => {
      active = false;
    };
  }, [cached, store, attempt]);

  const retry = useCallback(() => {
    setError(null);
    setAttempt((value) => value + 1);
  }, []);

  const status: OwnersLoad = cached ? "ready" : error ? "error" : "loading";
  return { owners: cached, status, error, retry };
}
