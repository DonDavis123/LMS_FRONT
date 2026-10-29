import { useCallback, useEffect, useState } from "react";
import { loadPicklists, type LeadPicklists } from "@/features/picklists/hooks/useLeadPicklists";

export type PicklistsLoad = "loading" | "ready" | "error";

/** The company's active Lead Source / Status / Industry / Rating options, loaded once when `enabled`. */
export function useImportPicklists(enabled: boolean) {
  const [lists, setLists] = useState<LeadPicklists | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    let active = true;
    loadPicklists("leads", attempt > 0)
      .then((data) => {
        if (!active) return;
        setLists(data);
        setFailed(false);
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
    };
  }, [enabled, attempt]);

  const retry = useCallback(() => {
    setFailed(false);
    setAttempt((value) => value + 1);
  }, []);

  const status: PicklistsLoad = lists ? "ready" : failed ? "error" : "loading";
  return { lists, status, retry };
}
