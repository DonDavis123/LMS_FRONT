"use client";

import type { ImportSampleRow } from "@/features/leadImport/types/leadImport.types";

interface SampleRowsTableProps {
  headers: string[];
  rows: ImportSampleRow[];
}

/** First rows of the file. Scrolls sideways; long cells are cut with a title tooltip. */
export default function SampleRowsTable({ headers, rows }: SampleRowsTableProps) {
  return (
    <section className="rounded-lg border border-line bg-surface" aria-labelledby="import-sample-title">
      <div className="border-b border-line px-4 py-3">
        <h3 id="import-sample-title" className="text-sm font-semibold text-fg">
          Sample rows
        </h3>
        <p className="text-xs text-ink-soft">
          The first {rows.length} {rows.length === 1 ? "row" : "rows"} of your file, as we read them.
        </p>
      </div>

      {rows.length === 0 ? (
        <p className="px-4 py-6 text-sm text-ink-soft">There are no rows to show.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-max text-left text-sm">
            <caption className="sr-only">Sample rows from the uploaded file</caption>
            <thead>
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
              {rows.map((row) => (
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
        </div>
      )}
    </section>
  );
}
