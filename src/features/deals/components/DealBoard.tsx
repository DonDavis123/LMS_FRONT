"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Handshake, Trophy } from "lucide-react";
import { DealService } from "@/features/deals/services/DealService";
import type { BoardCard, BoardColumn, BoardParams, DealStage } from "@/features/deals/types/deal.types";
import { applyBoardMove, findCard } from "@/features/deals/utils/boardMoves";
import { formatCurrency } from "@/features/deals/utils/formatCurrency";
import { isClosedStage, STAGE_META } from "@/features/deals/utils/dealStages";
import DealCard from "@/features/deals/components/DealCard";
import LostReasonModal from "@/features/deals/components/LostReasonModal";
import { extractApiError } from "@/shared/utils/apiError";
import { CreateButtonLabel, createButtonClass } from "@/shared/components/FormLayout";

export type ToastTone = "success" | "error";

interface DealBoardProps {
  /** Memoised by the page: a new object means "reload with these filters". */
  params: BoardParams;
  /** Bumped by the page after a deal is created, edited or deleted. */
  refreshKey: number;
  hasActiveFilters: boolean;
  onMoved: () => void;
  onToast: (message: string, tone?: ToastTone) => void;
  onCreateClick: () => void;
  onShowStageInList: (stage: DealStage) => void;
}

const EDGE_SCROLL_ZONE = 56;
const EDGE_SCROLL_STEP = 22;
const WON_BURST_MS = 1700;

/** Column highlight while a card is dragged over it. */
const DROP_HIGHLIGHT: Record<DealStage, string> = {
  New: "ring-2 ring-slate bg-slate-light/40",
  "Quotation Sent": "ring-2 ring-amber bg-amber/10",
  Negotiation: "ring-2 ring-ink-soft bg-paper",
  Won: "ring-2 ring-success bg-success-soft",
  Lost: "ring-2 ring-danger bg-danger-soft",
};

function BoardSkeleton() {
  return (
    <div className="flex gap-3 overflow-hidden" aria-busy="true" aria-label="Loading deals board">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="w-[82vw] max-w-xs shrink-0 space-y-3 rounded-xl border border-line bg-paper/60 p-3 sm:w-72 lg:w-auto lg:min-w-[15rem] lg:flex-1">
          <div className="h-5 w-28 animate-shimmer rounded" />
          <div className="h-4 w-20 animate-shimmer rounded" />
          {Array.from({ length: 3 - (i % 2) }).map((__, j) => (
            <div key={j} className="h-24 animate-shimmer rounded-xl" />
          ))}
        </div>
      ))}
    </div>
  );
}

