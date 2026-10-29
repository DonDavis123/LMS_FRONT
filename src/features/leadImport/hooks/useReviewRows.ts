import { useEffect, useRef, useState } from "react";
import { LeadImportService } from "@/features/leadImport/services/LeadImportService";
import type { ImportRowsResponse, RowsStatusFilter } from "@/features/leadImport/types/leadImport.types";
import { getImportError, type ImportErrorInfo } from "@/features/leadImport/utils/importErrors";

export interface RowsQueryState {
  status: RowsStatusFilter;
  page: number;
  pageSize: number;
  q: string;
}

interface Params extends RowsQueryState {
  jobId: string;
  /** False while the check is out of date or running: the server would refuse, and the numbers would be old. */
  enabled: boolean;
  /** Changes whenever a new check finishes, so the page is read again. */
  refreshKey: string | null;
  /** The server said the check is missing or out of date. */
  onCheckOutdated: () => void;
}

/** After this many "outdated" answers in a row the screen stops asking and shows an error. */
const MAX_OUTDATED_IN_A_ROW = 3;

function queryKey({ status, page, pageSize, q }: RowsQueryState): string {
  return JSON.stringify([status, page, pageSize, q]);
}

/**
 * Loads ONE page of rows. Only the current page is ever fetched, so 10,000
 * rows cost the same as 10. A request counter and an abort make sure a slow
 * old answer can never replace a newer one.
 */
export function useReviewRows({ jobId, status, page, pageSize, q, enabled, refreshKey, onCheckOutdated }: Params) {
  const [loaded, setLoaded] = useState<{ data: ImportRowsResponse; key: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ImportErrorInfo | null>(null);
  const [attempt, setAttempt] = useState(0);

  const counter = useRef(0);
  const outdatedInARow = useRef(0);
  const onOutdatedRef = useRef(onCheckOutdated);
  useEffect(() => {
    onOutdatedRef.current = onCheckOutdated;
  });

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    const request = new AbortController();
    const id = ++counter.current;
    const key = queryKey({ status, page, pageSize, q });
    setLoading(true);
    setError(null);

    LeadImportService.getRows(jobId, { status, page, page_size: pageSize, q }, request.signal)
      .then((data) => {
        if (id !== counter.current) return;
        outdatedInARow.current = 0;
        setLoaded({ data, key });
        setLoading(false);
      })
      .catch((failure: unknown) => {
        if (id !== counter.current) return;
        const info = getImportError(failure, "We could not load your rows.");
        if (info.isCancelled) return;
        setLoading(false);
        if (info.code === "check_outdated" || info.code === "check_required") {
          outdatedInARow.current += 1;
          if (outdatedInARow.current <= MAX_OUTDATED_IN_A_ROW) {
            onOutdatedRef.current();
            return;
          }
        }
        setError(info);
      });

    return () => request.abort();
  }, [enabled, jobId, status, page, pageSize, q, refreshKey, attempt]);

  const currentKey = queryKey({ status, page, pageSize, q });
  return {
    data: loaded?.data ?? null,
    /** True while the visible rows are for another page, filter or search: show skeleton rows. */
    showSkeleton: loading && loaded?.key !== currentKey,
    /** True while the same page is being read again after a new check. */
    refreshing: loading && loaded?.key === currentKey,
    error,
    reload: () => {
      outdatedInARow.current = 0;
      setAttempt((value) => value + 1);
    },
  };
}
