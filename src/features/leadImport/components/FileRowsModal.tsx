"use client";

import { useCallback, useId, useState } from "react";
import { RowsErrorState, RowsSkeleton } from "@/features/leadImport/components/ReviewRowsStates";
import { useFileRows } from "@/features/leadImport/hooks/useFileRows";
import { formatCount } from "@/features/leadImport/utils/format";
import Modal from "@/shared/components/Modal";
import SearchBox from "@/shared/components/SearchBox";
import ServerPagination from "@/shared/components/ServerPagination";

interface FileRowsModalProps {
  jobId: string;
  fileName: string;
  /** Column names as read from the file (same order as the table). */
  headers: string[];
  totalRows: number;
  onClose: () => void;
}

const DEFAULT_PAGE_SIZE = 20;

/**
 * "View full file": every row of the uploaded file, exactly as it was read,
 * one page at a time with search. Available straight after the upload; it
 * changes nothing. Mounted only while open, so it always starts on page 1.
 */
export default function FileRowsModal({ jobId, fileName, headers, totalRows, onClose }: FileRowsModalProps) {
  const titleId = useId();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [search, setSearch] = useState("");

  const rows = useFileRows({ jobId, page, pageSize, q: search });
  const data = rows.data;

  const onSearchChange = useCallback((next: string) => {
    setSearch(next);
    setPage(1);
  }, []);

  const searching = search !== "";
  const shown = data?.pagination.total ?? 0;

  return (
    <Modal isOpen onClose={onClose} ariaLabelledBy={titleId} maxWidthClass="max-w-6xl">
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="space-y-3 border-b border-line px-4 py-4 pr-12 sm:px-5">
          <div className="min-w-0">
            <h2 id={titleId} className="truncate font-serif text-lg text-fg" title={fileName}>
              Full file preview
            </h2>
            <p className="text-xs text-ink-soft">
              All {formatCount(totalRows)} {totalRows === 1 ? "row" : "rows"} of {fileName}, exactly as we read them.
              Nothing is imported from here.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <SearchBox
              value={search}
              onSearchChange={onSearchChange}
              placeholder="Search any cell or row number"
              ariaLabel="Search the uploaded file"
            />
            {searching && data && (
              <p className="text-xs text-ink-soft" role="status">
                {formatCount(shown)} {shown === 1 ? "row matches" : "rows match"} your search
              </p>
            )}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-auto" aria-busy={rows.showSkeleton}>
          {rows.error && !data ? (
            <RowsErrorState error={rows.error} onRetry={rows.reload} />
          ) : !data || rows.showSkeleton ? (
            <RowsSkeleton />
          ) : data.results.length === 0 ? (
            <p className="px-4 py-12 text-center text-sm text-ink-soft">
              {searching ? "No rows match your search. Try different text or a row number." : "This file has no rows to show."}
            </p>
          ) : (
            <table className="w-full min-w-max text-left text-sm">
              <caption className="sr-only">All rows of the uploaded file</caption>
              <thead className="sticky top-0 z-10 bg-surface">
                <tr className="border-b border-line text-xs font-semibold uppercase tracking-wide text-ink-soft">
                  <th scope="col" className="sticky left-0 bg-surface px-3 py-2.5">
                    Row
                  </th>
                  {headers.map((header, index) => (
                    <th key={`${index}-${header}`} scope="col" className="max-w-[12rem] truncate px-3 py-2.5" title={header}>
                      {header || "(no name)"}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.results.map((row) => (
                  <tr key={row.row_number} className="border-b border-line last:border-0">
                    <th
                      scope="row"
                      className="sticky left-0 bg-surface px-3 py-2.5 text-left text-xs font-normal tabular-nums text-ink-soft"
                    >
                      {row.row_number}
                    </th>
                    {headers.map((header, index) => {
                      const value = row.values[header] ?? "";
                      return (
                        <td
                          key={`${index}-${header}`}
                          className="max-w-[14rem] truncate px-3 py-2.5 text-fg"
                          title={value || undefined}
                        >
                          {value || <span className="text-ink-soft">—</span>}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {data && data.results.length > 0 && (
          <ServerPagination
            pagination={data.pagination}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setPage(1);
            }}
          />
        )}
      </div>
    </Modal>
  );
}
