"use client";

import { useEffect } from "react";
import { useMediaQuery } from "@/shared/hooks/useMediaQuery";

/**
 * Phones show list tables as cards (see `app/mobile.css`). A card needs to
 * know, for every cell, which column it belongs to — so this tags each <td>
 * with the text of its column heading (`data-label`) and marks the card's
 * title cell (`data-role="primary"`) and the row-menu cell (`data-role="actions"`).
 *
 * It only touches data attributes: no markup is added, no component state is
 * read, and nothing runs on tablets or laptops. A MutationObserver re-tags the
 * tables whenever rows change (pagination, sorting, filtering, new records).
 */

const ACTION_HEADINGS = new Set(["Selection and actions", "Actions"]);
// Values longer than this get the full card width instead of half.
const WIDE_TEXT_LENGTH = 24;

function headingText(th: HTMLTableCellElement): { text: string; isActions: boolean } {
  const aria = th.getAttribute("aria-label");
  if (aria && ACTION_HEADINGS.has(aria)) return { text: "", isActions: true };
  // Sortable headings hold a button with the label; fall back to plain text.
  const text = (th.querySelector("button span")?.textContent ?? th.textContent ?? "").trim();
  return { text, isActions: false };
}

function tagTable(table: HTMLTableElement) {
  const headRow = table.tHead?.rows[0];
  if (!headRow) return;

  const columns = Array.from(headRow.cells).map((th) => ({
    ...headingText(th),
    isEnd: th.classList.contains("lp-sticky-end"),
  }));

  // The first column that is neither the row menu nor the pinned end column
  // is the card's title (Lead Name, Subject, Title, Name, Company …).
  const primaryIndex = columns.findIndex((c) => !c.isActions && !c.isEnd && c.text !== "");

  for (const body of Array.from(table.tBodies)) {
    for (const row of Array.from(body.rows)) {
      Array.from(row.cells).forEach((td, index) => {
        if (td.colSpan > 1) return;
        const column = columns[index];
        if (!column) return;

        if (column.isActions) {
          td.dataset.role = "actions";
          return;
        }
        if (index === primaryIndex) {
          td.dataset.role = "primary";
          return;
        }
        if (column.isEnd) return;

        if (column.text && td.dataset.label !== column.text) td.dataset.label = column.text;
        const long = (td.textContent ?? "").trim().length > WIDE_TEXT_LENGTH;
        if (long) td.dataset.wide = "";
        else delete td.dataset.wide;
      });
    }
  }
}

function tagAll(root: ParentNode) {
  root.querySelectorAll<HTMLTableElement>(".lp-table-scroll table").forEach(tagTable);
}

export default function MobileTableLabels() {
  const isPhone = useMediaQuery("(max-width: 767px)");

  useEffect(() => {
    if (!isPhone) return;

    let frame = 0;
    const schedule = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        tagAll(document);
      });
    };

    tagAll(document);
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [isPhone]);

  return null;
}
