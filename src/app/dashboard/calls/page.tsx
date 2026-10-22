"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CALLS_ENABLED } from "@/features/calls/config";
import CallList from "@/features/calls/components/CallList";
import CallForm from "@/features/calls/components/CallForm";
import Modal from "@/shared/components/Modal";
import { CallService } from "@/features/calls/services/CallService";
import type { Call, CallRecordRow, CreateCallPayload, UpdateCallPayload } from "@/features/calls/types/call.types";
import type { FilterCondition } from "@/shared/components/FilterBar";
import type { PaginationMeta } from "@/shared/types/pagination";
import type { SortState } from "@/shared/types/sort";

type ModalState = { mode: "create" } | { mode: "edit"; call: Call } | null;

const DEFAULT_PAGE_SIZE = 10;

const EMPTY_PAGINATION: PaginationMeta = {
  page: 1,
  page_size: DEFAULT_PAGE_SIZE,
  total: 0,
  total_pages: 0,
};

export default function CallsPage() {
  const router = useRouter();
  // One row per lead / contact (not one per call).
  const [rows, setRows] = useState<CallRecordRow[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>(EMPTY_PAGINATION);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<FilterCondition[]>([]);
  const [sort, setSort] = useState<SortState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalState, setModalState] = useState<ModalState>(null);
  const [toast, setToast] = useState<string | null>(null);
  // Typing, filtering and sorting can fire requests faster than the server
  // answers; only the newest request may update the table.
  const latestRequest = useRef(0);

  const load = useCallback(
    async (requestedPage = page) => {
      const requestId = ++latestRequest.current;
      setIsLoading(true);
      setError(null);

      try {
        const response = await CallService.getCallRecordsPage(requestedPage, pageSize, sort, filters, search);
        if (requestId !== latestRequest.current) return;

        // A record deleted from the last page (or a narrower search) can leave
        // it empty: move to the last valid page and load that instead.
        if (response.pagination.total_pages > 0 && requestedPage > response.pagination.total_pages) {
          setPage(response.pagination.total_pages);
          return;
        }

        setRows(response.results);
        setPagination(response.pagination);
        setPage(response.pagination.page);
      } catch {
        if (requestId !== latestRequest.current) return;
        setRows([]);
        setError("Couldn't load calls.");
      } finally {
        if (requestId === latestRequest.current) setIsLoading(false);
      }
    },
    [page, pageSize, sort, filters, search],
  );

  // Stable identity: SearchBox debounces on this callback.
  const handleSearchChange = useCallback((next: string) => {
    setSearch(next);
    setPage(1);
  }, []);

  useEffect(() => {
    if (!CALLS_ENABLED) {
      router.replace("/dashboard");
      return;
    }
    void load(page);
  }, [page, load, router]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 3000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  async function handleCreate(payload: CreateCallPayload) {
    await CallService.createCall(payload);
    setToast("Call logged successfully");
    setModalState(null);
    setPage(1);
    await load(1);
  }

  async function handleUpdate(call: Call, payload: UpdateCallPayload) {
    await CallService.updateCall(call.id, payload);
    setToast("Call updated successfully");
    setModalState(null);
    await load(page);
  }

  if (!CALLS_ENABLED) return null;

  return (
    <>
      <CallList
        rows={rows}
        pagination={pagination}
        isLoading={isLoading}
        error={error}
        onCreateClick={() => setModalState({ mode: "create" })}
        onEditClick={(call) => setModalState({ mode: "edit", call })}
        onOpenClick={(call) => router.push(`/dashboard/calls/${call.id}`)}
        onPageChange={(nextPage) => {
          if (nextPage >= 1 && nextPage <= Math.max(1, pagination.total_pages)) setPage(nextPage);
        }}
        onRefresh={() => load(page)}
        search={search}
        onSearchChange={handleSearchChange}
        filters={filters}
        onFiltersChange={(next) => {
          setFilters(next);
          setPage(1);
        }}
        sort={sort}
        onSortChange={(next) => {
          setSort(next);
          setPage(1);
        }}
        pageSize={pageSize}
        onPageSizeChange={(next) => {
          setPageSize(next);
          setPage(1);
        }}
      />

      <Modal isOpen={modalState !== null} onClose={() => setModalState(null)}>
        {modalState?.mode === "create" && (
          <CallForm mode="create" onSubmit={handleCreate} onCancel={() => setModalState(null)} />
        )}
        {modalState?.mode === "edit" && (
          <CallForm
            mode="edit"
            initialCall={modalState.call}
            onSubmit={(payload) => handleUpdate(modalState.call, payload)}
            onCancel={() => setModalState(null)}
          />
        )}
      </Modal>

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-[60] -translate-x-1/2 animate-toast-in rounded-md border border-line bg-surface px-4 py-2.5 text-sm font-medium text-fg shadow-lg">
          {toast}
        </div>
      )}
    </>
  );
}
