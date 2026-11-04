import { useEffect, useRef, useState } from "react";
import { LeadImportService } from "@/features/leadImport/services/LeadImportService";
import type { ImportFileRowsResponse } from "@/features/leadImport/types/leadImport.types";
import { getImportError, type ImportErrorInfo } from "@/features/leadImport/utils/importErrors";

interface Params {
  jobId: string;
  page: number;
  pageSize: number;
  q: string;
}

function queryKey({ page, pageSize, q }: Pick<Params, "page" | "pageSize" | "q">): string {
  return JSON.stringify([page, pageSize, q]);
}

/**
 * Loads ONE page of the uploaded file. Only the current page is ever fetched,
 * so a 10,000-row file costs the same as a small one. A request counter and an
 * abort make sure a slow old answer can never replace a newer one.
 */
export function useFileRows({ jobId, page, pageSize, q }: Params) {
  const [loaded, setLoaded] = useState<{ data: ImportFileRowsResponse; key: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ImportErrorInfo | null>(null);
  const [attempt, setAttempt] = useState(0);
  const counter = useRef(0);

  useEffect(() => {
    const request = new AbortController();
    const id = ++counter.current;
    const key = queryKey({ page, pageSize, q });
    setLoading(true);
    setError(null);

    LeadImportService.getFileRows(jobId, { page, page_size: pageSize, q }, request.signal)
      .then((data) => {
        if (id !== counter.current) return;
        setLoaded({ data, key });
        setLoading(false);
      })
      .catch((failure: unknown) => {
        if (id !== counter.current) return;
        const info = getImportError(failure, "We could not load your file.");
        if (info.isCancelled) return;
        setLoading(false);
        setError(info);
      });

    return () => request.abort();
  }, [jobId, page, pageSize, q, attempt]);

  const currentKey = queryKey({ page, pageSize, q });
  return {
    data: loaded?.data ?? null,
    /** True while the visible rows are for another page or search: show skeleton rows. */
    showSkeleton: loading && loaded?.key !== currentKey,
    error,
    reload: () => setAttempt((value) => value + 1),
  };
}
