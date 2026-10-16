"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import PlatformAuditLogList from "@/features/platform/components/PlatformAuditLogList";
import { platformService } from "@/features/platform/services/platformService";
import type { PlatformAuditAction, PlatformAuditLogEntry } from "@/features/platform/types/platform.types";
import type { PaginationMeta } from "@/shared/types/pagination";
import { extractApiError } from "@/shared/utils/apiError";

const DEFAULT_PAGE_SIZE = 20;
const EMPTY_PAGINATION: PaginationMeta = {
  page: 1,
  page_size: DEFAULT_PAGE_SIZE,
  total: 0,
  total_pages: 0,
};
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function PlatformAuditLogsPageInner() {
  const searchParams = useSearchParams();
  // `?company_id=` comes from the company page's "View history" link; an
  // invalid value is ignored instead of sending a request the API rejects.
  const initialCompanyId = searchParams.get("company_id") ?? "";

  const [entries, setEntries] = useState<PlatformAuditLogEntry[]>([]);
  const [action, setAction] = useState<PlatformAuditAction | "">("");
  const [companyId, setCompanyId] = useState(UUID_PATTERN.test(initialCompanyId) ? initialCompanyId : "");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [pagination, setPagination] = useState<PaginationMeta>(EMPTY_PAGINATION);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [companyNames, setCompanyNames] = useState<Record<string, string>>({});
  const requestedNames = useRef<Set<string>>(new Set());

  // Company names for the filter and the "Company" column. The first 50
  // (alphabetical) cover the dropdown; any other id seen in the log or the
  // URL is resolved on demand below.
  useEffect(() => {
    let cancelled = false;
    platformService
      .getCompaniesPage({ page: 1, page_size: 50, sort: { field: "name", direction: "asc" } })
      .then((data) => {
        if (cancelled) return;
        const names: Record<string, string> = {};
        for (const company of data.results) {
          names[company.id] = company.name;
          requestedNames.current.add(company.id);
        }
        setCompanyNames((current) => ({ ...names, ...current }));
      })
      .catch(() => {
        /* names fall back to a short id; the log itself still works */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    platformService
      .getAuditLogs({ company_id: companyId || undefined, action, page, page_size: pageSize })
      .then((data) => {
        if (cancelled) return;
        setEntries(data.results);
        setPagination(data.pagination);
        if (data.pagination.total_pages > 0 && page > data.pagination.total_pages) {
          setPage(data.pagination.total_pages);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(extractApiError(err, "Couldn't load the audit log."));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [companyId, action, page, pageSize, refreshKey]);

  // Resolve names for company ids the first request did not cover.
  useEffect(() => {
    const ids = new Set<string>();
    for (const entry of entries) if (entry.company_id) ids.add(entry.company_id);
    if (companyId) ids.add(companyId);

    const missing = [...ids].filter((id) => !requestedNames.current.has(id));
    if (missing.length === 0) return;
    missing.forEach((id) => requestedNames.current.add(id));

    let cancelled = false;
    Promise.allSettled(missing.map((id) => platformService.getCompany(id))).then((results) => {
      if (cancelled) return;
      const names: Record<string, string> = {};
      results.forEach((result, index) => {
        if (result.status === "fulfilled") names[missing[index]] = result.value.name;
      });
      if (Object.keys(names).length > 0) setCompanyNames((current) => ({ ...current, ...names }));
    });
    return () => {
      cancelled = true;
    };
  }, [entries, companyId]);

  const companyOptions = useMemo(
    () =>
      Object.entries(companyNames)
        .map(([value, label]) => ({ value, label }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [companyNames],
  );

  return (
    <PlatformAuditLogList
      entries={entries}
      isLoading={isLoading}
      error={error}
      action={action}
      onActionChange={(next) => {
        setAction(next);
        setPage(1);
      }}
      companyId={companyId}
      companyOptions={companyOptions}
      onCompanyChange={(next) => {
        setCompanyId(next);
        setPage(1);
      }}
      companyNames={companyNames}
      pageSize={pageSize}
      pagination={pagination}
      onPageChange={setPage}
      onPageSizeChange={(next) => {
        setPageSize(next);
        setPage(1);
      }}
      onRetry={() => setRefreshKey((value) => value + 1)}
    />
  );
}

export default function PlatformAuditLogsPage() {
  return (
    <Suspense fallback={null}>
      <PlatformAuditLogsPageInner />
    </Suspense>
  );
}