export default function DealBoard({
  params,
  refreshKey,
  hasActiveFilters,
  onMoved,
  onToast,
  onCreateClick,
  onShowStageInList,
}: DealBoardProps) {
  const [columns, setColumns] = useState<BoardColumn[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState<{ id: string; from: DealStage } | null>(null);
  const [overStage, setOverStage] = useState<DealStage | null>(null);
  const [pendingIds, setPendingIds] = useState<ReadonlySet<string>>(new Set());
  const [lostTarget, setLostTarget] = useState<{ id: string; name: string } | null>(null);
  const [wonBurst, setWonBurst] = useState<{ key: number; name: string } | null>(null);

  const scrollerRef = useRef<HTMLDivElement>(null);
  const requestRef = useRef(0);
  const pendingCountRef = useRef(0);
  const wonTimerRef = useRef<number | null>(null);

  const fetchBoard = useCallback(
    async (silent: boolean) => {
      const requestId = ++requestRef.current;
      if (!silent) {
        setIsLoading(true);
        setError(null);
      }
      try {
        const next = await DealService.getBoard(params);
        if (requestId !== requestRef.current) return;
        setColumns(next);
        setError(null);
      } catch (err) {
        if (requestId !== requestRef.current) return;
        if (!silent) setError(extractApiError(err, "Couldn't load the deals board."));
      } finally {
        if (requestId === requestRef.current && !silent) setIsLoading(false);
      }
    },
    [params],
  );

  useEffect(() => {
    void fetchBoard(false);
  }, [fetchBoard, refreshKey]);

  useEffect(
    () => () => {
      if (wonTimerRef.current !== null) window.clearTimeout(wonTimerRef.current);
    },
    [],
  );

  function celebrate(name: string) {
    if (wonTimerRef.current !== null) window.clearTimeout(wonTimerRef.current);
    setWonBurst({ key: Date.now(), name });
    wonTimerRef.current = window.setTimeout(() => setWonBurst(null), WON_BURST_MS);
  }

  function stopCelebrating() {
    if (wonTimerRef.current !== null) window.clearTimeout(wonTimerRef.current);
    setWonBurst(null);
  }

  /** Optimistic move → server call → rollback with a toast on failure. */
  async function performMove(dealId: string, toStage: DealStage, lostReason?: string) {
    if (!columns) return;
    const found = findCard(columns, dealId);
    if (!found || found.stage === toStage) return;

    const target = columns.find((column) => column.stage === toStage);
    const optimisticProbability = target?.default_probability ?? STAGE_META[toStage].defaultProbability;
    const { card, stage: fromStage } = found;

    setColumns((prev) => (prev ? applyBoardMove(prev, dealId, toStage, optimisticProbability) : prev));
    pendingCountRef.current += 1;
    setPendingIds((prev) => new Set(prev).add(dealId));
    if (toStage === "Won") celebrate(card.name);

    try {
      const updated = await DealService.moveDeal(dealId, {
        stage: toStage,
        ...(toStage === "Lost" ? { lost_reason: lostReason } : {}),
      });
      // Keep the server's probability for the card (the stage's default is only a guess).
      setColumns((prev) =>
        prev
          ? prev.map((column) =>
              column.stage === toStage
                ? {
                    ...column,
                    deals: column.deals.map((deal) =>
                      deal.id === dealId ? { ...deal, probability: updated.probability ?? deal.probability } : deal,
                    ),
                  }
                : column,
            )
          : prev,
      );
      onToast(`Moved “${card.name}” to ${STAGE_META[toStage].label}`, "success");
      onMoved();
    } catch (err) {
      setColumns((prev) => (prev ? applyBoardMove(prev, dealId, fromStage, card.probability) : prev));
      if (toStage === "Won") stopCelebrating();
      onToast(extractApiError(err, `Couldn't move “${card.name}”. It was put back.`), "error");
    } finally {
      pendingCountRef.current -= 1;
      setPendingIds((prev) => {
        const next = new Set(prev);
        next.delete(dealId);
        return next;
      });
      // Reconcile totals and order with the server once nothing is in flight.
      if (pendingCountRef.current === 0) void fetchBoard(true);
    }
  }

  /** Common entry point for a drop and for the "Move to…" menu. */
  function requestMove(card: BoardCard, toStage: DealStage) {
    if (!columns) return;
    const found = findCard(columns, card.id);
    if (!found || found.stage === toStage || pendingIds.has(card.id)) return;
    if (toStage === "Lost") {
      setLostTarget({ id: card.id, name: card.name });
      return;
    }
    void performMove(card.id, toStage);
  }

  function handleDragOverScroller(event: React.DragEvent<HTMLDivElement>) {
    const scroller = scrollerRef.current;
    if (!scroller || !dragging) return;
    const rect = scroller.getBoundingClientRect();
    if (event.clientX < rect.left + EDGE_SCROLL_ZONE) scroller.scrollLeft -= EDGE_SCROLL_STEP;
    else if (event.clientX > rect.right - EDGE_SCROLL_ZONE) scroller.scrollLeft += EDGE_SCROLL_STEP;
  }

  if (isLoading && !columns) return <BoardSkeleton />;

  if (error && !columns) {
    return (
      <div role="alert" className="flex flex-wrap items-center gap-3 rounded-xl border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger">
        <span>{error}</span>
        <button
          type="button"
          onClick={() => void fetchBoard(false)}
          className="rounded-md border border-danger/40 px-3 py-1 text-xs font-medium hover:bg-surface"
        >
          Retry
        </button>
      </div>
    );
  }

  const board = columns ?? [];
  const totalDeals = board.reduce((sum, column) => sum + column.count, 0);

  if (!isLoading && totalDeals === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-line bg-surface px-4 py-16 text-center animate-scale-in">
        <Handshake size={26} aria-hidden="true" className="text-slate" />
        <p className="font-serif text-lg text-fg">{hasActiveFilters ? "No deals match these filters" : "No deals yet"}</p>
        <p className="max-w-sm text-sm text-ink-soft">
          {hasActiveFilters
            ? "Try a different search, owner or date range."
            : "Create a deal to start tracking your pipeline from first quote to close."}
        </p>
        {!hasActiveFilters && (
          <button
            type="button"
            onClick={onCreateClick}
            className={`mt-1 ${createButtonClass} !px-4 !py-2`}
          >
            <CreateButtonLabel>Create Deal</CreateButtonLabel>
          </button>
        )}
      </div>
    );
  }

  return (
    <>
      <div
        ref={scrollerRef}
        role="region"
        aria-label="Deals board"
        onDragOver={handleDragOverScroller}
        className={`-mx-1 flex snap-x snap-mandatory items-stretch gap-3 overflow-x-auto px-1 pb-3 sm:snap-none ${
          isLoading ? "opacity-70 transition-opacity" : ""
        }`}
      >
        {board.map((column) => {
          const meta = STAGE_META[column.stage];
          const isOver = overStage === column.stage;
          const isClosed = isClosedStage(column.stage);
          return (
            <section
              key={column.stage}
              aria-label={`${meta.label}: ${column.count} ${column.count === 1 ? "deal" : "deals"}, ${formatCurrency(column.total_amount)}`}
              onDragOver={(event) => {
                if (!dragging || dragging.from === column.stage) return;
                event.preventDefault();
                event.dataTransfer.dropEffect = "move";
                if (overStage !== column.stage) setOverStage(column.stage);
              }}
              onDragLeave={(event) => {
                if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
                setOverStage((current) => (current === column.stage ? null : current));
              }}
              onDrop={(event) => {
                event.preventDefault();
                const id = dragging?.id ?? event.dataTransfer.getData("text/plain");
                setDragging(null);
                setOverStage(null);
                const found = id ? findCard(board, id) : null;
                if (found) requestMove(found.card, column.stage);
              }}
              className={`relative flex w-[82vw] max-w-xs shrink-0 snap-start flex-col rounded-xl border border-t-4 border-line bg-paper/70 p-2.5 transition-[box-shadow,background-color] duration-150 sm:w-72 lg:w-auto lg:min-w-[15rem] lg:flex-1 ${meta.accent} ${
                isOver ? DROP_HIGHLIGHT[column.stage] : ""
              } ${wonBurst && column.stage === "Won" ? "ring-2 ring-success" : ""}`}
            >
              <header className="px-1 pb-2">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="flex min-w-0 items-center gap-2 text-sm font-semibold text-fg">
                    <span aria-hidden="true" className={`h-2 w-2 shrink-0 rounded-full ${meta.dot}`} />
                    <span className="truncate">{meta.label}</span>
                  </h2>
                  <span className="rounded-full bg-surface px-2 py-0.5 text-xs font-semibold text-ink-soft ring-1 ring-inset ring-line">
                    {column.count}
                  </span>
                </div>
                <p className="mt-1 font-serif text-base text-fg">{formatCurrency(column.total_amount)}</p>
                {!isClosed && (
                  <p className="text-[11px] text-ink-soft" title="Weighted = amount × win probability">
                    Weighted {formatCurrency(column.weighted_amount)}
                  </p>
                )}
              </header>

              <ul
                aria-label={`${meta.label} deals`}
                className="flex min-h-[7rem] flex-1 flex-col gap-2 overflow-y-auto pr-0.5 lg:max-h-[calc(100dvh-24rem)] lg:min-h-[12rem]"
              >
                {column.deals.length === 0 ? (
                  <li
                    className={`flex flex-1 items-center justify-center rounded-lg border border-dashed px-3 py-6 text-center text-xs ${
                      isOver ? "border-transparent text-fg" : "border-line text-ink-soft"
                    }`}
                  >
                    {isOver ? "Drop to move here" : "No deals"}
                  </li>
                ) : (
                  column.deals.map((card) => (
                    <DealCard
                      key={card.id}
                      card={card}
                      stage={column.stage}
                      isDragging={dragging?.id === card.id}
                      isPending={pendingIds.has(card.id)}
                      onDragStart={(dragged) => setDragging({ id: dragged.id, from: column.stage })}
                      onDragEnd={() => {
                        setDragging(null);
                        setOverStage(null);
                      }}
                      onMove={requestMove}
                    />
                  ))
                )}
              </ul>

              {column.has_more && (
                <div className="mt-2 flex flex-wrap items-center justify-between gap-1 px-1 text-[11px] text-ink-soft">
                  <span>
                    Showing first {column.deals.length} of {column.count}
                  </span>
                  <button
                    type="button"
                    onClick={() => onShowStageInList(column.stage)}
                    className="font-medium text-slate hover:text-fg hover:underline"
                  >
                    View all in list
                  </button>
                </div>
              )}
            </section>
          );
        })}
      </div>

      {wonBurst && (
        <div
          key={wonBurst.key}
          role="status"
          className="pointer-events-none fixed inset-x-0 top-24 z-[60] flex justify-center px-4"
        >
          <div className="flex items-center gap-3 rounded-full border border-success/40 bg-success-soft px-5 py-3 text-sm font-semibold text-success shadow-lg animate-pop-in">
            <Trophy size={20} aria-hidden="true" />
            <span className="max-w-[60vw] truncate">Deal won — {wonBurst.name}</span>
          </div>
        </div>
      )}

      <LostReasonModal
        isOpen={lostTarget !== null}
        dealName={lostTarget?.name ?? ""}
        onCancel={() => setLostTarget(null)}
        onConfirm={(reason) => {
          const target = lostTarget;
          setLostTarget(null);
          if (target) void performMove(target.id, "Lost", reason);
        }}
      />
    </>
  );
}
