import type { ImportRowResult } from "@/features/leadImport/types/leadImport.types";
import { ownerSourceLabel } from "@/features/leadImport/utils/labels";
import { duplicateText } from "@/features/leadImport/utils/rowDisplay";

function Heading({ children }: { children: React.ReactNode }) {
  return <h4 className="text-xs font-semibold uppercase tracking-wide text-ink-soft">{children}</h4>;
}

/** Everything known about one row: its problems and how to fix them, warnings, the owner, and the file values. */
export default function RowDetails({ row }: { row: ImportRowResult }) {
  const duplicate = duplicateText(row);
  const values = Object.entries(row.values ?? {});

  return (
    <div className="space-y-3 text-sm">
      {row.problems.length > 0 && (
        <div>
          <Heading>Problems</Heading>
          <ul className="mt-1 space-y-2">
            {row.problems.map((problem, index) => (
              <li key={`${problem.code}-${problem.field}-${index}`} className="rounded-md bg-danger-soft px-3 py-2 text-danger">
                <p className="font-medium">{problem.message}</p>
                {(problem.column || problem.value) && (
                  <p className="mt-0.5 text-xs">
                    {problem.column ? `Column: ${problem.column}. ` : ""}
                    {problem.value ? `Value found: "${problem.value}".` : "The cell is blank."}
                  </p>
                )}
                {problem.how_to_fix && <p className="mt-0.5 text-xs">How to fix: {problem.how_to_fix}</p>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {(duplicate || row.reason) && (
        <div>
          <Heading>What happens to this row</Heading>
          <p className="mt-1 text-fg">
            {duplicate}
            {duplicate && row.reason ? ". " : ""}
            {row.reason}
          </p>
        </div>
      )}

      {row.warnings.length > 0 && (
        <div>
          <Heading>Things to know</Heading>
          <ul className="mt-1 list-disc space-y-0.5 pl-5 text-ink-soft">
            {row.warnings.map((warning, index) => (
              <li key={`${warning.code}-${index}`}>{warning.message}</li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <Heading>Lead owner</Heading>
        <p className="mt-1 text-fg">
          {row.owner ? (
            <>
              {row.owner.name} <span className="text-ink-soft">({ownerSourceLabel(row.owner.source)})</span>
            </>
          ) : (
            <span className="text-ink-soft">No owner for this row</span>
          )}
        </p>
      </div>

      <div>
        <Heading>Values in your file</Heading>
        {values.length === 0 ? (
          <p className="mt-1 text-ink-soft">No values.</p>
        ) : (
          <dl className="mt-1 grid grid-cols-1 gap-x-6 gap-y-1.5 sm:grid-cols-2">
            {values.map(([header, value]) => (
              <div key={header} className="min-w-0">
                <dt className="truncate text-xs text-ink-soft" title={header}>
                  {header.trim() ? header : "(no name)"}
                </dt>
                <dd className="break-words text-fg">{value.trim() ? value : <span className="text-ink-soft">—</span>}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>
    </div>
  );
}
