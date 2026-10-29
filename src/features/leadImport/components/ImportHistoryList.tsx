"use client";

import { ArrowLeft, Upload } from "lucide-react";
import Link from "next/link";
import { useCallback, useState } from "react";
import { HistoryResultChips, HistoryStatusChip } from "@/features/leadImport/components/HistoryChips";
import HistoryRowActions from "@/features/leadImport/components/HistoryRowActions";
import ImportToast, { useImportToast } from "@/features/leadImport/components/ImportToast";
import UndoImportDialog from "@/features/leadImport/components/UndoImportDialog";
import { useImportAdminAccess } from "@/features/leadImport/hooks/useImportAdminAccess";
import { useImportHistory } from "@/features/leadImport/hooks/useImportHistory";
import { LeadImportService } from "@/features/leadImport/services/LeadImportService";
import type { HistoryItem } from "@/features/leadImport/types/leadImport.types";
import { saveBlob } from "@/features/leadImport/utils/download";
import { formatCount } from "@/features/leadImport/utils/format";
import { importsSubtitle, undoneLine } from "@/features/leadImport/utils/historyView";
import { getImportError, type ImportErrorInfo } from "@/features/leadImport/utils/importErrors";
import { IMPORT_PATH, LEADS_PATH } from "@/features/leadImport/utils/importRoutes";
import { primaryButton, secondaryButton, tableHead } from "@/features/leadImport/utils/reviewStyles";
import ServerPagination from "@/shared/components/ServerPagination";
import { formatDateTime, formatRelativeTime } from "@/shared/utils/formatDate";

function HistorySkeleton() {
  return (
    <div className="space-y-3 p-4" aria-busy="true" aria-label="Loading import history">
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index} className="h-12 animate-shimmer rounded-md" />
      ))}
    </div>
  );
}

function HistoryEmpty() {
  return (
    <div className="flex flex-col items-center gap-3 px-4 py-16 text-center animate-scale-in">
      <p className="font-serif text-lg text-fg">No imports yet</p>
      <p className="max-w-sm text-sm text-ink-soft">Imports you run will be listed here, with their results and an undo while it is still possible.</p>
      <Link href={IMPORT_PATH} className={`${primaryButton} mt-1`}>
        <Upload size={14} aria-hidden="true" />
        Import leads
      </Link>
    </div>
  );
}

function HistoryError({ error, onRetry }: { error: ImportErrorInfo; onRetry: () => void }) {
  return (
    <div className="p-4">
      <div role="alert" className="rounded-lg border border-danger/30 bg-danger-soft p-4 text-sm text-danger">
        <p className="font-medium">{error.message}</p>
        {error.howToFix && <p className="mt-1">{error.howToFix}</p>}
        <button type="button" onClick={onRetry} className={`${secondaryButton} mt-3 text-fg`}>
          Try again
        </button>
      </div>
    </div>
  );
}

/** Date of the import (finished, or created if it has not finished) with a relative time under it. */
function DateCell({ item }: { item: HistoryItem }) {
  const value = item.finished_at ?? item.created_at;
  return (
    <>
      <span className="whitespace-nowrap text-fg">{formatDateTime(value) || "—"}</span>
      <span className="block text-xs text-ink-soft">{formatRelativeTime(value)}</span>
    </>
  );
}

interface RowProps {
  item: HistoryItem;
  downloadingId: string | null;
  onDownload: (item: HistoryItem) => void;
  onUndo: (item: HistoryItem) => void;
}

function FileCell({ item }: { item: HistoryItem }) {
  return (
    <>
      <span className="block break-words font-medium text-fg">{item.file_name || "(No file name)"}</span>
      {item.created_by_name && <span className="block text-xs text-ink-soft">by {item.created_by_name}</span>}
    </>
  );
}

function StatusCell({ item }: { item: HistoryItem }) {
  const undone = undoneLine(item);
  return (
    <>
      <HistoryStatusChip item={item} />
      {undone && <span className="mt-1 block text-xs text-ink-soft">{undone}</span>}
    </>
  );
}

