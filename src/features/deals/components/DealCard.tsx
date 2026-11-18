"use client";

import Link from "next/link";
import { AlertCircle, Building2, CalendarDays, UserRound } from "lucide-react";
import type { BoardCard, DealStage } from "@/features/deals/types/deal.types";
import { formatCloseDate, isOverdue } from "@/features/deals/utils/dealDates";
import { formatCurrency } from "@/features/deals/utils/formatCurrency";
import MoveToMenu from "@/features/deals/components/MoveToMenu";

interface DealCardProps {
  card: BoardCard;
  stage: DealStage;
  isDragging: boolean;
  isPending: boolean;
  onDragStart: (card: BoardCard) => void;
  onDragEnd: () => void;
  onMove: (card: BoardCard, stage: DealStage) => void;
}

/** One deal on the Kanban board. Draggable on desktop; "Move to…" everywhere else. */
export default function DealCard({ card, stage, isDragging, isPending, onDragStart, onDragEnd, onMove }: DealCardProps) {
  const overdue = isOverdue(card.expected_close_date, stage);
  const primary = card.account_name ?? card.contact_name;
  const secondary = card.account_name && card.contact_name ? card.contact_name : null;

  return (
    <li
      draggable={!isPending}
      onDragStart={(event) => {
        event.dataTransfer.setData("text/plain", card.id);
        event.dataTransfer.effectAllowed = "move";
        onDragStart(card);
      }}
      onDragEnd={onDragEnd}
      aria-busy={isPending || undefined}
      className={`group animate-scale-in rounded-xl border border-line bg-surface p-3 shadow-sm transition-[opacity,box-shadow,border-color] hover:border-slate/50 hover:shadow-md ${
        isPending ? "opacity-60" : "cursor-grab active:cursor-grabbing"
      } ${isDragging ? "opacity-40" : ""}`}
    >
      <Link
        href={`/dashboard/deals/${card.id}`}
        draggable={false}
        className="line-clamp-2 text-sm font-semibold text-fg hover:underline focus-visible:underline"
      >
        {card.name}
      </Link>

      <p className="mt-1 font-serif text-lg leading-tight text-fg">{formatCurrency(card.amount)}</p>

      {primary ? (
        <p className="mt-1.5 flex items-center gap-1.5 truncate text-xs text-ink-soft">
          {card.account_name ? (
            <Building2 size={12} aria-hidden="true" className="shrink-0" />
          ) : (
            <UserRound size={12} aria-hidden="true" className="shrink-0" />
          )}
          <span className="truncate">{primary}</span>
          {secondary && <span className="truncate text-ink-soft/80">· {secondary}</span>}
        </p>
      ) : null}

      <div className="mt-2 flex flex-wrap items-center justify-between gap-x-2 gap-y-1.5">
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs">
          <span className={`inline-flex items-center gap-1 ${overdue ? "font-medium text-danger" : "text-ink-soft"}`}>
            <CalendarDays size={12} aria-hidden="true" />
            {formatCloseDate(card.expected_close_date)}
          </span>
          {overdue && (
            <span className="inline-flex items-center gap-1 rounded-full bg-danger-soft px-1.5 py-0.5 text-[11px] font-semibold text-danger">
              <AlertCircle size={11} aria-hidden="true" />
              Overdue
            </span>
          )}
        </div>
        <span
          title="Win probability"
          aria-label={`${card.probability}% probability`}
          className="rounded-full bg-paper px-2 py-0.5 text-[11px] font-semibold text-ink-soft ring-1 ring-inset ring-line"
        >
          {card.probability}%
        </span>
      </div>

      <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-line pt-2">
        <span className="min-w-0 truncate text-[11px] text-ink-soft">{card.owner_name ?? "Unassigned"}</span>
        <MoveToMenu
          currentStage={stage}
          dealName={card.name}
          disabled={isPending}
          onMove={(next) => onMove(card, next)}
        />
      </div>
    </li>
  );
}
