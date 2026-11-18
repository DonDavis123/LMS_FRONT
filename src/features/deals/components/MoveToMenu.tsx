"use client";

import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { ArrowRightLeft, Check } from "lucide-react";
import type { DealStage } from "@/features/deals/types/deal.types";
import { DEAL_STAGES, STAGE_META } from "@/features/deals/utils/dealStages";

interface MoveToMenuProps {
  currentStage: DealStage;
  dealName: string;
  onMove: (stage: DealStage) => void;
  disabled?: boolean;
}

const MENU_WIDTH = 192;

/**
 * "Move to…" menu on a board card. HTML5 drag and drop does not work on
 * touch screens and is not keyboard operable, so this is the fallback for
 * both. The menu is portaled with fixed coordinates so the board's
 * horizontally scrolling container can never clip it.
 */
export default function MoveToMenu({ currentStage, dealName, onMove, disabled = false }: MoveToMenuProps) {
  const menuId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  const close = useCallback((refocus: boolean) => {
    setOpen(false);
    if (refocus) triggerRef.current?.focus();
  }, []);

  function openMenu() {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const menuHeight = DEAL_STAGES.length * 36 + 8;
    const left = Math.min(Math.max(8, rect.right - MENU_WIDTH), window.innerWidth - MENU_WIDTH - 8);
    const top = rect.bottom + menuHeight + 8 <= window.innerHeight ? rect.bottom + 4 : Math.max(8, rect.top - menuHeight - 4);
    setPosition({ top, left });
    setOpen(true);
  }

  useEffect(() => {
    if (!open) return;
    // Focus the current stage (or the first item) so the keyboard lands somewhere sensible.
    const items = menuRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]');
    const current = menuRef.current?.querySelector<HTMLButtonElement>('[aria-current="true"]');
    (current ?? items?.[0])?.focus();

    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    }
    function handleDismiss() {
      setOpen(false);
    }
    document.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("resize", handleDismiss);
    window.addEventListener("scroll", handleDismiss, true);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("resize", handleDismiss);
      window.removeEventListener("scroll", handleDismiss, true);
    };
  }, [open]);

  function handleMenuKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const items = Array.from(menuRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]') ?? []);
    const index = items.indexOf(document.activeElement as HTMLButtonElement);
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      close(true);
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      items[(index + 1) % items.length]?.focus();
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      items[(index - 1 + items.length) % items.length]?.focus();
    } else if (event.key === "Home") {
      event.preventDefault();
      items[0]?.focus();
    } else if (event.key === "End") {
      event.preventDefault();
      items[items.length - 1]?.focus();
    } else if (event.key === "Tab") {
      close(false);
    }
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        draggable={false}
        aria-label={`Move ${dealName} to another stage`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => (open ? close(false) : openMenu())}
        className="inline-flex shrink-0 items-center gap-1 rounded-md border border-line bg-surface px-2 py-1 text-xs font-medium text-ink-soft transition hover:bg-paper hover:text-fg focus-visible:ring-2 focus-visible:ring-slate disabled:opacity-50"
      >
        <ArrowRightLeft size={12} aria-hidden="true" />
        Move to…
      </button>

      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={menuRef}
            id={menuId}
            role="menu"
            aria-label={`Move ${dealName} to`}
            onKeyDown={handleMenuKeyDown}
            style={{ top: position.top, left: position.left, width: MENU_WIDTH }}
            className="fixed z-[200] rounded-lg border border-line bg-surface p-1 shadow-[0_16px_48px_rgba(15,23,42,0.18)] animate-menu-in"
          >
            {DEAL_STAGES.map((stage) => {
              const isCurrent = stage === currentStage;
              return (
                <button
                  key={stage}
                  type="button"
                  role="menuitem"
                  disabled={isCurrent}
                  aria-current={isCurrent ? "true" : undefined}
                  onClick={() => {
                    close(true);
                    onMove(stage);
                  }}
                  className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm text-fg transition hover:bg-paper focus:bg-paper focus:outline-none disabled:cursor-default disabled:opacity-60"
                >
                  <span aria-hidden="true" className={`h-2 w-2 shrink-0 rounded-full ${STAGE_META[stage].dot}`} />
                  <span className="min-w-0 flex-1 truncate">{STAGE_META[stage].label}</span>
                  {isCurrent && <Check size={14} aria-hidden="true" className="shrink-0 text-ink-soft" />}
                </button>
              );
            })}
          </div>,
          document.body,
        )}
    </>
  );
}