function HistoryTable({ items, downloadingId, onDownload, onUndo }: Omit<RowProps, "item"> & { items: HistoryItem[] }) {
  return (
    <table className="hidden w-full text-left text-sm md:table">
      <caption className="sr-only">Import history, newest first</caption>
      <thead>
        <tr className={`border-b border-line ${tableHead}`}>
          <th scope="col" className="px-4 py-3">File</th>
          <th scope="col" className="px-4 py-3">Date</th>
          <th scope="col" className="px-4 py-3 text-right">Rows</th>
          <th scope="col" className="px-4 py-3">Result</th>
          <th scope="col" className="px-4 py-3">Status</th>
          <th scope="col" className="px-4 py-3">Actions</th>
        </tr>
      </thead>
      <tbody>
        {items.map((item) => (
          <tr key={item.job_id} className="border-b border-line align-top last:border-0 hover:bg-paper">
            <td className="max-w-[16rem] px-4 py-3"><FileCell item={item} /></td>
            <td className="px-4 py-3"><DateCell item={item} /></td>
            <td className="px-4 py-3 text-right tabular-nums text-fg">{formatCount(item.total_rows)}</td>
            <td className="px-4 py-3"><HistoryResultChips item={item} /></td>
            <td className="px-4 py-3"><StatusCell item={item} /></td>
            <td className="px-4 py-3">
              <HistoryRowActions item={item} downloading={downloadingId === item.job_id} onDownload={onDownload} onUndo={onUndo} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function HistoryCards({ items, downloadingId, onDownload, onUndo }: Omit<RowProps, "item"> & { items: HistoryItem[] }) {
  return (
    <ul className="divide-y divide-line md:hidden" aria-label="Import history, newest first">
      {items.map((item) => (
        <li key={item.job_id} className="space-y-2 px-3 py-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0"><FileCell item={item} /></div>
            <div className="shrink-0 text-right"><StatusCell item={item} /></div>
          </div>
          <p className="text-xs text-ink-soft">
            {formatDateTime(item.finished_at ?? item.created_at) || "—"} ({formatRelativeTime(item.finished_at ?? item.created_at)}) ·{" "}
            {formatCount(item.total_rows)} {item.total_rows === 1 ? "row" : "rows"}
          </p>
          <HistoryResultChips item={item} />
          <HistoryRowActions item={item} downloading={downloadingId === item.job_id} onDownload={onDownload} onUndo={onUndo} />
        </li>
      ))}
    </ul>
  );
}

function HistoryScreen() {
  const history = useImportHistory(10);
  const { items, pagination, loading, error, refresh, retry } = history;
  const { toast, showToast } = useImportToast();
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [undoTarget, setUndoTarget] = useState<{ jobId: string; fileName: string } | null>(null);

  const handleDownload = useCallback(
    async (item: HistoryItem) => {
      if (downloadingId) return;
      setDownloadingId(item.job_id);
      try {
        const file = await LeadImportService.downloadRejected(item.job_id, "xlsx");
        saveBlob(file.blob, file.fileName);
        showToast("Rows to fix downloaded.");
      } catch (caught) {
        const info = getImportError(caught, "We could not prepare this file.");
        showToast(info.howToFix ? `${info.message} ${info.howToFix}` : info.message, "error");
      } finally {
        setDownloadingId(null);
      }
    },
    [downloadingId, showToast],
  );

  const handleUndo = useCallback((item: HistoryItem) => setUndoTarget({ jobId: item.job_id, fileName: item.file_name }), []);
  // Closing always refreshes quietly: an undo that lost its connection may still have finished.
  const handleCloseUndo = useCallback(() => {
    setUndoTarget(null);
    void refresh();
  }, [refresh]);

  const showTable = !loading && !error && items.length > 0;

  return (
    <div className="lp-card lp-list-page">
      <div className="lp-list-head flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-line bg-surface px-3 py-2.5 sm:px-4">
        <div className="min-w-0 flex-1">
          <h1 className="font-serif text-lg leading-tight text-fg">Import history</h1>
          <p className="text-xs text-ink-soft">{importsSubtitle(pagination ? pagination.total : null)}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href={LEADS_PATH} className={`${secondaryButton} whitespace-nowrap`}>
            <ArrowLeft size={14} aria-hidden="true" />
            Back to leads
          </Link>
          <Link href={IMPORT_PATH} className={`${primaryButton} whitespace-nowrap`}>
            <Upload size={14} aria-hidden="true" />
            Import leads
          </Link>
        </div>
      </div>

      {loading ? (
        <HistorySkeleton />
      ) : error ? (
        <HistoryError error={error} onRetry={() => void retry()} />
      ) : items.length === 0 ? (
        <HistoryEmpty />
      ) : (
        <div className="lp-table-scroll">
          <HistoryTable items={items} downloadingId={downloadingId} onDownload={handleDownload} onUndo={handleUndo} />
          <HistoryCards items={items} downloadingId={downloadingId} onDownload={handleDownload} onUndo={handleUndo} />
        </div>
      )}

      {showTable && pagination && (
        <ServerPagination
          pagination={pagination}
          pageSize={history.pageSize}
          onPageChange={history.setPage}
          onPageSizeChange={history.setPageSize}
        />
      )}

      {undoTarget && (
        <UndoImportDialog
          jobId={undoTarget.jobId}
          fileName={undoTarget.fileName}
          isOpen
          onClose={handleCloseUndo}
          onDone={() => void refresh()}
        />
      )}
      <ImportToast toast={toast} />
    </div>
  );
}

/** The history of imports. Only admins see it; others are sent to Leads. */
export default function ImportHistoryList() {
  const access = useImportAdminAccess();
  if (access !== "allowed") {
    return access === "checking" ? <HistorySkeleton /> : null;
  }
  return <HistoryScreen />;
}
