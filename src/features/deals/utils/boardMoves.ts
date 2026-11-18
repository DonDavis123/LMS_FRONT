import type { BoardCard, BoardColumn, DealStage } from "@/features/deals/types/deal.types";
import { amountToPaise, paiseToAmount } from "@/features/deals/utils/formatCurrency";
import { isClosedStage } from "@/features/deals/utils/dealStages";

/** Weighted value of a card in paise (open stages only; closed columns carry no weighted total). */
function weightedPaise(card: BoardCard, stage: DealStage): number {
  if (isClosedStage(stage)) return 0;
  return Math.round((amountToPaise(card.amount) * card.probability) / 100);
}

function withoutCard(column: BoardColumn, card: BoardCard): BoardColumn {
  return {
    ...column,
    count: Math.max(0, column.count - 1),
    total_amount: paiseToAmount(amountToPaise(column.total_amount) - amountToPaise(card.amount)),
    weighted_amount: paiseToAmount(
      amountToPaise(column.weighted_amount) - weightedPaise(card, column.stage),
    ),
    deals: column.deals.filter((deal) => deal.id !== card.id),
  };
}

function withCard(column: BoardColumn, card: BoardCard): BoardColumn {
  return {
    ...column,
    count: column.count + 1,
    total_amount: paiseToAmount(amountToPaise(column.total_amount) + amountToPaise(card.amount)),
    weighted_amount: paiseToAmount(
      amountToPaise(column.weighted_amount) + weightedPaise(card, column.stage),
    ),
    deals: [card, ...column.deals],
  };
}

export function findCard(
  columns: BoardColumn[],
  dealId: string,
): { card: BoardCard; stage: DealStage } | null {
  for (const column of columns) {
    const card = column.deals.find((deal) => deal.id === dealId);
    if (card) return { card, stage: column.stage };
  }
  return null;
}

/**
 * Optimistic move: lifts the card out of its column and drops it on top of
 * `toStage` with `probability`, adjusting count and totals in exact integer
 * paise. These totals are only a stand-in — the board is re-fetched right
 * after, so the server's own numbers always win.
 */
export function applyBoardMove(
  columns: BoardColumn[],
  dealId: string,
  toStage: DealStage,
  probability: number,
): BoardColumn[] {
  const found = findCard(columns, dealId);
  if (!found || found.stage === toStage) return columns;
  const moved: BoardCard = { ...found.card, probability };
  return columns.map((column) => {
    if (column.stage === found.stage) return withoutCard(column, found.card);
    if (column.stage === toStage) return withCard(column, moved);
    return column;
  });
}
