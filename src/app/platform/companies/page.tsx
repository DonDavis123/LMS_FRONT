"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import CompanyCreateDialog from "@/features/platform/components/CompanyCreateDialog";
import CompanyList from "@/features/platform/components/CompanyList";
import { platformService } from "@/features/platform/services/platformService";
import type {
  CompanyStatus,
  CompanySummary,
  CreateCompanyResult,
} from "@/features/platform/types/platform.types";
import type { PaginationMeta } from "@/shared/types/pagination";
import type { SortState } from "@/shared/types/sort";
import { extractApiError } from "@/shared/utils/apiError";

const DEFAULT_PAGE_SIZE = 10;
const EMPTY_PAGINATION: PaginationMeta = {
  page: 1,
  page_size: DEFAULT_PAGE_SIZE,
  total: 0,
  total_pages: 0,
};

export default function PlatformCompaniesPage() {
  const [companies, setCompanies] = useState<CompanySummary[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<CompanyStatus | "">("");
  const [sort, setSort] = useState<SortState | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [pagination, setPagination] = useState<PaginationMeta>(EMPTY_PAGINATION);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const toastTimer = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    platformService
      .getCompaniesPage({ page, page_size: pageSize, search, status, sort })
      .then((data) => {
        if (cancelled) return;
        setCompanies(data.results);
        setPagination(data.pagination);
        if (data.pagination.total_pages > 0 && page > data.pagination.total_pages) {
          setPage(data.pagination.total_pages);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(extractApiError(err, "Couldn't load companies from the server."));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [page, pageSize, search, status, sort, refreshKey]);

  function showToast(message: string) {
    if (toastTimer.current !== null) window.clearTimeout(toastTimer.current);
    setToast(message);
    toastTimer.current = window.setTimeout(() => setToast(null), 3000);
  }

  useEffect(() => {
    return () => {
      if (toastTimer.current !== null) window.clearTimeout(toastTimer.current);
    };
  }, []);

  const handleSearchChange = useCallback((next: string) => {
    setSearch(next);
    setPage(1);
  }, []);

  function handleCreated(result: CreateCompanyResult) {
    setIsCreateOpen(false);
    showToast(`${result.company.name} was created`);
    // The default order is newest first, so page 1 shows the new company.
    setPage(1);
    setRefreshKey((value) => value + 1);
  }

  return (
    <>
      <CompanyList
        companies={companies}
        isLoading={isLoading}
        error={error}
        search={search}
        onSearchChange={handleSearchChange}
        status={status}
        onStatusChange={(next) => {
          setStatus(next);
          setPage(1);
        }}
        sort={sort}
        onSortChange={(next) => {
          setSort(next);
          setPage(1);
        }}
        pageSize={pageSize}
        pagination={pagination}
        onPageChange={setPage}
        onPageSizeChange={(next) => {
          setPageSize(next);
          setPage(1);
        }}
        onRetry={() => setRefreshKey((value) => value + 1)}
        onCreateClick={() => setIsCreateOpen(true)}
      />

      <CompanyCreateDialog
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreated={handleCreated}
      />

      {toast && (
        <div className="fixed bottom-6 right-6 z-[60] flex items-center gap-2 rounded-md border border-success/30 bg-success-soft px-4 py-3 text-sm font-medium text-success shadow-lg animate-toast-in">
          <CheckCircle2 size={16} className="shrink-0 animate-pop-in" />
          {toast}
        </div>
      )}
    </>
  );
}
