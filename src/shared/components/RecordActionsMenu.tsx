"use client";

import { MoreVertical } from "lucide-react";
import { createPortal } from "react-dom";
import { useCallback, useEffect, useRef, useState } from "react";

interface RecordActionsMenuProps {
  onEdit: () => void;
  onDelete: () => void;
  onSelect?: () => void;
  onConvert?: () => void;
  recordId?: string;
  deleteLabel?: string;
  disabled?: boolean;
}

export default function RecordActionsMenu({
  onEdit,
  onDelete,
  onSelect,
  onConvert,
  recordId,
  deleteLabel = "Delete",
  disabled = false,
}: RecordActionsMenuProps) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [openedFromContext, setOpenedFromContext] = useState(false);

  const positionFromRect = useCallback((rect: DOMRect) => {
    const menuWidth = 144;
    const menuItems = 2 + (onSelect ? 1 : 0) + (onConvert ? 1 : 0);
    const menuHeight = menuItems * 36 + 8;
    const left = Math.min(Math.max(8, rect.left), window.innerWidth - menuWidth - 8);
    const top = rect.bottom + menuHeight <= window.innerHeight
      ? rect.bottom + 4
      : rect.top - menuHeight - 4;
    setPosition({ top: Math.max(8, top), left });
  }, [onSelect, onConvert]);

  const positionFromPoint = useCallback((x: number, y: number) => {
    const menuWidth = 144;
    const menuItems = 2 + (onSelect ? 1 : 0) + (onConvert ? 1 : 0);
    const menuHeight = menuItems * 36 + 8;
    const left = Math.min(Math.max(8, x), window.innerWidth - menuWidth - 8);
    const top = y + menuHeight <= window.innerHeight ? y + 4 : y - menuHeight - 4;
    setPosition({ top: Math.max(8, top), left });
  }, [onSelect, onConvert]);

  useEffect(() => {
    if (!open) return;

    const close = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!triggerRef.current?.contains(target)) setOpen(false);
    };

    const reposition = () => {
      if (openedFromContext || !triggerRef.current) return;
      positionFromRect(triggerRef.current.getBoundingClientRect());
    };

    reposition();
    document.addEventListener("mousedown", close);
    window.addEventListener("scroll", reposition, true);
    window.addEventListener("resize", reposition);

    return () => {
      document.removeEventListener("mousedown", close);
      window.removeEventListener("scroll", reposition, true);
      window.removeEventListener("resize", reposition);
    };
  }, [open, openedFromContext, positionFromRect]);

  useEffect(() => {
    if (!recordId) return;

    const handleContextMenu = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const row = target?.closest(`[data-record-row="${recordId}"]`);
      if (!row) return;

      event.preventDefault();
      positionFromPoint(event.clientX, event.clientY);
      setOpenedFromContext(true);
      setOpen(true);
    };

    document.addEventListener("contextmenu", handleContextMenu);
    return () => document.removeEventListener("contextmenu", handleContextMenu);
  }, [recordId, positionFromPoint]);

  function toggle() {
    if (disabled) return;
    if (!open && triggerRef.current) {
      positionFromRect(triggerRef.current.getBoundingClientRect());
    }
    setOpenedFromContext(false);
    setOpen((value) => !value);
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label="Record actions"
        aria-expanded={open}
        onClick={toggle}
        className="rounded p-1 text-ink-soft opacity-0 transition hover:bg-line group-hover:opacity-100 focus:opacity-100"
      >
        <MoreVertical size={16} />
      </button>

      {open && typeof document !== "undefined"
        ? createPortal(
            <div
              className="fixed z-[100] w-36 rounded-md border border-line bg-surface py-1 shadow-xl animate-menu-in"
              style={{ top: position.top, left: position.left }}
              onMouseDown={(event) => event.stopPropagation()}
              onContextMenu={(event) => event.preventDefault()}
            >
              {onSelect && (
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    setOpenedFromContext(false);
                    onSelect();
                  }}
                  className="block w-full px-3 py-2 text-left text-sm text-fg hover:bg-paper"
                >
                  Select
                </button>
              )}
              {onConvert && (
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    setOpenedFromContext(false);
                    onConvert();
                  }}
                  className="block w-full px-3 py-2 text-left text-sm text-fg hover:bg-paper"
                >
                  Convert
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  setOpenedFromContext(false);
                  onEdit();
                }}
                className="block w-full px-3 py-2 text-left text-sm text-fg hover:bg-paper"
              >
                Edit
              </button>
              <button
                type="button"
                disabled={disabled}
                onClick={() => {
                  setOpen(false);
                  setOpenedFromContext(false);
                  onDelete();
                }}
                className="block w-full px-3 py-2 text-left text-sm text-danger hover:bg-danger-soft disabled:opacity-50"
              >
                {deleteLabel}
              </button>
            </div>,
            document.body
          )
        : null}
    </>
  );
}
