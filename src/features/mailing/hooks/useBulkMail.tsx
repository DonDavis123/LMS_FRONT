"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import type { FilterCondition } from "@/shared/components/FilterBar";
import BulkMailDialog from "@/features/mailing/components/BulkMailDialog";
import { useMailer, type Mailer } from "@/features/mailing/hooks/useMailer";
import {
  MAIL_MAX_FILTER_MATCHES,
  MAIL_MAX_IDS,
  type MailEntity,
  type MailSelection,
} from "@/features/mailing/types/mail.types";

interface UseBulkMailOptions {
  entity: MailEntity;
  /** Rows ticked in the list (can span pages). */
  selectedIds: Set<string>;
  /** Ids of the rows on the current page. */
  pageIds: string[];
  /** The list's own search and filters; "select all matching" is built from them. */
  search: string;
  filters: FilterCondition[];
  /** How many records match the list's search and filters right now. */
  total: number;
}

export interface SelectAllMatchingOffer {
  total: number;
  /** Every row on this page is ticked, so the offer can be shown. */
  pageSelected: boolean;
  /** The selection already means "everything matching". */
  active: boolean;
  onSelectAll: () => void;
}

export interface BulkMail {
  mailer: Mailer;
  /** True while the selection means "every record matching the filters", not just ticked rows. */
  allMatching: boolean;
  /** `undefined` when the offer makes no sense (too many records, or only one page). */
  selectAllMatching: SelectAllMatchingOffer | undefined;
  openBulkMail: () => void;
  composeSingle: Mailer["composeSingle"];
  /** Render this once in the list; it is empty until Send Mail is clicked. */
  dialog: ReactNode;
}

interface Snapshot {
  selection: MailSelection;
}

/**
 * Send Mail for a list screen. Reads the list's own selection, search and
 * filters, so "all N matching" means exactly what the list shows.
 */
export function useBulkMail({
  entity,
  selectedIds,
  pageIds,
  search,
  filters,
  total,
}: UseBulkMailOptions): BulkMail {
  const mailer = useMailer();
  const [allMatching, setAllMatching] = useState(false);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [limitMessage, setLimitMessage] = useState<string | null>(null);

  // Ticking or unticking a row, clearing, or changing the search/filters ends "all matching".
  useEffect(() => {
    setAllMatching(false);
  }, [selectedIds, search, filters]);

  const pageSelected = pageIds.length > 0 && pageIds.every((id) => selectedIds.has(id));

  const selectAllMatching = useMemo<SelectAllMatchingOffer | undefined>(() => {
    if (total <= 0 || total > MAIL_MAX_FILTER_MATCHES) return undefined;
    if (!allMatching && !(pageSelected && total > selectedIds.size)) return undefined;
    return {
      total,
      pageSelected,
      active: allMatching,
      onSelectAll: () => setAllMatching(true),
    };
  }, [total, allMatching, pageSelected, selectedIds.size]);

  const openBulkMail = useCallback(() => {
    if (allMatching) {
      setSnapshot({
        selection: { mode: "filter", search: search.trim() || null, filters, exclude_ids: [] },
      });
      return;
    }
    if (selectedIds.size > MAIL_MAX_IDS) {
      setLimitMessage(
        `You can mail at most ${MAIL_MAX_IDS} selected records at once. Use “Select all matching” or narrow the selection.`,
      );
      return;
    }
    setSnapshot({ selection: { mode: "ids", ids: Array.from(selectedIds) } });
  }, [allMatching, filters, search, selectedIds]);

  const closeDialog = useCallback(() => setSnapshot(null), []);

  const dialog: ReactNode = (
    <>
      {snapshot && (
        <BulkMailDialog entity={entity} selection={snapshot.selection} mailer={mailer} onClose={closeDialog} />
      )}
      {limitMessage && (
        <LimitNotice message={limitMessage} onClose={() => setLimitMessage(null)} />
      )}
    </>
  );

  return {
    mailer,
    allMatching,
    selectAllMatching,
    openBulkMail,
    composeSingle: mailer.composeSingle,
    dialog,
  };
}

function LimitNotice({ message, onClose }: { message: string; onClose: () => void }) {
  return (
    <p
      role="alert"
      className="flex items-start justify-between gap-3 border-b border-line bg-danger-soft px-4 py-3 text-sm text-danger"
    >
      <span>{message}</span>
      <button type="button" onClick={onClose} className="shrink-0 font-medium underline">
        Dismiss
      </button>
    </p>
  );
}
