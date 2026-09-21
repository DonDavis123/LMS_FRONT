"use client";

import type { PaginationMeta } from "@/shared/types/pagination";

interface ServerPaginationProps {
  pagination: PaginationMeta;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}

export default function ServerPagination({
  pagination,
  pageSize,
  onPageChange,
  onPageSizeChange,
}: ServerPaginationProps) {
  const { page, total, total_pages: totalPages } = pagination;
  const safeTotalPages = Math.max(1, totalPages);
  const safePage = Math.min(Math.max(page, 1), safeTotalPages);
  const start = total === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const end = Math.min(safePage * pageSize, total);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-3 text-sm text-ink-soft">
      <span>
        {start} to {end} of {total}
      </span>

      <div className="flex items-center gap-3">
        <label className="flex items-center gap-2">
          <span className="sr-only">Rows per page</span>
          <select
            value={pageSize}
            onChange={(event) => onPageSizeChange(Number(event.target.value))}
            className="rounded border border-line bg-surface px-2 py-1 text-sm text-fg"
          >
            {[10, 20, 50].map((size) => (
              <option key={size} value={size}>
                {size} / page
              </option>
            ))}
          </select>
        </label>

        <span>
          Page {safePage} of {safeTotalPages}
        </span>

        <button
          type="button"
          onClick={() => onPageChange(safePage - 1)}
          disabled={safePage <= 1 || total === 0}
          className="rounded border border-line px-2 py-1 disabled:opacity-40"
          aria-label="Previous page"
        >
          ‹
        </button>

        <button
          type="button"
          onClick={() => onPageChange(safePage + 1)}
          disabled={safePage >= safeTotalPages || total === 0}
          className="rounded border border-line px-2 py-1 disabled:opacity-40"
          aria-label="Next page"
        >
          ›
        </button>
      </div>
    </div>
  );
}
