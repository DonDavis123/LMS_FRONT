import { useCallback, useEffect, useRef, useState } from "react";
import { LeadImportService } from "@/features/leadImport/services/LeadImportService";
import type { HistoryItem } from "@/features/leadImport/types/leadImport.types";
import { isRunningItem } from "@/features/leadImport/utils/historyView";
import { getImportError, type ImportErrorInfo } from "@/features/leadImport/utils/importErrors";
import type { PaginationMeta } from "@/shared/types/pagination";

/** While an import is running the list refreshes this often (only while the tab is visible). */
export const HISTORY_POLL_MS = 8000;

/**
 * The pages of the import history.
 * - `refresh()` loads again without a skeleton (rows stay on screen).
 * - `retry()` loads again with the skeleton (used by the error card).
 * - A request counter drops answers that arrive after a newer request started.
 * - Polling runs only while some row is running and the tab is visible.
 */
export function useImportHistory(initialPageSize = 10) {
  const [page, setPageState] = useState(1);
  const [pageSize, setPageSizeState] = useState(initialPageSize);
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ImportErrorInfo | null>(null);
  const counter = useRef(0);

  const fetchPage = useCallback(
    async (silent: boolean) => {
      const id = ++counter.current;
      try {
        const data = await LeadImportService.getHistory(page, pageSize);
        if (id !== counter.current) return;
        const lastPage = Math.max(1, data.pagination.total_pages);
        if (page > lastPage) {
          // The list got shorter (or the page number was too high): go to the last page.
          setPageState(lastPage);
          return;
        }
        setItems(data.results);
        setPagination(data.pagination);
        setError(null);
        setLoading(false);
      } catch (caught) {
        if (id !== counter.current) return;
        // A failed background refresh keeps the rows that are already on screen.
        if (!silent) {
          setError(getImportError(caught, "We could not load the import history."));
          setLoading(false);
        }
      }
    },
    [page, pageSize],
  );

  useEffect(() => {
    void fetchPage(false);
  }, [fetchPage]);

  const hasRunning = items.some(isRunningItem);
  useEffect(() => {
    if (!hasRunning) return;
    const tick = () => {
      if (document.visibilityState === "visible") void fetchPage(true);
    };
    const timer = window.setInterval(tick, HISTORY_POLL_MS);
    document.addEventListener("visibilitychange", tick);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [hasRunning, fetchPage]);

  const setPage = useCallback(
    (next: number) => {
      const target = Math.max(1, next);
      if (target === page) return;
      setLoading(true);
      setPageState(target);
    },
    [page],
  );

  const setPageSize = useCallback(
    (next: number) => {
      if (next === pageSize) return;
      setLoading(true);
      setPageState(1);
      setPageSizeState(next);
    },
    [pageSize],
  );

  const refresh = useCallback(() => fetchPage(true), [fetchPage]);
  const retry = useCallback(() => {
    setLoading(true);
    setError(null);
    return fetchPage(false);
  }, [fetchPage]);

  return { page, pageSize, items, pagination, loading, error, hasRunning, setPage, setPageSize, refresh, retry };
}
