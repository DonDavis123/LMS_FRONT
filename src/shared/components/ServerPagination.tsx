"use client";

import type { PaginationMeta } from "@/shared/types/pagination";
import Select from "@/shared/components/Select";

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
    <div className="lp-list-foot flex flex-col gap-3 border-t border-line px-3 py-1.5 text-sm text-ink-soft md:flex-row md:flex-wrap md:items-center md:justify-between md:gap-3 sm:px-4">
      <div className="flex items-center justify-between gap-3 md:contents">
        <span className="font-medium text-fg md:font-normal md:text-inherit">
          {start} to {end} of {total}
        </span>
        <span className="md:hidden">
          Page {safePage} of {safeTotalPages}
        </span>
      </div>

      <div className="flex items-center gap-2 md:flex-wrap md:gap-3">
        <label className="flex min-w-0 flex-1 items-center gap-2 md:flex-none">
          <span className="sr-only">Rows per page</span>
          <div className="w-full md:w-32">
            <Select
              size="sm"
              value={String(pageSize)}
              onChange={(next) => onPageSizeChange(Number(next))}
              ariaLabel="Rows per page"
              options={[10, 20, 50].map((size) => ({ value: String(size), label: `${size} / page` }))}
            />
          </div>
        </label>

        <span className="hidden md:inline">
          Page {safePage} of {safeTotalPages}
        </span>

        <button
          type="button"
          onClick={() => onPageChange(safePage - 1)}
          disabled={safePage <= 1 || total === 0}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-line bg-surface text-lg leading-none transition active:scale-95 disabled:opacity-40 md:h-auto md:w-auto md:rounded md:bg-transparent md:px-2 md:py-1 md:text-sm"
          aria-label="Previous page"
        >
          ‹
        </button>

        <button
          type="button"
          onClick={() => onPageChange(safePage + 1)}
          disabled={safePage >= safeTotalPages || total === 0}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-line bg-surface text-lg leading-none transition active:scale-95 disabled:opacity-40 md:h-auto md:w-auto md:rounded md:bg-transparent md:px-2 md:py-1 md:text-sm"
          aria-label="Next page"
        >
          ›
        </button>
      </div>
    </div>
  );
}
