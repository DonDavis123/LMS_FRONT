"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LayoutGrid, List } from "lucide-react";
import Modal from "@/shared/components/Modal";
import type { FilterCondition } from "@/shared/components/FilterBar";
import type { PaginationMeta } from "@/shared/types/pagination";
import type { SortState } from "@/shared/types/sort";
import { extractApiError } from "@/shared/utils/apiError";
import { userService } from "@/features/users/services/userService";
import type { LeadOwnerOption } from "@/features/auth/types/auth.types";
import { DealService } from "@/features/deals/services/DealService";
import type { BoardParams, CreateDealPayload, Deal, DealStage, Forecast } from "@/features/deals/types/deal.types";
import DealBoard, { type ToastTone } from "@/features/deals/components/DealBoard";
import DealBoardFilters, {
  DEFAULT_BOARD_FILTERS,
  hasActiveBoardFilters,
  type BoardFilterState,
} from "@/features/deals/components/DealBoardFilters";
import DealForecastCards from "@/features/deals/components/DealForecastCards";
import DealForm, { DEAL_FORM_TITLE_ID } from "@/features/deals/components/DealForm";
import DealList from "@/features/deals/components/DealList";

type DealsView = "board" | "list";
type ModalState = { mode: "create" | "edit"; deal?: Deal } | null;

const DEFAULT_PAGE_SIZE = 10;
const EMPTY_PAGINATION: PaginationMeta = {
  page: 1,
  page_size: DEFAULT_PAGE_SIZE,
  total: 0,
  total_pages: 0,
};

const VIEW_OPTIONS: { value: DealsView; label: string; icon: typeof List }[] = [
  { value: "board", label: "Board", icon: LayoutGrid },
  { value: "list", label: "List", icon: List },
];

function browserTimeZone(): string | undefined {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || undefined;
  } catch {
    return undefined;
  }
}

function DealsPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const view: DealsView = searchParams.get("view") === "list" ? "list" : "board";

  const [owners, setOwners] = useState<LeadOwnerOption[]>([]);
  const [modalState, setModalState] = useState<ModalState>(null);
  const [toast, setToast] = useState<{ message: string; tone: ToastTone } | null>(null);
  // Bumped after any create / edit / delete so the visible view reloads.
  const [refreshKey, setRefreshKey] = useState(0);

  // Board filters
  const [boardFilters, setBoardFilters] = useState<BoardFilterState>(DEFAULT_BOARD_FILTERS);

  // List state (same shape as the tasks page)
  const [deals, setDeals] = useState<Deal[]>([]);
  const [filters, setFilters] = useState<FilterCondition[]>([]);
  const [sort, setSort] = useState<SortState | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [pagination, setPagination] = useState<PaginationMeta>(EMPTY_PAGINATION);
  const [isListLoading, setIsListLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  // Forecast cards
  const [forecast, setForecast] = useState<Forecast | null>(null);
  const [isForecastLoading, setIsForecastLoading] = useState(true);
  const [forecastError, setForecastError] = useState<string | null>(null);
  const [forecastKey, setForecastKey] = useState(0);

  const showToast = useCallback((message: string, tone: ToastTone = "success") => {
    setToast({ message, tone });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), toast.tone === "error" ? 5000 : 3000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    userService.getLeadOwners().then(setOwners).catch(() => setOwners([]));
  }, []);

  const setView = useCallback(
    (next: DealsView) => {
      router.replace(`/dashboard/deals?view=${next}`, { scroll: false });
    },
    [router],
  );

  const boardParams = useMemo<BoardParams>(
    () => ({
      owner_id: boardFilters.owner || undefined,
      search: boardFilters.search || undefined,
      expected_close_from: boardFilters.closeFrom || undefined,
      expected_close_to: boardFilters.closeTo || undefined,
      closed_within_days: boardFilters.closedWindow === "all" ? undefined : Number(boardFilters.closedWindow),
    }),
    [boardFilters],
  );

  // The forecast follows the board's owner filter, and is unfiltered in list view.
  const forecastOwner = view === "board" ? boardFilters.owner : "";

  useEffect(() => {
    let cancelled = false;
    setIsForecastLoading(true);
    DealService.getForecast({ owner_id: forecastOwner || undefined, tz: browserTimeZone() })
      .then((data) => {
        if (cancelled) return;
        setForecast(data);
        setForecastError(null);
      })
      .catch((err) => {
        if (!cancelled) setForecastError(extractApiError(err, "Couldn't load the forecast."));
      })
      .finally(() => {
        if (!cancelled) setIsForecastLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [forecastOwner, forecastKey, refreshKey]);

  useEffect(() => {
    if (view !== "list") return;
    let cancelled = false;
    setIsListLoading(true);
    setListError(null);

    DealService.getDealsPage({ page, page_size: pageSize, filters, sort })
      .then((data) => {
        if (cancelled) return;
        setDeals(data.results);
        setPagination(data.pagination);
        if (data.pagination.total_pages > 0 && page > data.pagination.total_pages) {
          setPage(data.pagination.total_pages);
        }
      })
      .catch((err) => {
        if (!cancelled) setListError(extractApiError(err, "Couldn't load deals."));
      })
      .finally(() => {
        if (!cancelled) setIsListLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [view, page, pageSize, filters, sort, refreshKey]);

  async function handleSubmit(payload: CreateDealPayload) {
    if (modalState?.mode === "edit" && modalState.deal) {
      await DealService.updateDeal(modalState.deal.id, payload);
      showToast("Deal updated successfully");
    } else {
      await DealService.createDeal(payload);
      showToast("Deal created successfully");
    }
    setRefreshKey((value) => value + 1);
    setModalState(null);
  }

  function handleDealDeleted(_id: string, message: string) {
    setRefreshKey((value) => value + 1);
    showToast(message);
  }

  function showStageInList(stage: DealStage) {
    setFilters([{ field: "stage", operator: "equals", value: stage }]);
    setPage(1);
    setView("list");
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-serif text-2xl leading-tight text-fg">Deals</h1>
          <p className="text-xs text-ink-soft">Track your pipeline from first quote to close.</p>
        </div>
        <div className="flex items-center gap-2">
          <div role="group" aria-label="Deals view" className="inline-flex rounded-full border border-line bg-surface p-0.5">
            {VIEW_OPTIONS.map(({ value, label, icon: Icon }) => {
              const active = view === value;
              return (
                <button
                  key={value}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setView(value)}
                  className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                    active ? "border-slate bg-slate-light text-fg" : "border-transparent text-ink-soft hover:text-fg"
                  }`}
                >
                  <Icon size={14} aria-hidden="true" />
                  {label}
                </button>
              );
            })}
          </div>
          <button
            type="button"
            onClick={() => setModalState({ mode: "create" })}
            className="whitespace-nowrap rounded-md bg-amber px-3 py-1.5 text-sm font-semibold text-fg transition hover:bg-amber-dark active:scale-[0.98]"
          >
            + New Deal
          </button>
        </div>
      </div>

      <DealForecastCards
        forecast={forecast}
        isLoading={isForecastLoading}
        error={forecastError}
        onRetry={() => setForecastKey((value) => value + 1)}
      />

      {view === "board" ? (
        <>
          <DealBoardFilters value={boardFilters} owners={owners} onChange={setBoardFilters} />
          <DealBoard
            params={boardParams}
            refreshKey={refreshKey}
            hasActiveFilters={hasActiveBoardFilters(boardFilters)}
            onMoved={() => setForecastKey((value) => value + 1)}
            onToast={showToast}
            onCreateClick={() => setModalState({ mode: "create" })}
            onShowStageInList={showStageInList}
          />
        </>
      ) : (
        <DealList
          deals={deals}
          isLoading={isListLoading}
          error={listError}
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
          pagination={pagination}
          onPageChange={setPage}
          onPageSizeChange={(next) => {
            setPageSize(next);
            setPage(1);
          }}
          onCreateClick={() => setModalState({ mode: "create" })}
          onEditClick={(deal) => setModalState({ mode: "edit", deal })}
          onOpenClick={(deal) => router.push(`/dashboard/deals/${deal.id}`)}
          onDealDeleted={handleDealDeleted}
          onError={(message) => showToast(message, "error")}
        />
      )}

      <Modal isOpen={modalState !== null} onClose={() => setModalState(null)} ariaLabelledBy={DEAL_FORM_TITLE_ID}>
        {modalState && (
          <DealForm
            mode={modalState.mode}
            initialDeal={modalState.deal}
            onSubmit={handleSubmit}
            onCancel={() => setModalState(null)}
          />
        )}
      </Modal>

      {toast && (
        <div
          role="status"
          className={`fixed bottom-6 left-1/2 z-[60] max-w-[90vw] -translate-x-1/2 animate-toast-in rounded-md border px-4 py-2.5 text-sm font-medium shadow-lg ${
            toast.tone === "error"
              ? "border-danger/30 bg-danger-soft text-danger"
              : "border-line bg-surface text-fg"
          }`}
        >
          {toast.message}
        </div>
      )}
    </div>
  );
}

export default function DealsPage() {
  return (
    <Suspense fallback={null}>
      <DealsPageInner />
    </Suspense>
  );
}
